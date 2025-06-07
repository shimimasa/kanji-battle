// js/playerNameInputScreen.js
import { gameState, updatePlayerName } from '../core/gameState.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { getCurrentUser, initializeNewPlayerData } from '../services/firebase/firebaseController.js';

let confirmButton;
const nameInputElement = document.getElementById('playerNameInputField'); // HTMLのinput要素

export function init(canvas) {
    console.log("playerNameInputScreen.init called");
    if (!canvas) { /* ...エラー処理... */ return; }
    if (!nameInputElement) {
        console.error("playerNameInputScreen.init: playerNameInputField not found in DOM!");
        return;
    }

    const centerX = canvas.width / 2;
    confirmButton = { x: centerX - 100, y: 400, width: 200, height: 50, text: 'けってい' };
    console.log("playerNameInputScreen confirmButton initialized:", confirmButton);

    // ★★★ HTML入力欄を表示し、位置を調整 ★★★
    nameInputElement.style.display = 'block';
    nameInputElement.value = ""; // 前回のをクリア
    const canvasRect = canvas.getBoundingClientRect();
    nameInputElement.style.left = `${canvasRect.left + canvas.width / 2 - nameInputElement.offsetWidth / 2}px`;
    nameInputElement.style.top = `${canvasRect.top + 300 - nameInputElement.offsetHeight / 2}px`; // Y座標を調整
    nameInputElement.maxLength = 10; // 文字数制限
    nameInputElement.focus(); // 自動でフォーカス

    // Enterキーでの送信をinput要素自体に設定
    nameInputElement.onkeydown = function(event) {
        if (event.key === 'Enter' && gameState.currentScreen === 'playerNameInput') {
            submitNameAndSave();
            event.preventDefault();
        }
    };
}

export function cleanup() {
    console.log("playerNameInputScreen cleanup");
    if (nameInputElement) {
        nameInputElement.style.display = 'none'; // 非表示にする
        nameInputElement.onkeydown = null; // イベントリスナーをクリア
    }
}

async function submitNameAndSave() {
    if (!nameInputElement) return;
    const trimmedName = nameInputElement.value.trim(); // ★HTML入力欄から値を取得
    if (trimmedName === "" || trimmedName === "ななしのごんべえ" || trimmedName === "ゲスト" || trimmedName === "新規プレイヤー") {
        alert("有効な なまえを いれてください。");
        nameInputElement.value = ""; // 入力をクリア
        nameInputElement.focus();
        return;
    }
    // ... (以降のFirebase保存処理は前回と同様) ...
    updatePlayerName(trimmedName);
    const user = getCurrentUser();
    if (user && user.uid) {
        const newPlayerData = await initializeNewPlayerData(user.uid, gameState.playerName);
        if (newPlayerData) {
            console.log("New player profile created/updated in Firestore:", newPlayerData);
            Object.assign(gameState.playerStats, { /* ...初期ステータス設定... */ });
        } else { /* ...エラー処理... */ return; }
    } else { /* ...ユーザー未認証エラー... */ return; }
    gameState.currentScreen = 'menu';
}

export function update(gameState) {
    if (gameState.mouseClick) {
        if (confirmButton && isMouseOverRect(gameState.mouseClick.x, gameState.mouseClick.y, confirmButton)) {
            submitNameAndSave();
        }
    }
}

export function draw(ctx, gameState) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '30px "UDデジタル教科書体",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('なまえを にゅうりょく してください', ctx.canvas.width / 2, 150);
    ctx.font = '24px "UDデジタル教科書体",sans-serif';
    ctx.fillText('(10もじまで)', ctx.canvas.width / 2, 200);

    // Canvasへの直接的な文字入力描画は不要になる (HTML input要素が担当するため)
    // もし入力欄の枠などをCanvasで描きたい場合は別途描画する

    if (confirmButton) {
        drawButton(ctx, confirmButton.x, confirmButton.y, confirmButton.width, confirmButton.height, confirmButton.text);
    }
}