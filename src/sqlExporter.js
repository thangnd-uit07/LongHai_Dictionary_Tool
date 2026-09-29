'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync: Database } = require('node:sqlite');
const { paths } = require('./config');
const {
  createSchema,
  INSERT_SYS_TYPE,
  INSERT_WORD,
  INSERT_VIRTUAL_EN,
  INSERT_VIRTUAL_VI,
} = require('./db/sqliteDb');
const { removeVietnameseSigns, createWordFts } = require('./utils/textUtils');

/**
 * Xuất dữ liệu ra file SQLite binary (.db) — tương thích với app Flutter
 * hiện tại (port từ sqlite/SqliteDb.cs của C# ExcelToDb).
 *
 * @param {Object}   data
 * @param {Array}    data.sysTypes  - [{id, en, vi}, ...]
 * @param {Array}    data.words     - [{id, nameEn, nameVi, nameFr, meaningEn, meaningVi,
 *                                     imagePath, imageSource, ipa,
 *                                     soundEn, soundUs, soundVi, soundFr,
 *                                     term, flashCardVi, sysType, sysTypeEn, sysTypeVi, isActive}, ...]
 * @param {string}  [outputPath]
 * @returns {string} Đường dẫn file .db đã tạo.
 */
function exportToDb(data, outputPath = paths.DB_FILE) {
  const { sysTypes = [], words = [] } = data;

  // Đảm bảo thư mục output tồn tại.
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Xóa file cũ để tránh conflict (giống C# DROP TABLE IF EXISTS).
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const db = new Database(outputPath);

  try {
    createSchema(db);

    const insertSysType = db.prepare(INSERT_SYS_TYPE);
    const insertWord = db.prepare(INSERT_WORD);
    const insertVirtEn = db.prepare(INSERT_VIRTUAL_EN);
    const insertVirtVi = db.prepare(INSERT_VIRTUAL_VI);

    // Wrap insert trong 1 transaction để tăng tốc và đảm bảo all-or-nothing.
    db.exec('BEGIN');
    try {
      // 1) sys_types
      for (const s of sysTypes) {
        insertSysType.run(parseInt(s.id, 10) || 0, s.en || '', s.vi || '');
      }

      // 2) words + 2 bảng FTS
      for (const w of words) {
        // Ép kiểu integer cho các cột INTEGER (defensive):
        // - sysType/isActive có thể null/undefined từ Excel
        // - id từ wordBuilder.js đã là integer nhưng ép lại cho an toàn
        const wordId = parseInt(w.id, 10) || 0;
        const sysType = parseInt(w.sysType, 10) || 0;
        const isActive = parseInt(w.isActive ?? 1, 10) || 1;

        insertWord.run(
          wordId,
          w.nameEn || '',
          w.nameVi || '',
          w.nameFr || '',
          w.meaningEn || '',
          w.meaningVi || '',
          w.imagePath || null,
          w.imageSource || '',
          w.ipa || '',
          w.soundEn || null,
          w.soundUs || null,
          w.soundVi || null,
          w.soundFr || null,
          w.term || '',
          w.flashCardVi || '',
          sysType,
          w.sysTypeEn || '',
          w.sysTypeVi || '',
          isActive,
        );

        // virtual_words_en
        const nameEn = w.nameEn || '';
        const unsignEn = removeVietnameseSigns(nameEn);
        insertVirtEn.run(
          wordId,
          nameEn,
          unsignEn,
          sysType,
          createWordFts(nameEn) + ' ' + createWordFts(unsignEn),
          isActive,
        );

        // virtual_words_vi
        const nameVi = w.nameVi || '';
        const unsignVi = removeVietnameseSigns(nameVi);
        insertVirtVi.run(
          wordId,
          nameVi,
          unsignVi,
          sysType,
          createWordFts(nameVi) + ' ' + createWordFts(unsignVi),
          isActive,
        );
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    // Đóng để flush xuống file.
    db.close();

    // Xóa các file phụ (WAL, SHM) để app Flutter đọc trực tiếp file .db
    // mà không cần merge.
    const walFile = outputPath + '-wal';
    const shmFile = outputPath + '-shm';
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  } catch (err) {
    try { db.close(); } catch (_) {}
    throw err;
  }

  return outputPath;
}

module.exports = {
  exportToDb,
};
