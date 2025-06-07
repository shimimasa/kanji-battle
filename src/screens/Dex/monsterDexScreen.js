// src/monsterDexScreen.js
// モンスターデックス画面用ステートオブジェクト

import { loadDex } from '../../models/monsterDex.js';
// 必要に応じてモンスターデータ取得ヘルパーをインポート
import { getMonsterById, getAllMonsterIds } from '../../loaders/dataLoader.js';
import { drawButton, isMouseOverRect } from '../../ui/uiRenderer.js';
import { publish } from '../../core/eventBus.js';

// 追加：学年別フォルダマッピング
const gradeFolderMap = {
  1: 'grade1-hokkaido',
  2: 'grade2-touhoku',
  3: 'grade3-kantou',
  4: 'grade4-chuubu',
  5: 'grade5-kiniki',
  6: 'grade6-chuugoku',
};

const monsterDexState = {
  canvas: null,
  ctx:    null,
  dexSet: null,    // 収集済みモンスターIDの Set<number>
  allList: [],     // 全モンスターIDの配列
  scroll:  0,      // スクロール位置
  _clickHandler: null,
  _keyHandler:   null,

  /** enter：画面表示時の初期化 */
  enter(arg) {
    // canvas 引数が HTMLCanvasElement ならそれを使い、そうでなければ DOM から取得
    this.canvas = (arg && typeof arg.getContext === 'function')
      ? arg
      : document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.dexSet = loadDex();
    this.allList = getAllMonsterIds();
    this.scroll = 0;

    // カードUI に切り替え
    this.canvas.style.display = 'none';
    const container = document.getElementById('monsterContainer');
    container.style.display  = 'grid';
    container.innerHTML       = '';

    // 【追加】メニューに戻るボタン
    const backBtn = document.createElement('button');
    backBtn.textContent = 'メニューに戻る';
    backBtn.classList.add('back-button');
    backBtn.addEventListener('click', () => {
      publish('playSE', 'cancel');
      publish('changeScreen', 'stageSelect');
    });
    container.appendChild(backBtn);

    this.allList.forEach(id => {
      const m = getMonsterById(id);
      if (!m) return;
      // collected フラグを渡す
      m.collected = this.dexSet.has(id);
      const card = createCard(m);
      container.appendChild(card);
      observer.observe(card);
    });

    // 戻るボタンなどのクリック登録
    this._clickHandler = e => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      // 例: ステージ選択へ戻る
      if (isMouseOverRect(x, y, { x:20,y:20,w:120,h:30 })) {
        publish('playSE','decide');
        publish('changeScreen','stageSelect');
      }
    };
    this.canvas.addEventListener('click', this._clickHandler);

    // キー操作（上／下でスクロール）
    this._keyHandler = e => {
      if (e.key === 'ArrowUp') this.scroll = Math.max(0, this.scroll - 1);
      else if (e.key === 'ArrowDown') this.scroll = Math.min(this.allList.length - 1, this.scroll + 1);
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  /** update：毎フレーム描画更新 */
  update(dt) {
    const { ctx, canvas } = this;
    // 背景
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font      = '24px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('モンスターデックス', canvas.width/2, 60);

    // TODO: 収集済み／未収集を分けてリスト描画
    // 例：10行ずつスクロール表示
    const startY = 100, lineH = 40;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font         = '32px serif';
    for (let i = 0; i < 10; i++) {
      const idx = this.scroll + i;
      if (idx >= this.allList.length) break;
      const id = this.allList[idx];
      // const data = getMonsterById(id);
      const collected = this.dexSet.has(id);
      ctx.fillStyle = collected ? 'white' : 'gray';
      // ctx.fillText(collected ? data.name : '？？？', 50, startY + i * lineH);
      ctx.fillText(collected ? `モンスター${id}` : '？？？', 50, startY + i * lineH);
    }
  },

  /** exit：画面離脱時のクリーンアップ */
  exit() {
    // カードUI を隠してクリア
    const container = document.getElementById('monsterContainer');
    if (container) {
      container.style.display = 'none';
      container.innerHTML     = '';
    }
    // canvas を再表示＆イベント解除
    if (this.canvas) {
      this.canvas.style.display = '';
      this.canvas.removeEventListener('click', this._clickHandler);
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    this.canvas = this.ctx = null;
  },

  // 追加: FSM 一貫化のため描画エントリポイントを alias
  render() {
    this.update(0);
  }
};

export default monsterDexState;

// src/screens/monsterDexScreen.js

/**
 * monster オブジェクト（{ thumb, image, name, ... }）から
 * カード要素を返す関数を定義します。
 */
// ─ IntersectionObserver を用いたサムネイル遅延読み込み ─
const observer = new IntersectionObserver((entries) => {
  // 画面内に入ったカードから上→下の順にソートしてサムネイルを読み込む
  const intersecting = entries.filter(entry => entry.isIntersecting);
  intersecting
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    .forEach(entry => {
      const img = entry.target.querySelector('img');
      img.src = img.dataset.thumb;
      observer.unobserve(entry.target);
    });
}, { rootMargin: '100px' });

function createCard(monster) {
    const card = document.createElement('div');
    card.classList.add('monster-card');
  
    // 未討伐（monster.collected === false）の場合はシルエット化
    if (!monster.collected) {
      card.classList.add('locked');
    }
  
    const img = document.createElement('img');
    // 変更：学年別フォルダをパスに含める
    const folder = gradeFolderMap[monster.grade] || gradeFolderMap[1];
    const thumbPath = `/src/assets/images/monsters/thumb/${folder}/${monster.id}.webp`;
    const fullPath  = `/src/assets/images/monsters/full/${folder}/${monster.id}.webp`;
    img.dataset.thumb = thumbPath;
    img.dataset.full  = fullPath;
    img.alt           = monster.name;
    card.appendChild(img);

    // モンスター名を表示
    const nameEl = document.createElement('p');
    nameEl.textContent = monster.collected ? monster.name : '？？？';
    nameEl.classList.add('monster-name');
    card.appendChild(nameEl);
  
    // クリックでフルサイズに切り替え
    img.addEventListener('click', () => {
      img.src = img.src === img.dataset.thumb
        ? img.dataset.full
        : img.dataset.thumb;
    });
  
    // …他のテキスト要素などを追加
    return card;
}
  
// 下方で monsterList.forEach(monster => container.appendChild(createCard(monster)));
  
const container = document.getElementById('monsterContainer');
monsterDexState.allList.forEach(id => {
  const m = getMonsterById(id);
  if (m) {
    const card = createCard(m);
    container.appendChild(card);
    observer.observe(card);
  }
});
  