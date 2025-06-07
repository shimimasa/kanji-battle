// src/monsterDex.js
// モンスターデックス管理モジュール
// localStorage に Set<number> 形式で永続化
// 使用キー: 'krb_monster_dex'

import DataSync from '../services/firebase/dataSync.js';

const STORAGE_KEY = 'krb_monster_dex';

/**
 * 図鑑をロードして Set<number> を返却
 * localStorage にデータがなければ空の Set を返す
 * @returns {Set<number>}
 */
export function loadDex() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    // number 型のみを抽出
    const nums = arr.filter(n => typeof n === 'number');
    return new Set(nums);
  } catch (e) {
    console.error('monsterDex: 図鑑のロードに失敗しました', e);
    return new Set();
  }
}

/**
 * 図鑑の Set<number> を localStorage に保存
 * @param {Set<number>} dex
 */
export function saveDex(dex) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dex]));
    DataSync.syncAll();
  } catch (e) {
    console.error('monsterDex: 図鑑の保存に失敗しました', e);
  }
}

/**
 * 図鑑にモンスターIDを追加して保存
 * すでに登録済みの場合は何もしない
 * @param {number} id モンスターの一意ID
 */
export function addMonster(id) {
  const dex = loadDex();
  if (!dex.has(id)) {
    dex.add(id);
    saveDex(dex);
  }
}
