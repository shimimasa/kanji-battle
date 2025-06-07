// src/states/battleStateFactory.js
import { getEnemiesByStageId, getKanjiByStageId } from '../loaders/dataLoader.js';
import battleScreenState from '../screens/battleScreen.js';
import { publish } from '../core/eventBus.js';
import { gameState, resetStageProgress } from '../core/gameState.js';

export default function createBattleState(stageId){
  let enemies, kanjiPool;

  return {
    enter() {
      // ステージ毎のデータをセット
      enemies    = getEnemiesByStageId(stageId);
      kanjiPool  = getKanjiByStageId(stageId);
      gameState.currentStageId = stageId;
      resetStageProgress(stageId);
      // BattleScreenState に制御を委譲
      const canvas = document.getElementById('gameCanvas');
      battleScreenState.enter(canvas, () => {
        // ステージクリア後の処理
        // クリアしたらローカル保存
        localStorage.setItem(`clear_${stageId}`, '1');
        // 結果画面に遷移
        publish('changeScreen', 'resultWin');
      });
    },
    update(dt) {
      battleScreenState.update(dt);
    },
    exit() {
      battleScreenState.exit();
    }
  };
}
