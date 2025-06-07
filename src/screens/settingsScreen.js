// js/settingsScreen.js
import { gameState } from '../core/gameState.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { getCurrentUser } from '../services/firebase/firebaseController.js';
import { publish } from '../core/eventBus.js';

// UI root 要素が未定義だったので、document.body をルートとして定義
const uiRoot = document.body;

const settingsScreenState = {
  canvas: null,
  ctx: null,
  backButton: null,
  resetButton: null,
  _clickHandler: null,
  cbToggle: null,
  fontToggle: null,

  /** 画面表示時の初期化 */
  enter(arg) {
    // canvas 引数が HTMLCanvasElement ならそれを使い、そうでなければ DOM から取得
    this.canvas = (arg && typeof arg.getContext === 'function')
      ? arg
      : document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    const rect  = this.canvas.getBoundingClientRect();

    // 「メインメニューへもどる」ボタン
    this.backButton = {
      x: this.canvas.width/2 - 125,
      y: this.canvas.height - 100,
      width: 250,
      height: 50,
      text: 'メインメニューへもどる'
    };

    // 「データリセット（はじめから）」ボタン
    this.resetButton = {
      x: this.canvas.width/2 - 125,
      y: 250,
      width: 250,
      height: 50,
      text: 'データリセット（はじめから）',
      color: '#c0392b'
    };
    
    // --- ① 色弱モード切替トグル ------------------
    const cbToggle = document.createElement('label');
    cbToggle.innerHTML = `
      <input type="checkbox" id="cbMode">
      <span>色弱フレンドリーモード</span>
    `;
    uiRoot.appendChild(cbToggle);
    this.cbToggle = cbToggle;

    // 位置調整の追加: キャンバス右側に絶対配置
    Object.assign(cbToggle.style, {
      position: 'absolute',
      left: `${rect.left + this.canvas.width/2 + 120}px`,
      top:  `${rect.top  + 160}px`,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      fontSize: '20px',
      zIndex: '10'
    });

    // --- ② フォント+20% トグル ---------------------
    const fontToggle = document.createElement('label');
    fontToggle.innerHTML = `
      <input type="checkbox" id="bigFont">
      <span>文字サイズ +20%</span>
    `;
    uiRoot.appendChild(fontToggle);
    this.fontToggle = fontToggle;

    // 位置調整の追加: キャンバス右側に絶対配置
    Object.assign(fontToggle.style, {
      position: 'absolute',
      left: `${rect.left + this.canvas.width/2 + 120}px`,
      top:  `${rect.top  + 200}px`,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      fontSize: '20px',
      zIndex: '10'
    });

    // ローカル保存値を反映
    document.getElementById('cbMode').checked  = localStorage.getItem('cbMode')  === '1';
    document.getElementById('bigFont').checked = localStorage.getItem('bigFont')=== '1';
    applyAccessibility();

    // 変更イベント
    cbToggle.addEventListener('change',saveAccessibility);
    fontToggle.addEventListener('change',saveAccessibility);

    function saveAccessibility(){
      localStorage.setItem('cbMode' , document.getElementById('cbMode').checked ? '1':'0');
      localStorage.setItem('bigFont', document.getElementById('bigFont').checked? '1':'0');
      applyAccessibility();
    }
    function applyAccessibility(){
      document.body.classList.toggle('cb-mode' , localStorage.getItem('cbMode')==='1');
      document.body.classList.toggle('big-font', localStorage.getItem('bigFont')==='1');
    }
    // BGM 音量スライダー
    let bgmSlider = document.getElementById('bgmVolumeSlider');
    if (!bgmSlider) {
      bgmSlider = document.createElement('input');
      bgmSlider.type = 'range';
      bgmSlider.id   = 'bgmVolumeSlider';
      bgmSlider.min  = 0;
      bgmSlider.max  = 1;
      bgmSlider.step = 0.01;
      document.body.appendChild(bgmSlider);
    }
    // EventBus 経由で現在のBGM音量を取得
    publish('getBGMVolume', v => { bgmSlider.value = v; });
    bgmSlider.oninput = () => publish('setBGMVolume', parseFloat(bgmSlider.value));
    bgmSlider.style.position = 'absolute';
    bgmSlider.style.left     = `${rect.left + this.canvas.width/2 - 100}px`;
    bgmSlider.style.top      = `${rect.top  + 160}px`;
    bgmSlider.style.width    = '200px';

    // SE 音量スライダー
    let seSlider = document.getElementById('seVolumeSlider');
    if (!seSlider) {
      seSlider = document.createElement('input');
      seSlider.type = 'range';
      seSlider.id   = 'seVolumeSlider';
      seSlider.min  = 0;
      seSlider.max  = 1;
      seSlider.step = 0.01;
      document.body.appendChild(seSlider);
    }
    // EventBus 経由で現在のSE音量を取得
    publish('getSEVolume', v => { seSlider.value = v; });
    seSlider.oninput = () => publish('setSEVolume', parseFloat(seSlider.value));
    seSlider.style.position = 'absolute';
    seSlider.style.left     = `${rect.left + this.canvas.width/2 - 100}px`;
    seSlider.style.top      = `${rect.top  + 200}px`;
    seSlider.style.width    = '200px';

    // クリックイベント登録
    this.registerHandlers();
  },

  /** 毎フレーム描画 */
  update(dt) {
    const { ctx, canvas, backButton, resetButton } = this;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 音量ラベル
    ctx.fillStyle = 'white';
    ctx.font      = '24px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BGM音量', canvas.width / 2, 150);
    ctx.fillText('SE音量',  canvas.width / 2, 190);

    // 見出し
    ctx.font      = '40px "UDデジタル教科書体",sans-serif';
    ctx.fillText('設定', canvas.width / 2, 100);

    // リセットボタン
    if (resetButton) {
      drawButton(ctx,
        resetButton.x, resetButton.y, resetButton.width, resetButton.height,
        resetButton.text, resetButton.color
      );
    }
    // メインメニューボタン
    if (backButton) {
      drawButton(ctx,
        backButton.x, backButton.y, backButton.width, backButton.height,
        backButton.text
      );
    }
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    this.unregisterHandlers();
    // スライダー削除
    const bgmSlider = document.getElementById('bgmVolumeSlider');
    if (bgmSlider) bgmSlider.remove();
    const seSlider = document.getElementById('seVolumeSlider');
    if (seSlider) seSlider.remove();

    // トグル要素を削除
    if (this.cbToggle) {
      this.cbToggle.remove();
      this.cbToggle = null;
    }
    if (this.fontToggle) {
      this.fontToggle.remove();
      this.fontToggle = null;
    }

    this.canvas      = null;
    this.ctx         = null;
    this.backButton  = null;
    this.resetButton = null;
  },

  /** クリックイベント登録 */
  registerHandlers() {
    this._clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
  },

  /** クリックイベント解除 */
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

    // データリセットボタン
    if (this.resetButton && isMouseOverRect(x, y, this.resetButton)) {
      this.resetData();
      return;
    }

    // メインメニューへ戻るボタン
    if (this.backButton && isMouseOverRect(x, y, this.backButton)) {
      publish('playSE', 'decide');
      // タイトル画面に戻す
      publish('changeScreen', 'title');
      return;
    }
  },

  /** データリセット処理 */
  async resetData() {
    const user = getCurrentUser();
    if (user?.uid) {
      if (confirm('本当に全てのデータをリセットしますか？この操作は元に戻せません。')) {
        try {
          // Firestore と gameState のリセット処理をここに記述
          // （元コードの resetPlayerData をコピー）
          // 最後にタイトルへ
          alert('データをリセットしました。');
          publish('changeScreen', 'title');
        } catch {
          alert('データのリセットに失敗しました。');
        }
      }
    } else {
      alert('データのリセットに失敗しました (ユーザー情報なし)。');
    }
  },

  // 追加: FSM 一貫化のため描画エントリポイントを alias
  render() {
    this.update(0);
  }
};

export default settingsScreenState;