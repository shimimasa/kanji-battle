import { publish } from '../core/eventBus.js';
import { images } from '../loaders/assetsLoader.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { gameState, updatePlayerName } from '../core/gameState.js';     // ← 追加
import { getCurrentUser, initializeNewPlayerData } from '../services/firebase/firebaseController.js'; // ← 追加

const titleState = {
  /** 画面表示時の初期化 */
  enter(canvas) {
    // canvas が未渡しの場合は DOM から取得
    this.canvas = canvas || document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    const cx    = this.canvas.width / 2;
    this.startButton    = { x: cx - 80, y: 350, width: 160, height: 50, text: 'スタート' };
    this.settingsButton = { x: cx - 80, y: 420, width: 160, height: 50, text: 'せってい' };
    this.registerHandlers();
  },

  /** 毎フレーム呼び出し（描画） */
  update(dt) {
    const cw = this.canvas.width, ch = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, cw, ch);

    // ロゴ描画
    if (images.logo) {
      const { width: iw, height: ih } = images.logo;
      let w = cw * 0.6, h = (cw * 0.6 / iw) * ih;
      if (h > ch * 0.25) { h = ch * 0.25; w = (ch * 0.25 / ih) * iw; }
      const x = (cw - w) / 2, y = ch * 0.2 - h / 2;
      ctx.drawImage(images.logo, x, y, w, h);
    }

    // スタート／設定ボタン背景
    if (images.buttonNormal) {
      ctx.drawImage(images.buttonNormal,
        this.startButton.x,    this.startButton.y,    this.startButton.width,    this.startButton.height
      );
      ctx.drawImage(images.buttonNormal,
        this.settingsButton.x, this.settingsButton.y, this.settingsButton.width, this.settingsButton.height
      );
    }
    // ボタン文字
    drawButton(ctx, this.startButton.x, this.startButton.y, this.startButton.width, this.startButton.height, this.startButton.text);
    drawButton(ctx, this.settingsButton.x, this.settingsButton.y, this.settingsButton.width, this.settingsButton.height, this.settingsButton.text);


    // 著作（画面下部）
    ctx.font = '12px "UDデジタル教科書体",sans-serif';
    ctx.fillText('© あなたの名前 2025', cw / 2, ch - 30);
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    this.unregisterHandlers();
    this.canvas = null;
    this.ctx    = null;
  },

  /** クリックイベント登録 */
  registerHandlers() {
    this._clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
  },

  /** クリックイベント解除 */
  unregisterHandlers() {
    this.canvas.removeEventListener('click', this._clickHandler);
  },

  /** クリック処理 */
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    // スタートボタン
    if (isMouseOverRect(x, y, this.startButton)) {
      publish('playSE', 'decide');
      // プレイヤー名未設定なら入力を促す
      if (!gameState.playerName) {
        const inputName = prompt('プレイヤー名を入力してください（10文字以内）', '');
        if (inputName) {
          const name = inputName.trim().slice(0, 10);
          updatePlayerName(name);
          const user = getCurrentUser();
          if (user?.uid) {
            initializeNewPlayerData(user.uid, name);
          }
        }
      }
      // 直接ステージセレクト（総復習モード）へ
      gameState.currentGrade = 0;
      publish('changeScreen', 'stageSelect');
      return;
    }

    // 設定ボタン
    if (isMouseOverRect(x, y, this.settingsButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'settings');
    }
  },

  render() {
    this.update(0);
  }
};

export default titleState;

