// src/assetsLoader.js
//
// ◆initAssets()         … ゲーム起動時に"共通 UI 画像"をプリロード
// ◆loadEnemyImage(id)   … 敵スプライトをステージ開始時にプリロード
// ◆images               … すべての Image オブジェクトをキャッシュ保持

export const images = {};                // key → HTMLImageElement

/* ------------------------------------------------------------------ */
/*  共通 UI 画像のプリロード                                           */
/* ------------------------------------------------------------------ */

const UI_IMAGE_PATHS = {
  logo:          '/src/assets/images/logo.png',
  buttonNormal:  '/src/assets/images/button_normal.png',
  buttonClick:   '/src/assets/images/button_click.png',
  buttonSelect:  '/src/assets/images/button_select.png',
  buttonInactive:'/src/assets/images/button_not_act.png',
  iconAttack:    '/src/assets/images/icon_attack.png',
  iconHeal:      '/src/assets/images/icon_heal.png',
  iconExp:       '/src/assets/images/icon_exp.png',
  iconHint:      '/src/assets/images/icon_hint.png',
  iconSetting:   '/src/assets/images/icon_setting.png',
  markerPref:    '/src/assets/images/marker_pref.png',
  markerLocked:  '/src/assets/images/marker_locked.png',
  markerCleared: '/src/assets/images/marker_cleared.png',
  hokkaido:      '/src/assets/images/hokkaido.png',   // ← duplicate key 修正
  stageSelect0:  '/src/assets/images/stage.select.PNG',
  stageSelect:   '/src/assets/images/stage.select.PNG',
  stageSelect1:  '/src/assets/images/stage.select.1.PNG',
  stageSelect2:  '/src/assets/images/stage.select.2.PNG',
  stageSelect3:  '/src/assets/images/stage.select.3.PNG',
  stageSelect4:  '/src/assets/images/stage.select.4.PNG',
  stageSelect5:  '/src/assets/images/stage.select.5.PNG',
  stageSelect6:  '/src/assets/images/stage.select.6.PNG',
};

/** ゲーム起動時に await される共通プリロード関数 */
export async function initAssets() {
  const tasks = Object.entries(UI_IMAGE_PATHS).map(([key, src]) =>
    loadImage(src)
      .then(img => { images[key] = img; })
      .catch(() => console.warn(`⚠️ ${src} の読み込み失敗`))
  );
  await Promise.all(tasks);
}

/* ------------------------------------------------------------------ */
/*  敵スプライトの動的ロード                                           */
/* ------------------------------------------------------------------ */

/**
 * 敵画像を読み込み、images[enemyImageName] にキャッシュ
 * @param {string} enemyImageName 例: "HKD-E01" または "HKD-E01.png" / "HKD-E01.webp"
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadEnemyImage(enemyImageName) {
  // キャッシュ済なら即返却
  if (images[enemyImageName]) return images[enemyImageName];

  // 渡された名称に拡張子がなければ .png を付与
  let filename = enemyImageName;
  if (!/\.[^/.]+$/.test(enemyImageName)) {
    filename = `${enemyImageName}.png`;
  }
  const path = `/src/assets/images/enemy/${encodeURIComponent(filename)}`;
  try {
    const img = await loadImage(path);
    // キャッシュは拡張子なしキーでも良いように、オリジナルキーで保持
    images[enemyImageName] = img;
    return img;
  } catch {
    console.warn(`❌ 敵画像のロード失敗: ${path}`);
    return null;
  }
}

/**
 * ステージ背景画像を読み込む関数
 * @param {string} stageId ステージID
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadBgImage(stageId) {
  // キャッシュ済みならそれを返す
  const cacheKey = `bg_${stageId}`;
  if (images[cacheKey]) return images[cacheKey];
  
  // 学年別背景画像マッピング
  const gradeMapping = {
    'hokkaido_area': 1,
    'tohoku_area1': 2,
    'tohoku_area2': 2,
    'tohoku_area3': 2,
    'tohoku_area4': 2,
    'tohoku_area5': 2,
    'tohoku_area6': 2,
    'kantou_area': 3,
    'kanto_area1': 3,
    'kanto_area2': 3,
    'kanto_area3': 3,
    'kanto_area4': 3,
    'kanto_area5': 3,
    'kanto_area6': 3,
    'kanto_area7': 3,
    'chuubu_area': 4,
    'chubu_area1': 4,
    'chubu_area2': 4,
    'chubu_area3': 4,
    'chubu_area4': 4,
    'chubu_area5': 4,
    'chubu_area6': 4,
    'kinki_area': 5,
    'kinki_area1': 5,
    'kinki_area2': 5,
    'kinki_area3': 5,
    'kinki_area4': 5,
    'kinki_area5': 5,
    'kinki_area6': 5,
    'kinki_area7': 5,
    'chuugoku_area': 6,
    'chuugoku_area1': 6,
    'chuugoku_area2': 6,
    'chuugoku_area3': 6,
    'chuugoku_area4': 6,
    'chuugoku_area5': 6,
  };
  
  // ステージIDから学年を判断
  const grade = gradeMapping[stageId] || 1;
  
  // 背景画像のパス
  const path = `/src/assets/images/stage.select.${grade}.PNG`;
  
  try {
    // 透明度を確保するために loadImageWithTransparency を使用
    const img = await loadImageWithTransparency(path);
    images[cacheKey] = img;
    return img;
  } catch (error) {
    console.warn(`❌ 背景画像のロード失敗: ${path}`, error);
    // 失敗した場合はデフォルト背景を試す
    try {
      const defaultPath = '/src/assets/images/stage.select.PNG';
      const defaultImg = await loadImageWithTransparency(defaultPath);
      images[cacheKey] = defaultImg;
      return defaultImg;
    } catch {
      return null;
    }
  }
}

// 追加：モンスター画像（fullサイズ）を読み込む関数を修正
export async function loadMonsterImage(enemy) {
  if (images[enemy.id]) return images[enemy.id];
  
  // 敵の名前を取得（表示用）
  const enemyName = enemy.name || enemy.id || 'モンスター';
  console.log(`${enemy.id} (${enemyName}) の画像をロード中...`);
  
  // 学年別フォルダマッピング
  const gradeFolderMap = {
    1: 'grade1-hokkaido',
    2: 'grade2-touhoku',
    3: 'grade3-kantou',
    4: 'grade4-chuubu',
    5: 'grade5-kinki',
    6: 'grade6-chuugoku',
  };
  
  // 学年に基づいてフォルダを決定
  const folder = gradeFolderMap[enemy.grade] || gradeFolderMap[1];
  
  // 画像ファイル名を取得（ID部分のみ）
  const enemyId = enemy.id;
  console.log(`敵ID: ${enemyId}, フォルダ: ${folder}`);
  
  // 順番に試す画像パスの配列
  const pathsToTry = [
    // 1. WebP形式の画像（monsters/full/フォルダ内）
    `/src/assets/images/monsters/full/${folder}/${enemyId}.webp`,
    
    // 2. 数字のファイル名形式（enemy/フォルダ内）
    `/src/assets/images/enemy/${enemyId.split('-')[1].replace('E', '')}_${enemyName}.png`,
    
    // 3. 北海道の敵画像を代替として試す
    `/src/assets/images/monsters/full/grade1-hokkaido/HKD-${enemyId.split('-')[1]}.webp`,
    
    // 4. 数字のみのファイル名で北海道フォルダ内を試す
    `/src/assets/images/enemy/${enemyId.split('-')[1].replace('E', '')}_${enemyName.split('の')[0]}.png`
  ];
  
  // 各パスを順番に試す
  for (const path of pathsToTry) {
    try {
      console.log(`画像を試行: ${path}`);
      // 透明度を確保するために loadImageWithTransparency を使用
      const img = await loadImageWithTransparency(path);
      console.log(`✅ 画像ロード成功: ${path}`);
      images[enemyId] = img;
      return img;
    } catch (error) {
      console.log(`画像ロード失敗: ${path}`);
      // 次のパスを試す
    }
  }
  
  // すべてのパスが失敗した場合、代替画像を生成
  console.log(`代替画像を生成: ${enemyId}`);
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 180;
  const ctx = canvas.getContext('2d', { alpha: true });
  
  // 背景は透明
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // シンプルな四角形を描画
  ctx.fillStyle = '#6b8e23';
  ctx.fillRect(40, 30, 160, 120);
  
  // 枠線
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 30, 160, 120);
  
  // テキスト
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(enemyName, canvas.width/2, canvas.height/2);
  
  // キャンバスから画像を生成
  const placeholderImg = new Image();
  
  const placeholderPromise = new Promise((resolve) => {
    placeholderImg.onload = () => {
      resolve(placeholderImg);
    };
  });
  
  // PNG形式で透明度を保持
  placeholderImg.src = canvas.toDataURL('image/png');
  
  // 画像の読み込み完了を待つ
  const finalImg = await placeholderPromise;
  
  // キャッシュに保存
  images[enemyId] = finalImg;
  return finalImg;
}

/* ------------------------------------------------------------------ */
/*  汎用ロードユーティリティ                                           */
/* ------------------------------------------------------------------ */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // CORS対応
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`画像の読み込みに失敗: ${src}`));
    img.src = src;
  });
}

// 透明度を確保する画像ロード関数を改善
function loadImageWithTransparency(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // CORS対応
    
    img.onload = () => {
      // WebP画像の透明度を確保するためにキャンバスを使用
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d', { alpha: true });
      // 透明な背景でクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 画像を描画
      ctx.drawImage(img, 0, 0);
      
      // 白い背景を透明にする処理を追加
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // 白い背景（RGB値が高い）のピクセルを透明にする
      // しきい値を下げて、より多くの白っぽい色を透明にする
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 白に近い色を透明にする（しきい値を調整）
        if (r > 220 && g > 220 && b > 220) {
          data[i + 3] = 0; // アルファ値を0（完全透明）にする
        }
      }
      
      // 処理後の画像データを描画
      ctx.putImageData(imageData, 0, 0);
      
      // 新しい画像オブジェクトを作成
      const processedImg = new Image();
      processedImg.onload = () => resolve(processedImg);
      // PNG形式で透明度を保持
      processedImg.src = canvas.toDataURL('image/png');
    };
    
    img.onerror = (e) => reject(new Error(`画像の読み込みに失敗: ${src}`));
    img.src = src;
  });
}

/* ------------------------------------------------------------------ */
/*  JSON ローダ（データレイヤ）                                       */
/* ------------------------------------------------------------------ */

const DATA_BASE = '/data/';

/** すべてのゲームデータ JSON を一括ロード */
export async function loadAllGameData() {
  const files = ['kanji_g1_proto.json', 'enemies_proto.json', 'stages_proto.json'];
  const [kanji, enemy, stage] = await Promise.all(
    files.map(f => fetch(DATA_BASE + f).then(r => r.json()))
  );
  return { kanji, enemy, stage };
}

/**
 * 共通 UI 画像を進捗コールバック付きでまとめてロード
 * @param {(loaded:number, total:number)=>void} onProgress 
 * @returns {Promise<void>}
 */
export async function loadAll(onProgress) {
  // UI_IMAGE_PATHS は既存で定義済み
  const entries = Object.entries(UI_IMAGE_PATHS);
  const total = entries.length;
  let loadedCount = 0;
  // 初期進捗レポート (0/total)
  onProgress?.(loadedCount, total);

  for (const [key, src] of entries) {
    try {
      const img = await loadImage(src);
      images[key] = img;
    } catch {
      console.warn(`⚠️ ${src} の読み込み失敗`);
    }
    loadedCount++;
    onProgress?.(loadedCount, total);
  }
}
