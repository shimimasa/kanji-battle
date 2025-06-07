// src/resultWinScreen.js
// ステージクリア後の画面（Victory Screen）

import { publish } from '../core/eventBus.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { gameState } from '../core/gameState.js';

const nextStageButton = {
  x: 300,
  y: 400,
  width: 200,
  height: 50,
  text: '次のステージへ'
};

const resultWinState = {
  canvas: null,
  ctx:    null,
  _clickHandler: null,

  /** 画面表示時の初期化 */
  enter() {
    // クリア画面に入ったらクリアBGMを再生
    publish('playBGM', 'victory');
    
    // キャンバスを取得
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) {
      console.error('キャンバス要素が見つかりません');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // 勝利SEを再生
    publish('playSE', 'victory');
    
    // クリックハンドラ登録
    this.registerHandlers();
  },

  /** 毎フレーム呼び出し（描画） */
  update(dt) {
    if (!this.ctx || !this.canvas) return;
    
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル文字
    ctx.fillStyle = 'yellow';
    ctx.font      = '48px "UDデジタル教科書体", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ステージクリア！', canvas.width / 2, 150);

    ctx.font      = '24px "UDデジタル教科書体", sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('おめでとうございます！', canvas.width / 2, 200);

    // 「次のステージへ」ボタン
    drawButton(
      ctx,
      nextStageButton.x,
      nextStageButton.y,
      nextStageButton.width,
      nextStageButton.height,
      nextStageButton.text
    );

    // 間違えた漢字一覧
    if (gameState.wrongKanjiList.length > 0) {
      ctx.fillStyle = 'white';
      ctx.font      = '20px "UDデジタル教科書体", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('間違えた漢字:', 50, 300);
      gameState.wrongKanjiList.forEach((k, i) => {
        ctx.fillText(
          `${k.text}（意味：${k.meaning}）`,
          70,
          330 + i * 30
        );
      });
    }
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    if (this.canvas) {
      this.unregisterHandlers();
    }
    this.canvas = null;
    this.ctx    = null;
  },

  /** クリックイベント登録 */
  registerHandlers() {
    if (!this.canvas) return;
    
    this._clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
  },

  /** クリックイベント解除 */
  unregisterHandlers() {
    if (!this.canvas || !this._clickHandler) return;
    
    this.canvas.removeEventListener('click', this._clickHandler);
    this._clickHandler = null;
  },

  /** クリック処理 */
  handleClick(e) {
    if (!this.canvas) return;
    
    const { left, top } = this.canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    if (isMouseOverRect(x, y, nextStageButton)) {
      // 決定SEを再生
      publish('playSE', 'decide');
      // ステージ選択画面に戻る
      publish('changeScreen', 'stageSelect');
    }
  }
};

export default resultWinState;

// 追加: FSM 一貫化のため描画エントリポイントを alias
resultWinState.render = function() {
  this.update(0);
};

