'use strict';

const path = require('path');

/**
 * Cấu hình cho tool ExcelToDb (port từ C# ExcelUtils).
 *
 * Mapping cột Excel được lấy nguyên từ file JSON trong project C#:
 *   - DictionaryTableFormat.json  -> WORDS_FORMAT
 *   - BodySystemFormat.json      -> SYS_TYPES_FORMAT
 *
 * Index trong các format này bắt đầu từ 1 (giống C# code ban đầu).
 */

const ROOT_DIR = path.resolve(__dirname, '..');

const paths = {
  ROOT_DIR,
  INPUT_DIR: path.join(ROOT_DIR, 'input'),
  OUTPUT_DIR: path.join(ROOT_DIR, 'output'),

  // File Excel inputs (giống C#: body system cố định + words do user cung cấp).
  // Trong Node.js không có UI, nên quy ước tên file cố định.
  SYS_TYPES_XLSX: path.join(ROOT_DIR, 'input', 'sys_types.xlsx'),
  WORDS_XLSX: path.join(ROOT_DIR, 'input', 'words.xlsx'),

  // Media
  IMAGES_DIR: path.join(ROOT_DIR, 'input', 'images'),
  SOUNDS_EN_DIR: path.join(ROOT_DIR, 'input', 'sounds', 'en'),
  SOUNDS_US_DIR: path.join(ROOT_DIR, 'input', 'sounds', 'us'),
  SOUNDS_VI_DIR: path.join(ROOT_DIR, 'input', 'sounds', 'vi'),
  SOUNDS_FR_DIR: path.join(ROOT_DIR, 'input', 'sounds', 'fr'),

  // Output
  DB_FILE: path.join(ROOT_DIR, 'output', 'application.db'),
};

/**
 * Format cho body system file (HeThongCoThe-...xlsx từ C#).
 * Index: 1-based, giống C# code gốc.
 */
const SYS_TYPES_FORMAT = {
  sheetName: null,
  // Skip row đầu tiên (header), giống C#: `for (var rowIndex = 1; ...)`
  skipHeaderRow: true,
  // Khai báo cột giống BodySystemFormat.json
  columns: [
    { key: 'id', index: 0 },
    { key: 'vi', index: 1 },
    { key: 'en', index: 2 },
  ],
};

/**
 * Format cho words file (ENT.xlsx từ C#).
 * Index: 1-based, lấy từ DictionaryTableFormat.json.
 */
const WORDS_FORMAT = {
  sheetName: null,
  skipHeaderRow: true,
  columns: [
    { key: 'nameEn', index: 1 },
    { key: 'nameVi', index: 2 },
    { key: 'term', index: 3 },
    { key: 'imageSource', index: 4 },
    { key: 'meaningEn', index: 5 },
    { key: 'meaningVi', index: 6 },
    { key: 'sysType', index: 7 },
    { key: 'hasTerm', index: 8 },
    { key: 'flashCardVi', index: 9 },
    { key: 'nameFr', index: 10 },
  ],
};

const mediaConfig = {
  IMAGE_EXTENSIONS: ['.jpeg', '.jpg', '.png', '.gif'],
  AUDIO_EXTENSIONS: ['.mp3'],
};

module.exports = {
  paths,
  SYS_TYPES_FORMAT,
  WORDS_FORMAT,
  mediaConfig,
};
