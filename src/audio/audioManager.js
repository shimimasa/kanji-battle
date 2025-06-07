// src/audioManager.js
// シンプル & 拡張しやすい Audio 管理クラス（ES Modules）
//
// 使い方例：
// import { AudioManager } from './audioManager.js';
//
// const audio = new AudioManager();
// audio.playBGM('title');
// audio.playSE('attack');
// audio.fadeToBGM('battle', 1.5);   // 1.5 秒クロスフェード
// audio.setMasterVolume(0.6);

export class AudioManager {
    /** @type {HTMLAudioElement|null} 現在再生中の BGM */
    #currentBGM = null;
    /** @type {number} 0.0–1.0 のマスターボリューム */
    #masterVolume = 1;
    /** @type {number} 0.0–1.0 のBGM個別音量 */
    #bgmVolume = 1;
    /** @type {number} 0.0–1.0 のSE個別音量 */
    #seVolume  = 1;

    setMasterVolume(value) {
      this.#masterVolume = Math.max(0, Math.min(1, value));
      if (this.#currentBGM) {
        this.#currentBGM.volume = this.#masterVolume * this.#bgmVolume;
      }
    }
  
  /**
    * 現在のマスターボリュームを返す
    */
   getMasterVolume() {
     return this.#masterVolume;
   }
  
    /** ─────────────────────────────────────
     *  アセット定義：ファイル名をまとめておくだけ
     *  追加・変更はここを編集するだけで OK
     *  ───────────────────────────────────── */
    static FILES = {
      bgm: {
        title:   '/src/assets/audio/bgm_title.mp3',
        battle:  '/src/assets/audio/bgm_battle.mp3',
        victory: '/src/assets/audio/bgm_victory.mp3',
      },
      se: {
        appear:  '/src/assets/audio/se_appear.mp3',
        attack:  '/src/assets/audio/se_attack.mp3',
        damage:  '/src/assets/audio/se_damage.mp3',
        heal:    '/src/assets/audio/se_heal.mp3',
        correct: '/src/assets/audio/se_correct.mp3',
        wrong:   '/src/assets/audio/se_wrong.mp3',
        decide:  '/src/assets/audio/se_decide.mp3',
        defeat:  '/src/assets/audio/se_defeat.mp3'
      }
    };
  
    /*───────────────────────
      BGM 再生
    ───────────────────────*/
    /**
     * BGM 再生。すでに同じ曲の場合は何もしない
     * @param {'title'|'battle'|'victory'|'defeat'} key
     * @param {boolean} [loop=true]
     */
    playBGM(key, loop = true) {
      const src = AudioManager.FILES.bgm[key];
      if (!src) return console.warn(`BGM "${key}" は定義されていません`);
  
      // 同じ曲ならスキップ
      if (this.#currentBGM?.dataset?.key === key) return;
  
      // 今流れている曲を即停止（新BGM停止の妨げにならないよう直接停止）
      if (this.#currentBGM) {
        this.#currentBGM.pause();
        this.#currentBGM.currentTime = 0;
        this.#currentBGM = null;
      }
  
      const bgm = new Audio(src);
      bgm.dataset.key = key;
      bgm.loop = loop;
      bgm.volume = this.#masterVolume * this.#bgmVolume;
      bgm.play().catch(console.error);
      this.#currentBGM = bgm;
    }
  
    /**
     * フェード付きで BGM を切り替える
     * @param {'title'|'battle'|'victory'|'defeat'} key
     * @param {number} duration フェード秒数 (0–5くらい推奨)
     */
    async fadeToBGM(key, duration = 1) {
      if (this.#currentBGM?.dataset?.key === key) return; // 同じなら不要
  
      await this.stopBGM(duration);       // フェードアウト
      this.playBGM(key);                  // 新しい曲を再生
      await this.#fadeIn(this.#currentBGM, duration);
    }
  
    /**
     * BGM 停止
     * @param {number} duration フェードアウト秒数。0 なら即停止
     */
    async stopBGM(duration = 0) {
      if (!this.#currentBGM) return;
      await this.#fadeOut(this.#currentBGM, duration);
      this.#currentBGM.pause();
      this.#currentBGM.currentTime = 0;
      this.#currentBGM = null;
    }
  
    /*───────────────────────
      SE 再生（多重再生 OK）
    ───────────────────────*/
    /**
     * 効果音を再生
     * @param {'appear'|'attack'|'damage'|'heal'|'defeat'|'correct'|'wrong'} key
     */
    playSE(key) {
      const src = AudioManager.FILES.se[key];
      if (!src) return console.warn(`SE "${key}" は定義されていません`);
  
      const se = new Audio(src);
      se.volume = this.#masterVolume * this.#seVolume;
      se.play().catch(console.error);
    }
  
    /*───────────────────────
      共通ユーティリティ
    ───────────────────────*/
    /**
     * マスターボリューム (0–1)
     * BGM / SE どちらにも即反映
     */
    setMasterVolume(value) {
      this.#masterVolume = Math.max(0, Math.min(1, value));
      if (this.#currentBGM) this.#currentBGM.volume = this.#masterVolume;
    }
  
    // 内部：フェードアウト
    #fadeOut(audio, duration) {
      return new Promise(res => {
        if (duration <= 0) return res();
        let t = duration, startVol = audio.volume;
        const step = () => {
          t -= 0.016;
          audio.volume = Math.max(0, (t / duration) * startVol);
          if (t <= 0) return res();
          requestAnimationFrame(step);
        };
        step();
      });
    }
  
    // 内部：フェードイン
    #fadeIn(audio, duration) {
      return new Promise(res => {
        if (duration <= 0) return res();
        let t = 0;
        audio.volume = 0;
        const step = () => {
          t += 0.016;
          audio.volume = Math.min(this.#masterVolume, (t / duration) * this.#masterVolume);
          if (t >= duration) return res();
          requestAnimationFrame(step);
        };
        step();
      });
    }

    /**
     * BGM音量を設定 (0–1)
     */
    setBGMVolume(value) {
      this.#bgmVolume = Math.max(0, Math.min(1, value));
      if (this.#currentBGM) {
        this.#currentBGM.volume = this.#masterVolume * this.#bgmVolume;
      }
    }
    /**
     * BGM音量を取得
     */
    getBGMVolume() {
      return this.#bgmVolume;
    }
    /**
     * SE音量を設定 (0–1)
     */
    setSEVolume(value) {
      this.#seVolume = Math.max(0, Math.min(1, value));
    }
    /**
     * SE音量を取得
     */
    getSEVolume() {
      return this.#seVolume;
    }
}
  