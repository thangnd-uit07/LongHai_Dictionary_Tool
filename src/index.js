'use strict';

const fs = require('fs');
const path = require('path');
const { readExcel } = require('./excelReader');
const { paths, SYS_TYPES_FORMAT, WORDS_FORMAT } = require('./config');
const { buildWords, buildSysTypes } = require('./wordBuilder');
const { exportToDb } = require('./sqlExporter');

/**
 * Kiểm tra input có đầy đủ file cần thiết không.
 * Trả về danh sách lỗi (rỗng nếu OK).
 */
function validateInputs() {
  const errors = [];
  const warnings = [];

  // Check thư mục input
  if (!fs.existsSync(paths.INPUT_DIR)) {
    errors.push({
      msg: `Thư mục input/ không tồn tại: ${paths.INPUT_DIR}`,
      fix: `Tạo thư mục input/ và copy dữ liệu vào.`,
    });
    return { errors, warnings }; // không check thêm nếu input/ không tồn tại
  }

  // Check file Excel
  if (!fs.existsSync(paths.SYS_TYPES_XLSX)) {
    errors.push({
      msg: `Không tìm thấy file: ${paths.SYS_TYPES_XLSX}`,
      fix: `Copy file Excel chuyên ngành vào input/sys_types.xlsx\n       (vd: HeThongCoThe-20210426.xlsx từ project C#).`,
    });
  }
  if (!fs.existsSync(paths.WORDS_XLSX)) {
    errors.push({
      msg: `Không tìm thấy file: ${paths.WORDS_XLSX}`,
      fix: `Copy file Excel từ vựng vào input/words.xlsx (vd: ENT.xlsx).`,
    });
  }

  // Check folders media (warning only - tool vẫn chạy được nếu thiếu)
  for (const [name, dir] of [
    ['images/', paths.IMAGES_DIR],
    ['sounds/en/', paths.SOUNDS_EN_DIR],
    ['sounds/us/', paths.SOUNDS_US_DIR],
    ['sounds/vi/', paths.SOUNDS_VI_DIR],
    ['sounds/fr/', paths.SOUNDS_FR_DIR],
  ]) {
    if (!fs.existsSync(dir)) {
      warnings.push(`Thiếu thư mục: ${name} (ảnh/âm thanh sẽ là NULL trong DB)`);
    }
  }

  return { errors, warnings };
}

function printValidationReport({ errors, warnings }) {
  if (errors.length === 0 && warnings.length === 0) return;

  console.log('');

  if (errors.length > 0) {
    console.log('❌  Phát hiện lỗi:');
    for (let i = 0; i < errors.length; i++) {
      const e = errors[i];
      console.log(`   ${i + 1}. ${e.msg}`);
      if (e.fix) {
        console.log(`      💡 ${e.fix}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('⚠️  Cảnh báo:');
    for (const w of warnings) {
      console.log(`   - ${w}`);
    }
  }

  console.log('');
  console.log('   📖 Xem README.md để biết cấu trúc thư mục input/ chuẩn.');
  console.log('');
}

/**
 * Entry point chính của tool - port từ Form1.cs (C#).
 *
 * Flow:
 *   1. Validate input (Excel files + media folders)
 *   2. Đọc file sys_types.xlsx -> insert vào bảng sys_types
 *   3. Đọc file words.xlsx -> build Word records (resolve media)
 *   4. Xuất file SQLite binary (application.db) cho Flutter app
 */
async function main() {
  const t0 = Date.now();

  console.log('🔍  Validate input...');
  const validation = validateInputs();
  printValidationReport(validation);
  if (validation.errors.length > 0) {
    process.exit(1);
  }
  if (validation.warnings.length === 0) {
    console.log('   ✓ Input OK\n');
  }

  console.log('📖  Đọc file sys_types (BodySystem)...');
  const sysTypesRaw = readExcel(paths.SYS_TYPES_XLSX, SYS_TYPES_FORMAT);
  const sysTypes = buildSysTypes(sysTypesRaw.rows);
  console.log(`   ✓ ${sysTypes.length} sys_types`);

  // Build map: id -> sysType info (lookup nhanh cho mỗi word).
  const sysTypeMap = new Map(sysTypes.map((s) => [s.id, s]));

  console.log('\n📖  Đọc file words...');
  const wordsRaw = readExcel(paths.WORDS_XLSX, WORDS_FORMAT);
  console.log(`   ✓ ${wordsRaw.rows.length} dòng`);

  console.log('\n🖼️   Resolve media (hình ảnh + âm thanh)...');
  const { words, missing } = buildWords(wordsRaw.rows, sysTypeMap);
  console.log(`   ✓ Đã resolve media cho ${words.length} từ`);
  console.log(`   ⚠  Thiếu image: ${missing.images.length}`);
  console.log(`   ⚠  Thiếu soundEn: ${missing.soundEn.length}`);
  console.log(`   ⚠  Thiếu soundUs: ${missing.soundUs.length}`);
  console.log(`   ⚠  Thiếu soundVi: ${missing.soundVi.length}`);
  console.log(`   ⚠  Thiếu soundFr: ${missing.soundFr.length}`);

  console.log('\n💾  Xuất file application.db...');
  const dbPath = exportToDb({ sysTypes, words }, paths.DB_FILE);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  console.log(`\n✅  Hoàn tất! (${elapsed}s)`);
  console.log(`   📁 ${dbPath}`);

  // Log chi tiết missing media (giống C# cuối method).
  const logMissing = (label, items) => {
    if (items.length === 0) return;
    console.log(`\n>>>>>>>>>>>>>>>>>>>> NO ${label}`);
    for (const item of items) console.log(item);
  };

  // Chỉ log nếu số lượng vừa phải để tránh spam console.
  const MAX_LOG = 50;
  const trimmedLog = (items) => (items.length <= MAX_LOG ? items : items.slice(0, MAX_LOG));

  logMissing('IMAGES', trimmedLog(missing.images));
  logMissing('SOUND EN', trimmedLog(missing.soundEn));
  logMissing('SOUND US', trimmedLog(missing.soundUs));
  logMissing('SOUND VI', trimmedLog(missing.soundVi));
}

// Chỉ chạy khi file này được gọi trực tiếp (node src/index.js).
if (require.main === module) {
  main().catch((err) => {
    console.error('\n❌  Lỗi:', err.message);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  });
}

module.exports = { main, validateInputs };
