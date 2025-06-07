// js/stageSelectScreen.js
import { gameState, resetStageProgress } from '../core/gameState.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { publish } from '../core/eventBus.js';
import { images } from '../loaders/assetsLoader.js';
import ReviewQueue from '../models/reviewQueue.js';
import { stageData } from '../loaders/dataLoader.js';
// 追加：UI トグルを body に挿入するためのルート要素
const uiRoot = document.body;

const backButton    = { x: 10,  y: 520, width: 120, height: 40, text: 'もどる' };
// マーカー半径
const MARKER_SIZE = 32;
// 追加：マーカー位置（仮値）
const marker = { x: 370, y: 250, size: MARKER_SIZE };

const reviewButton  = { x: 150, y: 520, width: 200, height: 40, text: '＜復習する＞' };
const dexButton     = { x: 370, y: 520, width: 200, height: 40, text: '漢字図鑑' };
const monsterButton = { x: 590, y: 520, width: 200, height: 40, text: 'モンスター図鑑' };

// 追加：学年タブ定義（1～6年＋総復習）
const tabs = [
  { label: '1年',   grade: 1 },
  { label: '2年',   grade: 2 },
  { label: '3年',   grade: 3 },
  { label: '4年',   grade: 4 },
  { label: '5年',   grade: 5 },
  { label: '6年',   grade: 6 },
  { label: '総復習', grade: 0 },
];

const stageSelectScreenState = {
  /** 画面表示時の初期化 */
  enter(arg) {
    // BGM 再生 & canvas 取得
    publish('playBGM', 'title');
    this.canvas = (arg && typeof arg.getContext === 'function')
      ? arg
      : document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 未設定時は総復習(0)に
    if (gameState.currentGrade == null) {
      gameState.currentGrade = 0;
    }

    // ステージデータ初期化（現在の学年に応じたフィルタリング）
    this.updateStageList();

    // イベント登録
    this._clickHandler = this.handleClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);

    // ── 追加：復習ボタンの有効/無効とクリックイベント登録 ──
    const btnReview = document.getElementById('btnReview');
    if (btnReview) {
      btnReview.disabled = ReviewQueue.size() === 0;
      btnReview.onclick  = () => publish('changeScreen', 'reviewStage');
    }

    // --- ① 色弱モード切替トグル ------------------
    const cbToggle = document.createElement('label');
    cbToggle.innerHTML = `
      <input type="checkbox" id="cbMode">
      <span>色弱フレンドリーモード</span>
    `;
    uiRoot.appendChild(cbToggle);
    // 追加: 後で削除できるようにプロパティとして保持
    this.cbToggle = cbToggle;

    // --- ② フォント+20% トグル ---------------------
    const fontToggle = document.createElement('label');
    fontToggle.innerHTML = `
      <input type="checkbox" id="bigFont">
      <span>文字サイズ +20%</span>
    `;
    uiRoot.appendChild(fontToggle);
    // 追加: 後で削除できるようにプロパティとして保持
    this.fontToggle = fontToggle;
  },

  /** ステージリストを更新する（学年切り替え時に呼ばれる） */
  updateStageList() {
    // 総復習(0)なら全ステージ、それ以外は該当学年のものだけ
    this.stages = (gameState.currentGrade === 0)
      ? stageData
      : stageData.filter(s => s.grade === gameState.currentGrade);
  },

  /** 毎フレーム描画・更新 */
  update(dt) {
    const { ctx, canvas, stages } = this;
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // 背景画像をフルスクリーンで描画
    // grade=0→'stageSelect0'、1～6→'stageSelect1'～'stageSelect6'
    const grade = gameState.currentGrade ?? 0;
    const key   = grade === 0 ? 'stageSelect0' : `stageSelect${grade}`;
    const bgImg = images[key] || images.stageSelect0;
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, cw, ch);
    }

    // 追加：学年タブ描画
    const tabCount = tabs.length;
    const tabW = cw / tabCount;
    const tabH = 50;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = '16px sans-serif';
    tabs.forEach((tab, i) => {
      const x0 = i * tabW;
      ctx.fillStyle = (tab.grade === gameState.currentGrade) ? '#ddd' : '#ccc';
      ctx.fillRect(x0, 0, tabW, tabH);
      ctx.fillStyle = '#000';
      ctx.fillText(tab.label, x0 + tabW / 2, tabH / 2);
    });

    // 各ステージのマーカーを動的に描画
    if (gameState.currentGrade !== 0) {
      // 指定された学年のステージマーカーのみを表示
      stages.forEach(stage => {
        const { x, y } = stage.pos;
        if (images.markerPref) {
          ctx.drawImage(images.markerPref, x, y, MARKER_SIZE, MARKER_SIZE);
        } else {
          ctx.fillStyle = '#f00';
          ctx.fillRect(x, y, MARKER_SIZE, MARKER_SIZE);
        }
      });
    }

    // ── ボタン描画など既存処理 ──
    drawButton(ctx, backButton.x, backButton.y, backButton.width, backButton.height, backButton.text);
    drawButton(ctx, reviewButton.x, reviewButton.y, reviewButton.width, reviewButton.height, reviewButton.text);
    drawButton(ctx, dexButton.x, dexButton.y, dexButton.width, dexButton.height, dexButton.text);
    drawButton(ctx, monsterButton.x, monsterButton.y, monsterButton.width, monsterButton.height, monsterButton.text);
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    this.unregisterHandlers();
    // スライダー削除
    const bgmSlider = document.getElementById('bgmVolumeSlider');
    if (bgmSlider) bgmSlider.remove();
    const seSlider = document.getElementById('seVolumeSlider');
    if (seSlider) seSlider.remove();

    // 追加: トグル要素を削除
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
    this.canvas.removeEventListener('click', this._clickHandler);
  },

  /** クリック処理 */
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 追加：タブクリック判定
    const tabCount = tabs.length;
    const tabW = this.canvas.width / tabCount;
    const tabH = 50;
    if (y >= 0 && y <= tabH) {
      const idx = Math.floor(x / tabW);
      const tab = tabs[idx];
      if (tab) {
        gameState.currentGrade = tab.grade;
        this.updateStageList();
        publish('playSE', 'decide');
      }
      return;
    }

    // 「もどる」ボタン
    if (isMouseOverRect(x, y, backButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'title');
      return;
    }

    // 復習するボタン押下時 → レビュー画面へ遷移
    if (isMouseOverRect(x, y, reviewButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'reviewStage');
      return;
    }

    // 漢字図鑑ボタン
    if (isMouseOverRect(x, y, dexButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'kanjiDex');
      return;
    }

    // モンスターデックスボタン
    if (isMouseOverRect(x, y, monsterButton)) {
      publish('playSE', 'decide');
      publish('changeScreen', 'monsterDex');
      return;
    }

    // 各ステージマーカーのクリック判定（1-6年生のタブ選択時のみ）
    if (gameState.currentGrade !== 0) {
      for (const stage of this.stages) {
        const { x: sx, y: sy } = stage.pos;
        if (x >= sx && x <= sx + MARKER_SIZE && y >= sy && y <= sy + MARKER_SIZE) {
          gameState.currentStageId = stage.stageId;
          resetStageProgress(stage.stageId);
          publish('playSE', 'decide');
          // battleFactory で登録したステート名（stageId）へ遷移
          publish('changeScreen', stage.stageId);
          return;
        }
      }
    }
  }
};

export default stageSelectScreenState;

// 追加: FSM 一貫化のため描画エントリポイントを alias
stageSelectScreenState.render = function() {
  this.update(0);
};

