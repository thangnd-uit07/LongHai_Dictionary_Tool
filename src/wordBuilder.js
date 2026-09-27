'use strict';

const { removeVietnameseSigns } = require('./utils/textUtils');
const { removeBom } = require('./utils/fileNameUtils');
const { resolveWordMedia } = require('./mediaResolver');

/**
 * Port từ Form1._importWords (C#).
 *
 * Build danh sách Word records từ raw rows + sys_types map.
 *
 * Quy trình giống C#:
 *   1. Lấy nameEn, nameVi, nameFr, imageSource, meaningEn, meaningVi, term,
 *      flashCardVi, sysType từ row.
 *   2. Format file name từ nameEn (bỏ dấu/ký tự đặc biệt, lower-case).
 *   3. Tìm image file (.jpeg > .jpg > .png > .gif). Nếu có -> imagePath.
 *      Nếu không -> imagePath = null.
 *   4. Luôn set soundEn/Us/Vi/Fr path (kể cả khi file không tồn tại).
 *   5. Parse sysType -> lookup sys_types map để lấy sysTypeEn, sysTypeVi.
 *   6. isActive = 1.
 *
 * @param {Array<Object>} rows         - Rows từ excelReader (theo WORDS_FORMAT).
 * @param {Map<number,{en:string,vi:string}>} sysTypeMap - Map id -> sysType info.
 * @returns {{words: Array<Object>, stats: object}}
 */
function buildWords(rows, sysTypeMap) {
  const words = [];
  const missing = {
    images: [],
    soundEn: [],
    soundUs: [],
    soundVi: [],
    soundFr: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Bỏ BOM (giống RemoveBom trong C#).
    const nameEn = removeBom(row.nameEn);
    const nameVi = removeBom(row.nameVi);
    const nameFr = removeBom(row.nameFr || '');

    const word = {
      id: i + 1, // C#: `var word = new Word { Id = i + 1, ... }`
      nameEn,
      nameVi,
      nameFr,
      meaningEn: removeBom(row.meaningEn),
      meaningVi: removeBom(row.meaningVi),
      imageSource: removeBom(row.imageSource),
      ipa: '', // C# hard-code Ipa = ""
      term: removeBom(row.term),
      flashCardVi: removeBom(row.flashCardVi),
      isActive: 1,
    };

    // Resolve media (image + 4 sounds).
    const media = resolveWordMedia(nameEn);
    word.imagePath = media.imagePath;
    word.soundEn = media.soundEn;
    word.soundUs = media.soundUs;
    word.soundVi = media.soundVi;
    word.soundFr = media.soundFr;

    // Track missing media cho log (giống _noImages, _noSoundEn lists trong C#).
    if (media._noImage && nameEn) missing.images.push(`${i + 1}-${nameEn}`);
    if (media._noSoundEn && nameEn) missing.soundEn.push(`${i + 1}-${nameEn}`);
    if (media._noSoundUs && nameEn) missing.soundUs.push(`${i + 1}-${nameEn}`);
    if (media._noSoundVi && nameEn) missing.soundVi.push(`${i + 1}-${nameEn}`);
    if (media._noSoundFr && nameEn) missing.soundFr.push(`${i + 1}-${nameEn}`);

    // sysType parsing (giống C#).
    const parsed = parseInt(row.sysType, 10);
    word.sysType = Number.isFinite(parsed) ? parsed : 0;

    // Lookup sysTypeEn, sysTypeVi.
    const sysType = sysTypeMap.get(word.sysType);
    if (sysType) {
      word.sysTypeEn = sysType.en;
      word.sysTypeVi = sysType.vi;
    } else {
      word.sysTypeEn = '';
      word.sysTypeVi = '';
    }

    words.push(word);
  }

  return { words, missing };
}

/**
 * Build sys_types list từ raw rows.
 * C#: db.InsertSysType với sysType.Id từ row.id (int.Parse).
 */
function buildSysTypes(rows) {
  return rows.map((r) => ({
    id: parseInt(r.id, 10) || 0,
    en: removeBom(r.en),
    vi: removeBom(r.vi),
  })).filter((s) => s.id > 0);
}

module.exports = {
  buildWords,
  buildSysTypes,
};
