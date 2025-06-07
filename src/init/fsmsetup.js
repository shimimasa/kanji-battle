// src/init/fsmSetup.js
import { FSM } from '../core/stateMachine.js';
import battleFactory       from '../states/battleStateFactory.js';
import gradeSelectState    from '../states/gradeSelectState.js';
import regionSelectState   from '../states/regionSelectState.js';
import prefSelectState     from '../states/prefSelectState.js';
import stageSelectState    from '../screens/stageSelectScreen.js';
import titleState          from '../screens/titleScreen.js';
import menuScreenState     from '../screens/menuScreen.js';
import { loadAllGameData } from '../loaders/dataLoader.js';
import { subscribe }       from '../core/eventBus.js';
import settingsState       from '../screens/settingsScreen.js';
import reviewStage         from '../screens/reviewStage.js';
import kanjiDexScreen      from '../screens/Dex/kanjiDexScreen.js';
import monsterDexState     from '../screens/Dex/monsterDexScreen.js';
import resultWinState      from '../screens/resultWinScreen.js';

export async function setupFSM() {
  const { stageData } = await loadAllGameData();

  // 各画面／ステートを登録
  const states = {
    title:        titleState,
    menu:         menuScreenState,
    gradeSelect:  gradeSelectState,
    regionSelect: regionSelectState,
    prefSelect:   prefSelectState,
    stageSelect:  stageSelectState,
    settings:     settingsState,
    reviewStage:  reviewStage,
    kanjiDex:     kanjiDexScreen,
    monsterDex:   monsterDexState,
    resultWin:    resultWinState
  };
  // ステージごとのバトルステートを一括登録
  stageData.forEach(s => {
    states[s.stageId] = battleFactory(s.stageId);
  });

  // FSM 初期化（開始画面はタイトル）
  const fsm = new FSM('title', states);

  // changeScreen イベントに応じて FSM を切り替えるラッパー
  function switchScreen(name, props) {
    fsm.change(name, props);
  }
  subscribe('changeScreen', switchScreen);

  // デバッグ用にグローバル公開
  window.switchScreen = switchScreen;

  return fsm;
}
