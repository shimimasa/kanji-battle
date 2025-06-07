// js/resultScreen.js
import { gameState } from './gameState.js';
import { drawButton, isMouseOverRect } from './uiRenderer.js';
import { savePlayerData, saveStageClearStatus } from './firebaseController.js'; // Firebase関数をインポート


let toStageSelectButton; // ボタン情報をモジュールスコープで保持
let expGainedThisBattle = 0; // このバトルで獲得した経験値
let levelUpMessage = ""; // レベルアップ時のメッセージ

export async function init(canvas) { // 非同期関数に変更
    console.log("resultScreen.init called with canvas:", canvas);
    if (!canvas) {
        console.error("resultScreen.init: canvas is undefined! Cannot initialize buttons.");
        toStageSelectButton = undefined;
        return;
    }

    // --- 経験値とレベルアップ処理 ---
    // GDDに基づき、このバトルで獲得する経験値を計算 (プロトタイプでは固定値でも良い)
    // 例: (3 EXP/問 × 平均3問/敵 × 10体) + ステージクリアボーナス30 EXP = 120 EXP
    expGainedThisBattle = 120; // プロトタイプGDDの値
    gameState.playerStats.exp += expGainedThisBattle;
    console.log(`EXP gained this battle: ${expGainedThisBattle}, Total EXP: ${gameState.playerStats.exp}`);

    levelUpMessage = ""; // メッセージを初期化
    // レベルアップ判定
    if (gameState.playerStats.exp >= gameState.playerStats.nextLevelExp) {
        gameState.playerStats.level++;
        gameState.playerStats.maxHp += 10; // GDDに基づきHP上昇
        gameState.playerStats.hp = gameState.playerStats.maxHp; // HP全回復
        // 次のレベルに必要な経験値の計算 (例: 残り経験値を持ち越す場合)
        // gameState.playerStats.exp -= gameState.playerStats.nextLevelExp;
        // プロトタイプではシンプルに超過分は切り捨てて、次のレベルのEXPを0からスタートでも良い
        gameState.playerStats.exp = 0;
        gameState.playerStats.nextLevelExp = Math.floor(gameState.playerStats.nextLevelExp * 1.5); // 次の必要EXPを増やす（例:1.5倍）

        // 正しいテンプレートリテラルを使用
        levelUpMessage = `レベルアップ！ Lv:${gameState.playerStats.level} HPが${gameState.playerStats.maxHp}になった！`;
        console.log("作成されたlevelUpMessage:", levelUpMessage); // コンソールで確認
    }
    // --- ここまで経験値とレベルアップ処理 ---
    const currentPlayerData = {
        name: gameState.playerName, // gameStateから最新の名前
        level: gameState.playerStats.level,
        exp: gameState.playerStats.exp,
        maxHp: gameState.playerStats.maxHp,
        attack: gameState.playerStats.attack,
        nextLevelExp: gameState.playerStats.nextLevelExp
    };
    await savePlayerData(currentPlayerData);

    // ★★★ Firebaseにステージクリア状況を保存 ★★★
    if (gameState.currentStageId) {
        await saveStageClearStatus(gameState.currentStageId);
        // gameState.stageProgress がローカルでも更新されるように firebaseController 側で対応済み
    }

    // ボタンの定義 (canvas のサイズに基づいて行う)
    const centerX = canvas.width / 2;
    toStageSelectButton = { x: centerX - 125, y: 400, width: 250, height: 60, text: 'ステージ選択へ' };
    console.log("resultScreen buttons initialized:", toStageSelectButton);
}

export function update(gameState) { // gameState を引数で受け取る
    if (gameState.mouseClick && toStageSelectButton) { // ボタンが定義されているか確認
        // console.log("resultScreen update: mouseClick detected", gameState.mouseClick);
        // console.log("toStageSelectButton rect:", toStageSelectButton);

        if (isMouseOverRect(gameState.mouseClick.x, gameState.mouseClick.y, toStageSelectButton)) {
            console.log('「ステージ選択へ」ボタン クリック検知！ (resultScreen)');
            gameState.currentScreen = 'stageSelect';
            console.log('currentScreen set to stageSelect in resultScreen');
        }
        // クリックイベントは main.js の gameLoop で消費されるので、ここではリセットしない
    }
 // 最後に必ずクリア
 gameState.mouseClick = null;}

export function draw(ctx, gameState) { // gameState を引数で受け取る
    if (!ctx) {
        console.error("resultScreen.draw: ctx is undefined!");
        return;
    }
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = 'gold';
    ctx.font = '60px "MS Gothic", sans-serif'; // フォント指定
    ctx.textAlign = 'center';
    ctx.fillText('勝利！', ctx.canvas.width / 2, 150);

    ctx.fillStyle = 'white';
    ctx.font = '24px "MS Gothic", sans-serif';
    ctx.fillText(`獲得経験値: ${expGainedThisBattle} EXP`, ctx.canvas.width / 2, 250);

    if (levelUpMessage) { // levelUpMessage が空でなければ表示
        ctx.fillStyle = 'lightgreen';
        ctx.font = '28px "MS Gothic", sans-serif';
        ctx.fillText(levelUpMessage, ctx.canvas.width / 2, 320);
    }

    // ボタンが初期化されていれば描画
    if (toStageSelectButton) {
        drawButton(ctx, toStageSelectButton.x, toStageSelectButton.y, toStageSelectButton.width, toStageSelectButton.height, toStageSelectButton.text);
    } else {
        // console.warn("resultScreen.draw: toStageSelectButton is undefined"); // デバッグ用
        // エラーを防ぐため、未定義の場合はボタンを描画しないか、エラーメッセージを出す
        ctx.fillStyle = 'red';
        ctx.font = '16px sans-serif';
        ctx.fillText("ボタン情報がありません (resultScreen)", ctx.canvas.width / 2, 430);
    }
}

export function cleanup() {
    console.log("resultScreen cleanup");
    // この画面で動的に確保したリソースなどがあればここで解放する
    // プロトタイプでは、変数をリセットする程度で良いかもしれません
    toStageSelectButton = undefined; // ボタン情報をクリア
    expGainedThisBattle = 0;
    levelUpMessage = "";
}