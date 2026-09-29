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
 *
 * Bảng phụ (do app Android/Flutter quản lý runtime, tạo rỗng ở đây):
 *   - history(id, nameEn, nameVi, nameFr, term, flashCardVi,
 *             soundEn, soundUs, soundVi,
 *             sysType, sysTypeEn, sysTypeVi, created)
 *   - folders(id, name UNIQUE)
 *   - folder_words(folderId, wordId)
 */
const SCHEMA_SQL = [
  // DROP (giữ thứ tự an toàn: drop bảng phụ trước nếu có FK, ở đây không có)
  'DROP TABLE IF EXISTS sys_types;',
  'DROP TABLE IF EXISTS words;',
  'DROP TABLE IF EXISTS virtual_words_en;',
  'DROP TABLE IF EXISTS virtual_words_vi;',
  'DROP TABLE IF EXISTS history;',
  'DROP TABLE IF EXISTS folders;',
  'DROP TABLE IF EXISTS folder_words;',

  // === Bảng chính ===
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

  // === Bảng FTS4 (full-text search) ===
  `CREATE VIRTUAL TABLE virtual_words_en USING FTS4(id, nameEn, unsignName, sysType, text, isActive);`,
  `CREATE VIRTUAL TABLE virtual_words_vi USING FTS4(id, nameVi, unsignName, sysType, text, isActive);`,

  // === Bảng phụ (tạo rỗng, do app Android/Flutter quản lý runtime) ===
  // History: lịch sử tra từ của user
  `CREATE TABLE history(
    id INTEGER PRIMARY KEY,
    nameEn TEXT,
    nameVi TEXT,
    nameFr TEXT,
    term TEXT,
    flashCardVi TEXT,
    soundEn TEXT,
    soundUs TEXT,
    soundVi TEXT,
    sysType INTEGER,
    sysTypeEn TEXT,
    sysTypeVi TEXT,
    created INTEGER
  );`,

  // Folders: các folder chứa danh sách từ (cho chức năng ôn tập / favorites)
  `CREATE TABLE folders(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE
  );`,

  // Folder_words: quan hệ many-to-many giữa folder và word
  // (C# gốc có typo "Integrer" -> sửa lại thành INTEGER cho đúng cú pháp SQLite)
  `CREATE TABLE folder_words(
    folderId INTEGER,
    wordId INTEGER
  );`,
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

// Lưu ý: FTS4 virtual tables trong SQLite KHÔNG tôn trọng type affinity —
// nếu bind integer thẳng, SQLite sẽ lưu thành REAL (double), khiến Flutter
// (sqflite/drift) báo "type 'double' is not a subtype of type 'int'".
// -> Phải dùng CAST(? AS INTEGER) để ép kiểu rõ ràng lúc INSERT.
// C# gốc (System.Data.SQLite) tự ép kiểu đúng khi binding parameter,
// nên khi port sang Node.js phải fix bằng CAST.
const INSERT_VIRTUAL_EN = `
  INSERT INTO virtual_words_en (id, nameEn, unsignName, sysType, text, isActive)
  VALUES (CAST(? AS INTEGER), ?, ?, CAST(? AS INTEGER), ?, CAST(? AS INTEGER));
`;

const INSERT_VIRTUAL_VI = `
  INSERT INTO virtual_words_vi (id, nameVi, unsignName, sysType, text, isActive)
  VALUES (CAST(? AS INTEGER), ?, ?, CAST(? AS INTEGER), ?, CAST(? AS INTEGER));
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
