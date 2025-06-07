// js/menuScreen.js
import { gameState } from '../core/gameState.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';

import { publish } from '../core/eventBus.js';
import { images } from '../loaders/assetsLoader.js';

const menuItems = [
  { text: "ゲームスタート", screen: "stageSelect", x: 150, y: 200 },
  { text: "せってい", screen: "settings", x: 150, y: 280 }
];

const buttonWidth = 200;
const buttonHeight = 60;

export function renderMenuScreen(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 各ボタンを描画
  for (const item of menuItems) {
    // 背景画像
    if (images.buttonNormal) {
      ctx.drawImage(images.buttonNormal, item.x, item.y, buttonWidth, buttonHeight);
    }

    // テキスト
    ctx.fillStyle = "white";
    ctx.font = "20px 'UDデジタル教科書体', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.text, item.x + buttonWidth / 2, item.y + 38);
  }
}

export function handleMenuClick(x, y,event) {
  for (const item of menuItems) {
    if (
      x >= item.x &&
      x <= item.x + buttonWidth &&
      y >= item.y &&
      y <= item.y + buttonHeight
    ) {
      publish('changeScreen', item.screen);
      break;
    }
  }
}

const menuScreenState = {
  canvas: null,
  ctx:    null,
  startButton:    null,
  settingsButton: null,
  _clickHandler:  null,

  /** 画面表示時の初期化 */
  enter(arg) {
    // canvas が渡されなければ DOM から取得
    this.canvas = (arg && typeof arg.getContext === 'function')
      ? arg
      : document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // ボタン設定
    const cx = this.canvas.width / 2;
    this.startButton    = { x: cx - 150, y: 250, width: 300, height: 60, text: '冒険を始める' };
    this.settingsButton = { x: cx - 100, y: 330, width: 200, height: 50, text: '設定' };

    // クリックイベント登録
    this.registerHandlers();
  },

  /** 毎フレームの描画更新 */
  update(dt) {
    const { ctx, canvas, startButton, settingsButton } = this;

    // 背景
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.font      = '40px "UDデジタル教科書体", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('メインメニュー', canvas.width / 2, 100);

    // プレイヤー名
    if (gameState.playerName) {
      ctx.font = '20px "UDデジタル教科書体", sans-serif';
      ctx.fillText(`ようこそ、${gameState.playerName} さん`, canvas.width / 2, 150);
    }

    // ボタン背景画像
    if (images.buttonNormal) {
      ctx.drawImage(images.buttonNormal, startButton.x, startButton.y, startButton.width, startButton.height);
      ctx.drawImage(images.buttonNormal, settingsButton.x, settingsButton.y, settingsButton.width, settingsButton.height);
    }

    // ボタン文字
    drawButton(ctx, startButton.x, startButton.y, startButton.width, startButton.height, startButton.text, '#2ecc71', 'white');
    drawButton(ctx, settingsButton.x, settingsButton.y, settingsButton.width, settingsButton.height, settingsButton.text, '#3498db', 'white');
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
    if (this.canvas && this._clickHandler) {
      this.canvas.removeEventListener('click', this._clickHandler);
    }
  },

  /** クリック処理 */
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 「冒険を始める」ボタン押下時
    if (isMouseOverRect(x, y, this.startButton)) {
      gameState.currentGrade = 0;
      publish('changeScreen', 'stageSelect');
      return;
    }
    // 「設定」ボタン押下時
    if (isMouseOverRect(x, y, this.settingsButton)) {
      publish('changeScreen', 'settings');
      return;
    }
  }
};

export default menuScreenState;