// src/gameOverScreen.js
// プレイヤー敗北時の画面（Game Over Screen）

import { publish } from '../core/eventBus.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';

const retryButton = {
  x: 250,
  y: 380,
  width: 150,
  height: 50,
  text: 'リトライ'
};

const backToTitleButton = {
  x: 430,
  y: 380,
  width: 150,
  height: 50,
  text: 'タイトルへ'
};

const gameOverState = {
  canvas: null,
  ctx:    null,
  _clickHandler: null,

  /** 画面表示時の初期化 */
  enter(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // ── BGM をタイトル用に切り替え ──
    publish('playBGM', 'title');

    // 敗北SEを再生
    publish('playSE', 'defeat');
    // イベントハンドラ登録
    this.registerHandlers();
  },

  /** 毎フレーム描画 */
  update(dt) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 「ゲームオーバー」文字
    ctx.fillStyle = 'red';
    ctx.font      = '48px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ゲームオーバー', canvas.width / 2, 150);

    // サブテキスト
    ctx.fillStyle = 'white';
    ctx.font      = '24px "UDデジタル教科書体",sans-serif';
    ctx.fillText('ざんねん！またチャレンジしてね', canvas.width / 2, 200);

    // リトライ／タイトルへボタン描画
    drawButton(ctx, retryButton.x, retryButton.y, retryButton.width, retryButton.height, retryButton.text);
    drawButton(ctx, backToTitleButton.x, backToTitleButton.y, backToTitleButton.width, backToTitleButton.height, backToTitleButton.text);
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    this.unregisterHandlers();
    this.canvas = null;
    this.ctx    = null;
  },

  /** クリックイベントリスナ登録 */
  registerHandlers() {
    this._clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
  },

  /** クリックイベントリスナ解除 */
  unregisterHandlers() {
    this.canvas.removeEventListener('click', this._clickHandler);
  },

  /** クリック処理 */
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (isMouseOverRect(x, y, retryButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'stageSelect');
      return;
    }
    if (isMouseOverRect(x, y, backToTitleButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'title');
      return;
    }
  }
};

export default gameOverState;

// 追加: FSM 一貫化のため描画エントリポイントを alias
gameOverState.render = function() {
  this.update(0);
};
