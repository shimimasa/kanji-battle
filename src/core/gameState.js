// src/gameState.js
//
// すべての一時データを 1 か所に集約し、他モジュールは「読む／書く」だけ。
// これ以上の入れ子は作らず、必要に応じてプロパティを追加していく方針。
export const battleState = {
  turn: 'player', // 'player' または 'enemy'
  inputEnabled: true,
  message: '',
  comboCount: 0
};


export const gameState = {
    /* 画面遷移 ------------------------------------------------------------- */
            // 'title' | 'menu' | 'battle' | 'stageClear' ...
    currentStageId: null,
  
    /* プレイヤー ----------------------------------------------------------- */
    playerName: '',
    playerStats: {
      hp: 100, maxHp: 100,
      level: 1, exp: 0,
      attack: 10,
      healCount: 3,
      nextLevelExp: 100,
    },
  
    /* バトル --------------------------------------------------------------- */
    enemies: [],                   // ステージ開始時にセット
    currentEnemyIndex: 0,
    currentEnemy: null,            // enemies[currentEnemyIndex]
  
    kanjiPool: [],                 // ステージ開始時にセット
    currentKanji: { text: '', readings: [], meaning: '' },
    showHint: false,
    correctKanjiList: [],   // 正解した漢字をためる
    wrongKanjiList: []      // 間違えた漢字をためる
};
  
  export function updatePlayerStats(changes) {
    Object.assign(gameState.playerStats, changes);
  }
  
  export function setCurrentEnemy(enemy) {
    gameState.currentEnemy = enemy;
  }
  
  export function addPlayerExp(exp) {
    gameState.playerStats.exp += exp;
    // レベルアップ判定を行う
    checkLevelUp();
  }

  function checkLevelUp() {
    const stats = gameState.playerStats;
    // 必要経験値を満たしていればレベルアップ
    if (stats.exp >= stats.nextLevelExp) {
      // 経験値を消費
      stats.exp -= stats.nextLevelExp;
      // レベルを上げる
      stats.level++;
      // 最大HPを5ずつ上昇
      stats.maxHp += 5;
      // 現在HPも最大まで回復
      stats.hp = stats.maxHp;
      // 次のレベルアップに必要な経験値は15ずつ増加
      stats.nextLevelExp += 15;
      return true;
    }
    return false;
  }

  /* ---- 🔧 ラッパ関数（必要最低限だけ用意） ----------------------------- */
  
  export function updatePlayerName(newName) {
    gameState.playerName = newName.trim();
  }
  
  export function resetStageProgress(stageId) {
    gameState.currentStageId     = stageId;
    gameState.currentEnemyIndex  = 0;
    gameState.currentEnemy       = null;
    gameState.enemies            = [];
    gameState.kanjiPool          = [];
  }