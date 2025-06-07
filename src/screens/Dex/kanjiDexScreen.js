// src/kanjiDexScreen.js
// 漢字図鑑画面：コレクションされた漢字をスクロール表示

import { publish } from '../../core/eventBus.js';
import { loadDex } from '../../models/kanjiDex.js';
import { getKanjiById, kanjiData } from '../../loaders/dataLoader.js';
import { drawButton, isMouseOverRect } from '../../ui/uiRenderer.js';

const BTN = {
  back: { x: 20, y: 20, w: 100, h: 30, label: 'ステージ選択へ' }
};

const kanjiDexScreen = {
  canvas: null,
  ctx:    null,
  dexSet: null,     // 収集済み漢字IDのSet<string>
  allList: [],      // 全漢字IDの配列
  scroll: 0,        // 表示開始インデックス
  _clickHandler: null,
  _keyHandler:   null,

  /** enter：画面表示時の初期化 */
  enter(arg) {
    // canvas 引数が HTMLCanvasElement ならそれを使い、そうでなければ DOM から取得
    this.canvas = (arg && typeof arg.getContext === 'function')
      ? arg
      : document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    // localStorageから収集済みデータを取得し、全漢字IDリストを生成
    this.dexSet = loadDex();
    this.allList = kanjiData.map(k => k.id);
    this.scroll  = 0;
    // イベント登録
    this._clickHandler = e => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      // 戻るボタン
      if (isMouseOverRect(x, y, BTN.back)) {
        publish('playSE','decide');
        publish('changeScreen','stageSelect');
        return;
      }
    };
    this.canvas.addEventListener('click', this._clickHandler);
    this._keyHandler = e => {
      if (e.key === 'ArrowUp') {
        this.scroll = Math.max(0, this.scroll - 1);
      } else if (e.key === 'ArrowDown') {
        this.scroll = Math.min(this.allList.length - 1, this.scroll + 1);
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  /** update：毎フレーム描画 */
  update(dt) {
    const { ctx, canvas } = this;
    // 背景
    ctx.fillStyle = '#1e3c72';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 戻るボタン描画
    drawButton(ctx, BTN.back.x, BTN.back.y, BTN.back.w, BTN.back.h, BTN.back.label);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font      = '24px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('漢字図鑑', canvas.width/2, 70);

    // 右上に収集数/総数カウンタ
    ctx.font = '18px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.dexSet.size}/${this.allList.length}`, canvas.width - 20, 40);

    // 漢字リスト描画
    const startY = 100;
    const lineH  = 40;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font         = '32px serif';
    for (let i = 0; i < 10; i++) {
      const idx = this.scroll + i;
      if (idx >= this.allList.length) break;
      const id = this.allList[idx];
      const data = getKanjiById(id);
      const y = startY + i * lineH;
      const collected = this.dexSet.has(id);
      if (collected) {
        // 収集済み：文字、読み、画数、意味を表示
        ctx.fillStyle = 'white';
        // 漢字
        ctx.font = '32px serif';
        ctx.fillText(data.kanji, 50, y);
        // 読みと画数・意味
        ctx.font = '14px "UDデジタル教科書体",sans-serif';
        const readings = [data.onyomi ? `音:${data.onyomi}` : null,
                          data.kunyomi ? `訓:${data.kunyomi}` : null]
                          .filter(Boolean).join(' ');
        ctx.fillText(readings, 100, y);
        ctx.fillText(`${data.strokes}画`, 100 + ctx.measureText(readings).width + 20, y);
        ctx.fillText(data.meaning, 300, y);
      } else {
        // 未収集
        ctx.fillStyle = 'gray';
        ctx.font = '32px serif';
        ctx.fillText('？？？', 50, y);
      }
    }
  },

  /** exit：画面離脱時のクリーンアップ */
  exit() {
    // イベント解除
    if (this.canvas && this._clickHandler) {
      this.canvas.removeEventListener('click', this._clickHandler);
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    this.canvas = this.ctx = null;
  }
};

export default kanjiDexScreen;

// 追加: FSM 一貫化のため描画エントリポイントを alias
kanjiDexScreen.render = function() {
  this.update(0);
};
