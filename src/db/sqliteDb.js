'use strict';

/**
 * Sử dụng node:sqlite (built-in từ Node.js >= 22.5).
 * Cần chạy với flag --experimental-sqlite.
 *
 * So sánh với better-sqlite3:
 *  - Không cần compile native module -> cài đặt đơn giản hơn
 *  - API tương tự (prepare, run, get, all)
 *  - Hỗ trợ đầy đủ FTS4 virtual table
 */
const { DatabaseSync: Database } = require('node:sqlite');

/**
 * Schema SQLite port từ sqlite/SqliteDb.cs (C#).
 *
 * Bảng chính:
 *   - sys_types(id, en, vi)
 *   - words(id, nameEn, nameVi, nameFr, meaningEn, meaningVi,
 *           imagePath, imageSource, ipa,
 *           soundEn, soundUs, soundVi, soundFr,
 *           term, flashCardVi, sysType, sysTypeEn, sysTypeVi, isActive)
 *
 * Bảng FTS4 cho full-text search:
 *   - virtual_words_en(id, nameEn, unsignName, sysType, text, isActive)
 *   - virtual_words_vi(id, nameVi, unsignName, sysType, text, isActive)
 */
const SCHEMA_SQL = [
  'DROP TABLE IF EXISTS sys_types;',
  'DROP TABLE IF EXISTS words;',
  'DROP TABLE IF EXISTS virtual_words_en;',
  'DROP TABLE IF EXISTS virtual_words_vi;',

  `CREATE TABLE sys_types(
    id INTEGER PRIMARY KEY,
    en TEXT,
    vi TEXT
  );`,

  `CREATE TABLE words(
    id INTEGER PRIMARY KEY,
    nameEn TEXT,
    nameVi TEXT,
    nameFr TEXT,
    meaningEn TEXT,
    meaningVi TEXT,
    imagePath TEXT,
    imageSource TEXT,
    ipa TEXT,
    soundEn TEXT,
    soundUs TEXT,
    soundVi TEXT,
    soundFr TEXT,
    term TEXT,
    flashCardVi TEXT,
    sysType INTEGER,
    sysTypeEn TEXT,
    sysTypeVi TEXT,
    isActive INTEGER
  );`,

  `CREATE VIRTUAL TABLE virtual_words_en USING FTS4(id, nameEn, unsignName, sysType, text, isActive);`,
  `CREATE VIRTUAL TABLE virtual_words_vi USING FTS4(id, nameVi, unsignName, sysType, text, isActive);`,
].join('\n');

const INSERT_SYS_TYPE = `
  INSERT INTO sys_types (id, en, vi) VALUES (?, ?, ?);
`;

const INSERT_WORD = `
  INSERT INTO words (
    id, nameEn, nameVi, nameFr, meaningEn, meaningVi,
    imagePath, imageSource, ipa,
    soundEn, soundUs, soundVi, soundFr,
    term, flashCardVi, sysType, sysTypeEn, sysTypeVi, isActive
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
`;

const INSERT_VIRTUAL_EN = `
  INSERT INTO virtual_words_en (id, nameEn, unsignName, sysType, text, isActive)
  VALUES (?, ?, ?, ?, ?, ?);
`;

const INSERT_VIRTUAL_VI = `
  INSERT INTO virtual_words_vi (id, nameVi, unsignName, sysType, text, isActive)
  VALUES (?, ?, ?, ?, ?, ?);
`;

/**
 * Tạo schema mới trên một database connection.
 */
function createSchema(db) {
  db.exec(SCHEMA_SQL);
}

module.exports = {
  SCHEMA_SQL,
  createSchema,
  INSERT_SYS_TYPE,
  INSERT_WORD,
  INSERT_VIRTUAL_EN,
  INSERT_VIRTUAL_VI,
};
