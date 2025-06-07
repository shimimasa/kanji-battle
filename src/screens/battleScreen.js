// battleScreen.js  ★全文貼り替え推奨
import { gameState, battleState, addPlayerExp } from '../core/gameState.js';
import { drawButton, isMouseOverRect } from '../ui/uiRenderer.js';
import { loadMonsterImage, loadBgImage, images } from '../loaders/assetsLoader.js';
import { getEnemiesByStageId, getKanjiByStageId } from '../loaders/dataLoader.js';
import { publish } from '../core/eventBus.js';
import { addKanji } from '../models/kanjiDex.js';
import { addMonster } from '../models/monsterDex.js';
const BTN = {
  back:   { x: 20,  y: 20,  w: 100, h: 30,  label: 'タイトルへ' },
  stage:  { x: 140, y: 20,  w: 120, h: 30,  label: 'ステージ選択' },
  attack: { x: 250, y: 380, w: 110, h: 50,  label: 'こうげき' },
  heal:   { x: 370, y: 380, w: 110, h: 50,  label: 'かいふく' },
  hint:   { x: 490, y: 380, w: 110, h: 50,  label: 'ヒント' },
};

const ENEMY_DAMAGE_ANIM_DURATION = 10; // ダメージ時の振動フレーム数
const ENEMY_ATTACK_ANIM_DURATION = 15; // 攻撃時の突進フレーム数
const ENEMY_DEFEAT_ANIM_DURATION = 30; // フレーム数（30フレームで約0.5秒）
const PLAYER_HP_ANIM_SPEED = 2;

const battleScreenState = {
  canvas: null,
  ctx: null,
  inputEl: null,
  victoryCallback: null,
  stageBgImage: null,
  _keydownHandler: null,
  _clickHandler: null,
  _wheelHandler: null,
  logOffset: 0,

  /** 画面がアクティブになったときの初期化 */
  async enter(canvasEl, onVictory) {
    if (!gameState.currentStageId) {
      alert('ステージIDが未設定です。タイトルに戻ります。');
      publish('changeScreen', 'title');
      return;
    }
    console.log("🧪 battleScreen.init() 実行");
    // バトル画面に入ったら BGM をバトル用に切り替える
    publish('playBGM', 'battle');
    console.log("🔍 現在の stageId:", gameState.currentStageId);

    // バトル開始時にプレイヤー HP とターン状態を初期化
    gameState.playerStats.hp       = gameState.playerStats.maxHp;
    battleState.turn               = 'player';
    battleState.inputEnabled       = true;
    battleState.comboCount         = 0;
    battleState.message            = '';
    battleState.enemyAction        = null;  // 'damage' | 'attack' | null
    battleState.enemyActionTimer   = 0;     // 残りフレーム数
    const stageId = gameState.currentStageId;

    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.inputEl = document.getElementById('kanjiInput');

    // Enter キーで最後に選択したコマンドを呼び出す
    this._keydownHandler = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (battleState.turn === 'player' && battleState.inputEnabled) {
          const mode = battleState.lastCommandMode || 'attack';
          if (mode === 'attack') {
            onAttack();
          } else if (mode === 'heal') {
            onHeal();
          } else {
            onHint();
          }
        }
      }
    };
    this.inputEl.addEventListener('keydown', this._keydownHandler);

    this.victoryCallback = onVictory;   // ← 受け取って保持

    // ここで各リストを空にしておく
    gameState.correctKanjiList = [];
    gameState.wrongKanjiList   = [];

    // 新規：メッセージログ用配列を初期化
    battleState.log               = [];

    // ---------- ステージデータ ----------
    // ─── 新規：背景画像ロード ───
    
    try {
      this.stageBgImage = await loadBgImage(gameState.currentStageId);
    } catch (e) {
      console.warn('背景画像が見つかりませんでした:', e);
      this.stageBgImage = null;
    }

    gameState.enemies = getEnemiesByStageId(gameState.currentStageId);
    gameState.kanjiPool = getKanjiByStageId(gameState.currentStageId);
    console.log("📦 漢字数:", gameState.kanjiPool.length);
    console.log("📦 敵数:", gameState.enemies.length);
    if (!gameState.kanjiPool.length) {
          alert('このステージに紐づく漢字データがありません。\nステージ選択へ戻ります。');
          publish('changeScreen', 'stageSelect');
          return;
        }
    gameState.currentEnemyIndex = 0;

    // ---------- 敵画像プリロード ----------
    for (const e of gameState.enemies) {
      e.img = await loadMonsterImage(e);                      // fullフォルダから読み込み
      e.hp  = e.maxHp;
    }

    // ← ここから追加：表示用HPステートを初期化
    battleState.playerHpDisplay   = gameState.playerStats.hp;
    battleState.playerHpTarget    = gameState.playerStats.hp;
    battleState.playerHpAnimating = false;
    battleState.lastAnswered       = null;
    // ← ここまで追加

    // free 関数として呼び出し
    spawnEnemy();
    pickNextKanji();
    // 新規：メッセージログスクロールオフセットを初期化
    this.logOffset = 0;

    // クリックイベント登録
    this.registerHandlers();
  },

  /** 1フレームごとの描画更新 */
  update(dt) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ① 背景描画 (画像 or グラデ)
    // ステージセレクト画面の背景ではなく、バトル用の青色グラデーション背景を使用
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#1e3c72');
    grad.addColorStop(1, '#2a5298');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // ② 左上に「タイトルへ」「ステージ選択」ボタンを描画
    [BTN.back, BTN.stage].forEach(b =>
      drawButton(this.ctx, b.x, b.y, b.w, b.h, b.label)
    );

    /* 敵 */
    const enemy = gameState.currentEnemy;
    const ex = 480, ey = 80, ew = 240, eh = 120;

    // アニメーション用オフセット計算
    let offsetX = 0, offsetY = 0, rotateAngle = 0, alpha = 1;
    if (battleState.enemyAction === 'damage' && battleState.enemyActionTimer > 0) {
      // 振動エフェクト（ランダムに±幅を動かす）
      offsetX = (Math.random() - 0.5) * 20; 
      offsetY = (Math.random() - 0.5) * 10;
      battleState.enemyActionTimer--;
      if (battleState.enemyActionTimer === 0) {
        battleState.enemyAction = null;
      }
    }
    else if (battleState.enemyAction === 'attack' && battleState.enemyActionTimer > 0) {
      // 突進エフェクト（経過に応じて手前に移動して戻る）
      const total = ENEMY_ATTACK_ANIM_DURATION;
      const half  = total / 2;
      const t     = battleState.enemyActionTimer;
      const progress = (half - Math.abs(t - half)) / half; // 0→1→0 の波
      offsetX = -progress * 30; // 左に最大30px
      battleState.enemyActionTimer--;
      if (battleState.enemyActionTimer === 0) {
        battleState.enemyAction = null;
      }
    }

    // ここから追加：撃破時の倒れるアニメーション
    if (battleState.enemyAction === 'defeat' && battleState.enemyActionTimer > 0) {
      const total    = ENEMY_DEFEAT_ANIM_DURATION;
      const timer    = battleState.enemyActionTimer;
      const progress = (total - timer) / total;      // 0→1
      rotateAngle    = progress * (Math.PI / 2);     // 最大90度倒れる
      alpha          = 1 - progress;                 // 徐々にフェードアウト
      battleState.enemyActionTimer--;
      if (battleState.enemyActionTimer === 0) {
        battleState.enemyAction = null;
      }
    }

    // 敵の名前とHPバーを表示（画像の上部に配置）
    if (enemy) {
      // 敵の名前とHPバーの位置とサイズを設定
      const nameBarX = ex + 10;  // X軸の位置はそのまま維持
      const nameBarY = ey - 60;  // Y軸の位置を上に移動
      const barWidth = ew - 20;
      const barHeight = 12;
      
      // 敵の名前を表示
      this.ctx.font = '16px "UDデジタル教科書体",sans-serif';
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${enemy.name} Lv.${enemy.level}`, nameBarX, nameBarY);
      
      // HPバーの背景
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(nameBarX, nameBarY + 20, barWidth, barHeight);
      
      // 現在のHP表示（緑色バー）
      const hpRatio = enemy.hp / enemy.maxHp;
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(nameBarX, nameBarY + 20, barWidth * hpRatio, barHeight);
      
      // HPバーの枠線
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(nameBarX, nameBarY + 20, barWidth, barHeight);
      
      // HP数値表示
      this.ctx.font = '12px "UDデジタル教科書体",sans-serif';
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, nameBarX + barWidth/2, nameBarY + 20 + barHeight + 3);
    }

    // ── 敵描画：回転と透明度を反映 ──
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(ex + ew/2 + offsetX, ey + eh/2 + offsetY);
    this.ctx.rotate(rotateAngle);

    if (enemy && enemy.img) {
      // 画像がある場合は画像を描画（シンプルに）
      // 透明度を保持するために、背景を先に描画しない
      this.ctx.drawImage(enemy.img, -ew/2, -eh/2, ew, eh);
    } else {
      // 画像がない場合は代替表示
      this.ctx.fillStyle = '#6b8e23';
      this.ctx.fillRect(-ew/2, -eh/2, ew, eh);
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(enemy ? enemy.name : 'モンスター', 0, 0);
    }

    this.ctx.restore();

    // ── 漢字 & ヒント ──
    // 旧コード（80px, 枠なし）を下記の新コードに置き換え
    //   ctx.fillStyle = 'white';
    //   ctx.font = '80px serif';
    //   ctx.textAlign = 'center';
    //   ctx.fillText(gameState.currentKanji.text, canvas.width / 2, 200);
    //   if (gameState.showHint) {
    //     ctx.font = '20px sans-serif';
    //     ctx.fillStyle = 'yellow';
    //     ctx.fillText(`ヒント: ${gameState.currentKanji.meaning}`, canvas.width / 2, 250);
    //   }

    // 問題漢字を枠付き＆拡大描画
    const kanjiX = this.canvas.width / 2;
    const kanjiY = 200;
    const kanjiBoxW = 180, kanjiBoxH = 160;
    // 弱点表示
    const weaknessLabel = gameState.currentKanji.weakness === 'onyomi' ? '音' : '訓';
    this.ctx.fillStyle = 'yellow';
    this.ctx.font = '20px "UDデジタル教科書体",sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`弱点は${weaknessLabel}`, kanjiX, kanjiY - kanjiBoxH/2 - 20);
    // 枠
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      kanjiX - kanjiBoxW/2,
      kanjiY - kanjiBoxH/2,
      kanjiBoxW,
      kanjiBoxH
    );
    // 漢字本体
    this.ctx.fillStyle = 'white';
    this.ctx.font = '100px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(gameState.currentKanji.text, kanjiX, kanjiY);

    // ヒントを枠の下に表示
    if (gameState.showHint) {
      this.ctx.font = '20px "UDデジタル教科書体",sans-serif';
      this.ctx.fillStyle = 'yellow';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(
        `ヒント: ${gameState.currentKanji.meaning}`,
        kanjiX,
        kanjiY + kanjiBoxH/2 + 10
      );
    }

    // ← ここから追加：前回解答表示エリア（左側）
    if (battleState.lastAnswered) {
      const bx = 20, by = 70, bw = 140, bh = 140;
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = 'black';
      this.ctx.fillRect(bx, by, bw, bh);
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = 'white';
      this.ctx.strokeRect(bx, by, bw, bh);

      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'left';
      // タイトル
      this.ctx.font = '14px "UDデジタル教科書体",sans-serif';
      this.ctx.fillText('1つまえの漢字', bx + 8, by + 20);
      // 漢字本体
      this.ctx.font = '32px serif';
      this.ctx.fillText(battleState.lastAnswered.text, bx + 10, by + 55);

      // 訓読み（ひらがな）
      this.ctx.font = '12px "UDデジタル教科書体",sans-serif';
      const kun = battleState.lastAnswered.kunyomi.join('、');
      this.ctx.fillText(`訓読み: ${kun}`, bx + 10, by + 75);
      // 音読み（カタカナ）
      const on = battleState.lastAnswered.onyomi.join('、');
      this.ctx.fillText(`音読み: ${on}`, bx + 10, by + 95);

      // 画数
      this.ctx.fillText(`画数: ${battleState.lastAnswered.strokes}`, bx + 10, by + 115);

      this.ctx.restore();
    }
    // ← ここまで追加

    // ── プレイヤー情報描画 ──
    const px = 50;
    // 表示範囲を固定：Y = 350 ～ 430 の間を活用
    const infoTop    = 350;
    const infoBottom = 430;
    const infoHeight = infoBottom - infoTop;  // 80px

    // 1) プレイヤー名
    this.ctx.fillStyle = 'white';
    this.ctx.font      = '16px "UDデジタル教科書体", sans-serif';
    this.ctx.textAlign = 'left';
    const nameY = infoTop + infoHeight * 0.10;   // 約 358px
    this.ctx.fillText(gameState.playerName, px, nameY);

    // 2) HP アニメーション更新（変更なし）
    if (battleState.playerHpAnimating) {
      const disp = battleState.playerHpDisplay;
      const tgt  = battleState.playerHpTarget;
      const diff = tgt - disp;
      if (Math.abs(diff) <= PLAYER_HP_ANIM_SPEED) {
        battleState.playerHpDisplay   = tgt;
        battleState.playerHpAnimating = false;
      } else {
        battleState.playerHpDisplay += Math.sign(diff) * PLAYER_HP_ANIM_SPEED;
      }
    }

    // 3) HPバー（高さを16pxに拡大）
    const pBarW = 200;
    const pBarH = 16;
    const barY  = infoTop + infoHeight * 0.40;   // 約 382px
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(px, barY, pBarW, pBarH);
    const currentHp = battleState.playerHpDisplay;
    const pRate     = currentHp / gameState.playerStats.maxHp;
    this.ctx.fillStyle = '#1abc9c';
    this.ctx.fillRect(px, barY, pBarW * pRate, pBarH);
    this.ctx.strokeStyle = 'white';
    this.ctx.strokeRect(px, barY, pBarW, pBarH);

    // 4) HP数・レベル・EXP を一行で
    this.ctx.fillStyle    = 'white';
    this.ctx.font         = '14px "UDデジタル教科書体", sans-serif';
    this.ctx.textBaseline = 'top';
    const textY = infoTop + infoHeight * 0.80;  // 約 414px
    this.ctx.fillText(
      `HP: ${currentHp}/${gameState.playerStats.maxHp}   Lv:${gameState.playerStats.level}  EXP:${gameState.playerStats.exp}`,
      px,
      textY
    );

    /* ボタン描画 */
    Object.entries(BTN).forEach(([key, b]) => {
      // 背景
      this.ctx.fillStyle = '#2980b9';
      this.ctx.fillRect(b.x, b.y, b.w, b.h);

      // アイコンマップ
      const iconMap = {
        attack: images.iconAttack,
        heal:   images.iconHeal,
        hint:   images.iconHint
      };
      const iconImg = iconMap[key];
      const padding = 8;
      const iconSize = b.h - padding * 2;

      // アイコン描画
      if (iconImg) {
        this.ctx.drawImage(iconImg, b.x + padding, b.y + padding, iconSize, iconSize);
      }

      // テキスト描画
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px "UDデジタル教科書体",sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      // アイコンがある分だけ左にオフセット
      const textX = b.x + padding + (iconImg ? iconSize + padding : 0);
      const textY = b.y + b.h / 2;
      this.ctx.fillText(b.label, textX, textY);
    });

    /* 入力欄 */
    if (this.inputEl) this.inputEl.style.display = 'block';

    // ── メッセージ欄 ──
    const msgX = 50;
    const msgY = BTN.attack.y + BTN.attack.h + 10;
    const msgW = this.canvas.width - msgX * 2;
    const msgH = 100;
    this.ctx.fillStyle   = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(msgX, msgY, msgW, msgH);
    this.ctx.strokeStyle = 'white';
    this.ctx.strokeRect(msgX, msgY, msgW, msgH);
    this.ctx.fillStyle   = 'white';
    this.ctx.font        = '14px "UDデジタル教科書体", sans-serif';
    this.ctx.textAlign   = 'left';
    this.ctx.textBaseline= 'top';
    // メッセージログ表示（スクロール対応）
    const N = 4;
    const len = battleState.log.length;
    const maxOffset = Math.max(0, len - N);
    this.logOffset = Math.min(Math.max(0, this.logOffset), maxOffset);
    const start = Math.max(0, len - N - this.logOffset);
    const lines = battleState.log.slice(start, start + N);
    lines.forEach((l,i) => {
      this.ctx.fillText(l, msgX + 8, msgY + 8 + i * 20);
    });
  },

  /** 画面離脱時のクリーンアップ */
  exit() {
    // 入力欄を非表示＆キーイベント解除
    if (this.inputEl) {
      this.inputEl.style.display = 'none';
      this.inputEl.removeEventListener('keydown', this._keydownHandler);
    }
    // クリックイベントリスナ解除
    if (this._clickHandler) {
      this.unregisterHandlers();
    }
    // canvas/ctx/inputEl をクリア
    this.canvas = this.ctx = this.inputEl = null;
  },

  /** クリックなどのイベントを登録 */
  registerHandlers() {
    this._clickHandler = e => {
      const r = this.canvas.getBoundingClientRect();
      this.handleClick(e.clientX-r.left, e.clientY-r.top, e);
    };
    this.canvas.addEventListener('click', this._clickHandler);
    // メッセージログスクロール用ホイールイベント登録
    this._wheelHandler = e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const msgX = 50;
      const msgY = BTN.attack.y + BTN.attack.h + 10;
      const msgW = this.canvas.width - msgX * 2;
      const msgH = 100;
      if (x >= msgX && x <= msgX + msgW && y >= msgY && y <= msgY + msgH) {
        e.preventDefault();
        const N = 4;
        const len = battleState.log.length;
        const maxOffset = Math.max(0, len - N);
        if (e.deltaY < 0) {
          this.logOffset = Math.min(this.logOffset + 1, maxOffset);
        } else {
          this.logOffset = Math.max(0, this.logOffset - 1);
        }
      }
    };
    this.canvas.addEventListener('wheel', this._wheelHandler);
  },

  /** イベント登録を解除 */
  unregisterHandlers() {
    this.canvas.removeEventListener('click', this._clickHandler);
    this.canvas.removeEventListener('wheel', this._wheelHandler);
  },

  /** クリック処理 */
  handleClick(x,y,event) {
    // handleClick() の中身をここに移動
    // ③ 「タイトルへ」ボタン押下時
    if (isMouseOverRect(x, y, BTN.back)) {
      publish('changeScreen', 'title');
      return true;
    }
    // ④ 「ステージ選択」ボタン押下時
    if (isMouseOverRect(x, y, BTN.stage)) {
      publish('changeScreen', 'stageSelect');
      return true;
    }
    // ⑤ 既存のこうげき／かいふく／ヒント処理
    if (isMouseOverRect(x, y, BTN.attack)) {
      event.preventDefault();
      event.stopPropagation();
      onAttack();
      battleState.lastCommandMode = 'attack';
      return true;
    }
    if (isMouseOverRect(x, y, BTN.heal)) {
      event.preventDefault();
      event.stopPropagation();
      onHeal();
      battleState.lastCommandMode = 'heal';
      return true;
    }
    if (isMouseOverRect(x, y, BTN.hint)) {
      event.preventDefault();
      event.stopPropagation();
      onHint();
      battleState.lastCommandMode = 'hint';
      return true;
    }
    return false; // イベント未処理を示す
  },

  // ※ 必要に応じて spawnEnemy, onAttack, onHeal, onHint, enemyTurn なども
  //   このオブジェクト内にメソッドとして整理してください。
};

export default battleScreenState;

// ---------- バトルロジック ----------

// 敵をスポーン（初期化）
function spawnEnemy() {
  const e = gameState.enemies[gameState.currentEnemyIndex];
  gameState.currentEnemy = e;
  updateEnemyUI(e.name, e.hp, e.maxHp);
  battleState.log = [`${e.name} があらわれた！`];
  publish('playSE', 'appear');
}

// battleScreen.js の onAttack 関数を修正
function onAttack() {
  console.log('🗡 onAttack() called — turn:', battleState.turn, 'inputEnabled:', battleState.inputEnabled);

  // 1) プレイヤーターンかつ入力許可中でなければ終了
  if (battleState.turn !== 'player' || !battleState.inputEnabled) return;
  battleState.inputEnabled = false;

  // 2) 入力を取得してひらがなに変換
  const inputEl = battleScreenState.inputEl;
  if (!inputEl) return;
  const raw    = inputEl.value.trim();
  const answer = toHiragana(raw);

  // ── 読みメッセージ生成 ──
  const onyomiStr = gameState.currentKanji.onyomi.join('、');
  const kunyomiStr = gameState.currentKanji.kunyomi.join('、');
  const readingMsg = `正しいよみは${onyomiStr ? `音読み: ${onyomiStr}` : ''}${onyomiStr && kunyomiStr ? '、' : ''}${kunyomiStr ? `訓読み: ${kunyomiStr}` : ''}`;

  // ── 正誤判定 ──
  const correctReadings = gameState.currentKanji.readings;
  if (correctReadings.includes(answer)) {
    // ← 前回解答を記録（こうげき時）
    battleState.lastAnswered = { ...gameState.currentKanji };
    gameState.correctKanjiList.push({ ...gameState.currentKanji });

    // 正解した漢字IDを図鑑に登録
    addKanji(gameState.currentKanji.id);

    // 経験値付与：通常正解で 3exp
    addPlayerExp(3);

    // 1) 連続正解カウントアップ
    battleState.comboCount++;

    // 2) 基本ダメージ計算
    let dmg = Math.floor(Math.random() * 5) + 1;

    // 3) 5連続正解ボーナス判定
    if (battleState.comboCount === 5) {
      // 連続正解ボーナス：追加 10exp
      addPlayerExp(10);
      dmg = Math.floor(dmg * 1.5);
      battleState.log.push('れんぞくせいかいボーナス！');
      battleState.comboCount = 0;
    }

    // 弱点判定
    let readingType = null;
    if (gameState.currentKanji.kunyomi.includes(answer)) readingType = 'kunyomi';
    else if (gameState.currentKanji.onyomi.includes(answer)) readingType = 'onyomi';
    if (readingType && gameState.currentKanji.weakness === readingType) {
      dmg = Math.floor(dmg * 1.5);
      battleState.log.push('弱点にヒット！ダメージ1.5倍！');
    }

    // 攻撃ログ & ダメージ反映
    battleState.log.push(`せいかい！${readingMsg}、${gameState.currentEnemy.name}に${dmg}のダメージ！`);
    gameState.currentEnemy.hp = Math.max(0, gameState.currentEnemy.hp - dmg);
    publish('playSE', 'correct');
    battleState.enemyAction      = 'damage';
    battleState.enemyActionTimer = ENEMY_DAMAGE_ANIM_DURATION;
    updateEnemyUI(gameState.currentEnemy.name, gameState.currentEnemy.hp, gameState.currentEnemy.maxHp);

    // 敵撃破判定
    if (gameState.currentEnemy.hp === 0) {
      // 撃破ログ
      battleState.log.push(
        `${gameState.playerName}は${gameState.currentEnemy.name}をたおした！`
      );
      publish('playSE', 'defeat');
      battleState.enemyAction      = 'defeat';
      battleState.enemyActionTimer = ENEMY_DEFEAT_ANIM_DURATION;

      // モンスターデックスに登録
      addMonster(gameState.currentEnemy.id);
      // 経験値付与（敵撃破報酬）
      addPlayerExp(30);

      // 敵が残っていれば次の敵をスポーン、最後の敵ならステージクリア
      if (gameState.currentEnemyIndex < gameState.enemies.length - 1) {
        setTimeout(() => {
          // 敵撃破後に入力欄をクリア
          const inputEl = battleScreenState.inputEl;
          if (inputEl) inputEl.value = '';
          gameState.currentEnemyIndex++;
          spawnEnemy();
          pickNextKanji();
          battleState.turn = 'player';
          battleState.inputEnabled = true;
        }, 500);
      } else {
        setTimeout(() => {
          // 最後の敵撃破後に入力欄をクリア
          const inputEl = battleScreenState.inputEl;
          if (inputEl) inputEl.value = '';
          battleScreenState.victoryCallback && battleScreenState.victoryCallback();
        }, 500);
      }
      return;
    }
  } else {
    // 不正解処理
    battleState.lastAnswered       = { ...gameState.currentKanji };
    gameState.wrongKanjiList.push({ ...gameState.currentKanji });
    publish('addToReview', gameState.currentKanji.id);
    publish('playSE', 'wrong');
    battleState.log.push(`こうげきしっぱい！${readingMsg}`);
    const atk = gameState.currentEnemy.atk || 5;
    gameState.playerStats.hp = Math.max(0, gameState.playerStats.hp - atk);
    battleState.playerHpTarget    = gameState.playerStats.hp;
    battleState.playerHpAnimating = true;
    if (gameState.playerStats.hp === 0) {
      return setTimeout(() => publish('changeScreen','gameOver'), 500);
    }
  }

  // 4) 入力クリア & 敵ターン移行
  inputEl.value = '';
  battleState.turn = 'enemy';
  setTimeout(() => {
    enemyTurn();
    pickNextKanji();
    setTimeout(() => {
      battleState.turn         = 'player';
      battleState.inputEnabled = true;
    }, 500);
  }, 1000);
}


// 回復ボタン
function onHeal() {
  if (battleState.turn!=='player' || !battleState.inputEnabled) return;
  battleState.inputEnabled = false;
  console.log('🩹 onHeal() called');

  // ── 追加：入力欄要素を battleScreenState から取得 ──
  const inputEl = battleScreenState.inputEl;
  if (!inputEl) return;

  // 1) 入力取得 & ひらがな化
  const raw = inputEl.value.trim();
  const answer = toHiragana(raw);
  const correctReadings = gameState.currentKanji.readings;

  // ── 追加：読みメッセージ生成 ──
  const onyomiStr = gameState.currentKanji.onyomi.join('、');
  const kunyomiStr = gameState.currentKanji.kunyomi.join('、');
  const readingMsg = `正しいよみは${onyomiStr ? `音読み: ${onyomiStr}` : ''}${onyomiStr && kunyomiStr ? '、' : ''}${kunyomiStr ? `訓読み: ${kunyomiStr}` : ''}`;

  if (correctReadings.includes(answer)) {
    // ← ここから追加：前回解答を記録
    battleState.lastAnswered = { ...gameState.currentKanji };
    // ← ここまで追加
    gameState.correctKanjiList.push({ ...gameState.currentKanji });
    // 回復前のHPを保存
    const prevHp = gameState.playerStats.hp;
    publish('playSE', 'heal');
    gameState.playerStats.hp = Math.min(
      gameState.playerStats.maxHp,
      gameState.playerStats.hp + 30
    );
    battleState.playerHpTarget    = gameState.playerStats.hp;
    battleState.playerHpAnimating = true;
    // 回復成功ログ（新仕様）
    battleState.log.push(`かいふくせいこう！${readingMsg}`);
  } else {
    // ← ここから追加：前回解答を記録
    battleState.lastAnswered = { ...gameState.currentKanji };
    // ← ここまで追加
    gameState.wrongKanjiList.push({ ...gameState.currentKanji });
    // イベントBus経由でレビューキューに追加
    publish('addToReview', gameState.currentKanji.id);
    publish('playSE', 'damage');
    // 失敗時：ダメージ
    const atk = gameState.currentEnemy.atk || 5;
    gameState.playerStats.hp = Math.max(
      0,
      gameState.playerStats.hp - atk
    );
    if (gameState.playerStats.hp === 0) {
      return setTimeout(() => publish('changeScreen','gameOver'), 500);
    }
  }

  // 2) 入力欄クリア（漢字の提示は敵行動後に）
  inputEl.value = '';

  // 3) 敵ターン＆プレイヤー復帰
  battleState.turn = 'enemy';
  setTimeout(() => {
    enemyTurn();
    // 敵の行動ログの後で、次の漢字を提示
    pickNextKanji();
    setTimeout(() => {
      battleState.turn = 'player';
      battleState.inputEnabled = true;
    }, 500);
  }, 1000);
}
  

// ヒント切替
function onHint() {
  gameState.showHint = !gameState.showHint;
  if (gameState.showHint) {
    battleState.log.push(`ヒント：${gameState.currentKanji.meaning}`);
  } else {
    battleState.log.push('ヒントを非表示にした');
  }
}

// 敵行動
function enemyTurn() {
  // 敵の攻撃時に突進アニメーション開始
  battleState.enemyAction      = 'attack';
  battleState.enemyActionTimer = ENEMY_ATTACK_ANIM_DURATION;

  const atk = gameState.currentEnemy.atk || 5;
  // 敵攻撃メッセージのフォーマットを `${e.name} のこうげき！プレイヤー名に～のダメージ！` に変更
  battleState.log.push(
    `${gameState.currentEnemy.name} のこうげき！${gameState.playerName}に${atk}のダメージ！`
  );

  gameState.playerStats.hp = Math.max(0, gameState.playerStats.hp - atk);
  // ── ここから追加 ──
  battleState.playerHpTarget    = gameState.playerStats.hp;
  battleState.playerHpAnimating = true;
  // ── ここまで追加 ──
  publish('playSE', 'damage');

  if (gameState.playerStats.hp <= 0) {
    return setTimeout(() => publish('changeScreen','gameOver'),1500);
  }
}


export function pickNextKanji() {
  console.log('🧪 pickNextKanji() 開始');

  // 通常の漢字プール取得
  const pool = gameState.kanjiPool;

  // ✅ 通常の漢字抽出
  const k = pool[Math.floor(Math.random() * pool.length)];
  if (!k) {
    alert('❌ 漢字データが不正です。');
    return;
  }

  // ここで weakness プロパティを引き継ぐ
  gameState.currentKanji = {
    id: k.id,
    text: k.kanji,
    kunyomi: k.kunyomi
      ? k.kunyomi.split(' ').map(r => toHiragana(r.trim())).filter(Boolean)
      : [],
    onyomi: k.onyomi
      ? k.onyomi.split(' ').map(r => toHiragana(r.trim())).filter(Boolean)
      : [],
    weakness: k.weakness,  // 弱点：'onyomi' か 'kunyomi'
    readings: getReadings(k),
    meaning: k.meaning,
    strokes: k.strokes,
  };

  gameState.showHint = false;
  // ── 追加：新しい漢字問題の出題メッセージをログに追加
  battleState.log.push(`「${gameState.currentKanji.text}」をよもう！`);

  console.log('✅ 次の漢字:', k.kanji);
}

// HPバー・テキスト更新
function updateEnemyUI(name, hp, maxHp) {
  // battleScreenState の canvas と ctx を参照
  const ctx    = battleScreenState.ctx;
  const canvas = battleScreenState.canvas;
  if (!ctx || !canvas) return;
  // 画面上部に HP 表示＆ゲージ描画
  ctx.clearRect(0, 0, canvas.width, 50);
  ctx.fillStyle = 'white';
  ctx.font = '20px "UDデジタル教科書体",sans-serif';
  ctx.fillText(`${name} HP: ${hp}／${maxHp}`, 20, 30);

  const barW = 200;
  const rate = hp / maxHp;
  ctx.fillStyle = 'red';
  ctx.fillRect(20, 35, barW * rate, 10);
  ctx.strokeStyle = 'white';
  ctx.strokeRect(20, 35, barW, 10);
}


export function cleanup() {  
  // バトル画面を離れるときに、入力欄を非表示にする
  if (inputEl) {
    inputEl.style.display = 'none';
  }
  // バトル画面固有のリスナ解除は不要（main.js が一元管理しているため）
  canvas = null;
  inputEl = null;
}

/* ---------- ユーティリティ ---------- */
const hiraShift = ch => String.fromCharCode(ch.charCodeAt(0) - 0x60);
const toHira = s => s.replace(/[\u30a1-\u30f6]/g, hiraShift).trim();

// getReadings 関数も改善
function getReadings(k) {
  const set = new Set();
  if (k.kunyomi) {
    k.kunyomi.split(' ').forEach(r => {
      if (r) set.add(toHira(r.trim()));
    });
  }
  if (k.onyomi) {
    k.onyomi.split(' ').forEach(r => {
      if (r) set.add(toHira(r.trim()));
    });
  }
  return [...set].filter(Boolean); // undefined や空文字を除外
}

// battleScreen.js の normalizeReading 関数を改善
function toHiragana(input) {
  if (!input) return '';
  // 全角スペース、半角スペースをトリム
  let normalized = input.trim().replace(/\s+/g, '');
  // カタカナをひらがなに変換
  normalized = toHira(normalized);
  return normalized;
}

