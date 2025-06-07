// シンプルな状態マシン（Finite State Machine）クラス

export class FSM {
    /**
     * @param {string} initialState - 最初に遷移する状態の名前
     * @param {Object<string, { enter(): void, update(dt: number): void, exit(): void }>} states
     *        各状態オブジェクトを名前 → オブジェクトで渡す
     */
    constructor(initialState, states) {
      this.states = states;
      this.currentState = null;
      this.change(initialState);
    }
  
    /**
     * 状態を切り替える
     * @param {string} stateName - 遷移先の状態名
     */
    change(stateName) {
      const next = this.states[stateName];
      if (!next) {
        throw new Error(`FSM: 状態 "${stateName}" が見つかりません`);
      }
      // exit 旧状態
      if (this.currentState && typeof this.currentState.exit === 'function') {
        this.currentState.exit();
      }
      // enter 新状態
      this.currentState = next;
      if (typeof this.currentState.enter === 'function') {
        this.currentState.enter();
      }
    }
  
    /**
     * 現在の状態を更新する
     * @param {number} dt - 前フレームからの経過時間（ミリ秒など任意単位）
     */
    update(dt) {
      if (this.currentState && typeof this.currentState.update === 'function') {
        this.currentState.update(dt);
      }
    }
  }