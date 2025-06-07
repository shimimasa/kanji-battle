/* ----------------------------- 依存モジュール ----------------------------- */
import { gameState, updatePlayerName } from './core/gameState.js';
import { setCanvas, update as updateScreen, render as renderScreen } from './core/screenManager.js';
import { initAssets } from './loaders/assetsLoader.js';
import { loadAllGameData } from './loaders/dataLoader.js';
import {
  initializeFirebaseServices,
  signInAnonymouslyIfNeeded,
  loadAllStageClearStatus,
  getCurrentUser,
  initializeNewPlayerData
} from './services/firebase/firebaseController.js';
import { AudioManager } from './audio/audioManager.js';
import { subscribe, publish } from './core/eventBus.js';
import reviewQueue from './models/reviewQueue.js';
import DataSync from './services/firebase/dataSync.js';
import { FSM } from './core/stateMachine.js';
import { setupFSM } from './init/fsmSetup.js';
/* ----------------------------- DOM / Canvas ----------------------------- */
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
setCanvas(canvas);
// ★ ここで AudioManager を生成して export
export const audio = new AudioManager();

// -- service worker 登録は一旦コメントアウト（sw.js が存在しないため 404 となる） --
// if ('serviceWorker' in navigator){
//   window.addEventListener('load', () =>
//     navigator.serviceWorker
//       .register('/sw.js')
//       .catch(console.error)
//   );
// }

// ────────────────
// モバイルブラウザの自動再生制限対策：
// 最初のユーザー操作のときだけ BGM を始動させる
// ────────────────
document.body.addEventListener(
  'pointerdown',
  () => {
    publish('playBGM', 'title');   // タイトル曲をループ再生（EventBus 経由）
  },
  { once: true }
);

/* ----------------------------- アプリ初期化 ----------------------------- */
let lastTime = performance.now();
function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  // ロジック更新
  updateScreen(dt);
  // 描画
  renderScreen();
  requestAnimationFrame(loop);
}

(async function initGame() {
  console.log('🔧 Init start');
  // 1) 画像 & JSON プリロード
  await initAssets();

  // ▼ FSM の初期化を切り出し
  window.fsm = await setupFSM();

  // 2) Firebase
  if (!initializeFirebaseServices()) return;
  const user = await signInAnonymouslyIfNeeded();
  console.log('UID:', user?.uid);
  await loadAllStageClearStatus();
  // ─────────── プレイヤー名自動入力 ───────────
  // データ未設定時に名前を聞いて gameState にセット、Firestore に書き込む
  if (!gameState.playerName || ['ゲスト', 'ななしのごんべえ', '新規プレイヤー'].includes(gameState.playerName)) {
    const inputName = prompt('プレイヤー名を入力してください（10文字以内）', '');
    if (inputName) {
      const name = inputName.trim().slice(0, 10);
      updatePlayerName(name);
      if (user && user.uid) {
          await initializeNewPlayerData(user.uid, name);
        }
      }
    }
  // 3) BattleScreen 側のセットアップ
   // 🔽 ここでステージ ID を仮にセット
  gameState.currentStageId = 'hokkaido_area1';

  // DataSync 初期化（Firestore → localStorage のマージ監視開始）
  DataSync.initialize();

  // 4) 画面遷移：とりあえずタイトルへ
  publish('changeScreen', 'title');

  console.log('✅ Init done → Start loop');
  requestAnimationFrame(loop);
})();

// ── 追加：イベントBusの購読 ──
// 'playSE' → audio.playSE(name)
// 'playBGM' → audio.playBGM(name, loop = true)
subscribe('playSE', name => audio.playSE(name));
subscribe('playBGM', (name, loop = true) => audio.playBGM(name, loop));

// ── 追加：音量設定／取得をEventBus経由に ──
subscribe('setBGMVolume', v => audio.setBGMVolume(v));
subscribe('setSEVolume', v => audio.setSEVolume(v));
subscribe('getBGMVolume', callback => callback(audio.getBGMVolume()));
subscribe('getSEVolume', callback => callback(audio.getSEVolume()));

// ... アプリ初期化後などの適切な位置で ...
subscribe('addToReview', id => {
  reviewQueue.add(id);
});