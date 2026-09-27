'use strict';

const fs = require('fs');
const path = require('path');
const { paths, mediaConfig } = require('./config');
const { formatName, removeBom } = require('./utils/fileNameUtils');

/**
 * Cache kết quả readdirSync + pre-compute index map {formatName(baseName) -> relativePath}.
 * Mỗi thư mục được index 1 lần, lookup sau đó O(1).
 *
 * Trước: mỗi word scan toàn bộ folder (14K+ files) → 125 triệu formatName calls.
 * Sau: pre-compute 1 lần, mỗi word chỉ 1 lookup O(1) → tăng tốc hàng nghìn lần.
 */
const dirCache = new Map();

/**
 * Build index cho 1 thư mục.
 * Trả về Map: { formatName(baseName) -> relativePath (so với INPUT_DIR) }
 * Nếu trùng tên (vd có cả abc.png và abc.jpg) thì giữ file đầu tiên theo
 * thứ tự readdir (ổn định trên cùng OS).
 */
function buildIndex(dir, allowedExts) {
  const index = new Map();
  if (!fs.existsSync(dir)) return index;

  const files = fs.readdirSync(dir);
  const allowedExtsLower = new Set(allowedExts.map((e) => e.toLowerCase()));

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!allowedExtsLower.has(ext)) continue;

    const baseName = file.slice(0, -ext.length);
    const key = formatName(baseName);
    if (!key) continue;

    // Chỉ set nếu chưa có (giữ file đầu tiên).
    if (!index.has(key)) {
      index.set(key, path.relative(paths.INPUT_DIR, path.join(dir, file)).replace(/\\/g, '/'));
    }
  }

  return index;
}

function getIndex(dir, allowedExts) {
  if (!dirCache.has(dir)) {
    dirCache.set(dir, buildIndex(dir, allowedExts));
  }
  return dirCache.get(dir);
}

/**
 * Tìm file media theo `baseName`. Trả về relative path hoặc null.
 * baseName là tên EN chưa format (vd "Bell's Palsy").
 */
function findMedia(dir, baseName, allowedExts) {
  if (!baseName) return null;
  const target = formatName(baseName);
  if (!target) return null;

  const index = getIndex(dir, allowedExts);
  return index.get(target) || null;
}

function resolveImage(nameEn) {
  const baseName = removeBom(nameEn);
  if (!baseName) return null;
  return findMedia(paths.IMAGES_DIR, baseName, mediaConfig.IMAGE_EXTENSIONS);
}

function resolveSound(nameEn, soundDir) {
  const baseName = removeBom(nameEn);
  if (!baseName) return null;
  return findMedia(soundDir, baseName, mediaConfig.AUDIO_EXTENSIONS);
}

/**
 * Resolve tất cả media (1 image + 4 sounds) cho 1 word.
 *
 * Theo logic C# gốc:
 *   - imagePath: CHỈ set khi file tồn tại; nếu không thì để trống (null)
 *   - soundEn/Us/Vi/Fr: LUÔN set path (kể cả khi file không tồn tại).
 *     App Flutter xử lý missing file runtime.
 */
function resolveWordMedia(nameEn) {
  const baseName = removeBom(nameEn);
  const fileName = formatName(baseName);

  const imageRel = resolveImage(nameEn);
  const soundEnRel = resolveSound(nameEn, paths.SOUNDS_EN_DIR);
  const soundUsRel = resolveSound(nameEn, paths.SOUNDS_US_DIR);
  const soundViRel = resolveSound(nameEn, paths.SOUNDS_VI_DIR);
  const soundFrRel = resolveSound(nameEn, paths.SOUNDS_FR_DIR);

  const imagePath = imageRel ? `images/${path.basename(imageRel)}` : null;

  // C# luôn set path dù file có hay không (giống Form1.cs dòng
  // `word.SoundEn = $"assets/sounds/en/{fileName}.mp3";`). Giữ logic này để
  // tương thích với Flutter app.
  const soundEn = fileName ? `sounds/en/${fileName}.mp3` : null;
  const soundUs = fileName ? `sounds/us/${fileName}.mp3` : null;
  const soundVi = fileName ? `sounds/vi/${fileName}.mp3` : null;
  const soundFr = fileName ? `sounds/fr/${fileName}.mp3` : null;

  return {
    imagePath,
    soundEn,
    soundUs,
    soundVi,
    soundFr,
    _noImage: !imagePath,
    _noSoundEn: !soundEnRel,
    _noSoundUs: !soundUsRel,
    _noSoundVi: !soundViRel,
    _noSoundFr: !soundFrRel,
  };
}

/**
 * Clear cache (dùng khi cần test nhiều lần hoặc file thay đổi).
 */
function clearCache() {
  dirCache.clear();
}

module.exports = {
  resolveImage,
  resolveSound,
  resolveWordMedia,
  clearCache,
};
