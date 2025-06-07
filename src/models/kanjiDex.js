// src/kanjiDex.js
// 漢字図鑑管理モジュール
// localStorage に Set<string> 形式で永続化
// 使用キー: 'krb_kanji_dex'

import DataSync from '../services/firebase/dataSync.js';

const STORAGE_KEY = 'krb_kanji_dex';

/**
 * 図鑑をロードして Set<string> で返却
 * localStorage にデータがなければ空の Set を返す
 * @returns {Set<string>}
 */
export function loadDex() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    // null/undefined を除外する
    const filtered = Array.isArray(arr) ? arr.filter(id => id != null) : [];
    return new Set(filtered);
  } catch (e) {
    console.error('kanjiDex: 図鑑のロードに失敗しました', e);
    return new Set();
  }
}

/**
 * 図鑑の Set<string> を localStorage に保存
 * @param {Set<string>} dex
 */
export function saveDex(dex) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dex]));
    DataSync.syncAll();
  } catch (e) {
    console.error('kanjiDex: 図鑑の保存に失敗しました', e);
  }
}

/**
 * 図鑑に漢字IDを追加して保存
 * すでに登録済みの場合は何もしない
 * @param {string} id  漢字の一意ID
 */
export function addKanji(id) {
  const dex = loadDex();
  if (!dex.has(id)) {
    dex.add(id);
    saveDex(dex);
  }
}
