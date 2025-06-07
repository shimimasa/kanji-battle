// src/uiRenderer.js
//
// ボタン／テキスト／ゲージなど「Canvas UI を描くだけ」のユーティリティ。
// クリック判定に必要な矩形は「呼び出し元が管理する」のが基本方針。

/* ------------------------------------------------------------------ */
/*  ボタン                                                             */
/* ------------------------------------------------------------------ */

/**
 * 矩形ボタンを描画する
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} label
 * @param {string} [fill='#2980b9']
 */
export function drawButton(ctx, x, y, width, height, label, fill = '#2980b9') {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = 'white';
  ctx.font = '18px "UDデジタル教科書体", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);
}

/**
 * マウス座標が矩形内かどうか  
 * rect = { x, y, width, height } でも { x, y, w, h } でも OK
 */
export function isMouseOverRect(mouseX, mouseY, rect) {
  if (!rect) return false;
  const w = rect.width ?? rect.w;
  const h = rect.height ?? rect.h;
  return mouseX >= rect.x && mouseX <= rect.x + w &&
         mouseY >= rect.y && mouseY <= rect.y + h;
}

/* ------------------------------------------------------------------ */
/*  汎用テキスト                                                       */
/* ------------------------------------------------------------------ */

export function drawText(ctx, text, x, y, font = '20px sans-serif', color = 'white', align = 'left') {
  ctx.font = font.replace(/(\d+px)\s+.+$/, `$1 "UDデジタル教科書体", sans-serif`);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

/* ------------------------------------------------------------------ */
/*  ゲージ（HP など簡易版）                                            */
/* ------------------------------------------------------------------ */

/**
 * シンプルな横ゲージ
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} value - 0〜1 の割合
 * @param {string} [fill='#27ae60']
 */
export function drawGauge(ctx, x, y, w, h, value, fill = '#27ae60') {
  ctx.fillStyle = '#555';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, value)), h);
}
