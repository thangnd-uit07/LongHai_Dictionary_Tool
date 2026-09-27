'use strict';

/**
 * Chuẩn hóa tên file media (rename file theo _FormatName).
 *
 * Port từ Form1._RenameFiles (C#):
 *   - Duyệt qua `input/images/` và `input/sounds/{en,us,vi,fr}/`
 *   - Đổi tên từng file theo formatName(name) (giữ nguyên extension)
 *   - Nếu rename fail (file đích đã tồn tại) -> xóa file gốc
 *     (giống catch block của C#: `File.Delete(f.FullName)`)
 *
 * Sử dụng:
 *   node scripts/rename-files.js                   # dùng input/ mặc định
 *   node scripts/rename-files.js --dir input       # chỉ định thư mục input
 *   node scripts/rename-files.js --dry-run         # chỉ log, không thực sự rename
 *
 * Sau khi chạy xong, hãy chạy:
 *   node scripts/convert-png-to-jpg.js
 */

const fs = require('fs');
const path = require('path');
const { paths } = require('../src/config');
const { formatName } = require('../src/utils/fileNameUtils');

// Parse CLI args
function parseArgs(argv) {
  const args = { dir: paths.INPUT_DIR, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' || a === '-d') args.dir = path.resolve(argv[++i]);
    else if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/rename-files.js [options]');
      console.log('  --dir, -d <path>   Thư mục input (mặc định: input/)');
      console.log('  --dry-run, -n      Chỉ log, không rename thật');
      process.exit(0);
    }
  }
  return args;
}

function getTargetDirs(inputDir) {
  return [
    path.join(inputDir, 'images'),
    path.join(inputDir, 'sounds', 'en'),
    path.join(inputDir, 'sounds', 'us'),
    path.join(inputDir, 'sounds', 'vi'),
    path.join(inputDir, 'sounds', 'fr'),
  ];
}

/**
 * Rename 1 file trong folder.
 * Giống logic C#:
 *   try { File.Move(...) }
 *   catch { File.Delete(f.FullName) }
 *
 * Trả về: 'renamed' | 'deleted' | 'unchanged' | 'skipped'
 */
function processFile(file, dir, dryRun) {
  const oldFullPath = path.join(dir, file.name);
  const ext = file.ext; // vd '.png'
  const baseName = file.name.slice(0, -ext.length);

  const newBase = formatName(baseName);
  if (!newBase) return 'skipped'; // tên rỗng -> bỏ

  const newName = newBase + ext;

  // Tên giống cũ -> không làm gì
  if (newName === file.name) return 'unchanged';

  const newFullPath = path.join(dir, newName);

  if (dryRun) {
    console.log(`  [DRY] ${file.name} -> ${newName}`);
    return 'renamed';
  }

  try {
    // Kiểm tra đích đã tồn tại chưa (C# dùng File.Move sẽ throw IOException).
    if (fs.existsSync(newFullPath)) {
      // File đích đã tồn tại -> xóa file gốc (giống catch C#).
      fs.unlinkSync(oldFullPath);
      console.log(`  ✗ ${file.name} (target exists, deleted)`);
      return 'deleted';
    }
    fs.renameSync(oldFullPath, newFullPath);
    console.log(`  ✓ ${file.name} -> ${newName}`);
    return 'renamed';
  } catch (err) {
    // Fallback: xóa file gốc để tránh loop (giống C#).
    try { fs.unlinkSync(oldFullPath); } catch (_) {}
    console.log(`  ✗ ${file.name} (error: ${err.message}, deleted)`);
    return 'deleted';
  }
}

function processDir(dir, dryRun) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠ Không tồn tại: ${dir}`);
    return { total: 0, renamed: 0, deleted: 0, unchanged: 0, skipped: 0 };
  }

  const files = fs.readdirSync(dir)
    .filter((name) => fs.statSync(path.join(dir, name)).isFile())
    .map((name) => ({
      name,
      ext: path.extname(name).toLowerCase(),
    }))
    // Chỉ xử lý file có extension media (bỏ qua .DS_Store, .txt, etc.)
    .filter((f) => ['.png', '.jpg', '.jpeg', '.gif', '.mp3'].includes(f.ext));

  const stats = { total: files.length, renamed: 0, deleted: 0, unchanged: 0, skipped: 0 };

  for (const file of files) {
    const result = processFile(file, dir, dryRun);
    stats[result]++;
  }

  return stats;
}

function main() {
  const args = parseArgs(process.argv);

  console.log('🔄  Chuẩn hóa tên file media');
  console.log(`   📁 ${args.dir}`);
  if (args.dryRun) console.log('   🔍 Chế độ DRY RUN (không thay đổi file)');
  console.log('');

  const dirs = getTargetDirs(args.dir);
  let totalRenamed = 0;
  let totalDeleted = 0;
  let totalUnchanged = 0;
  let totalSkipped = 0;
  let totalFiles = 0;

  for (const dir of dirs) {
    console.log(`📂 ${path.relative(args.dir, dir) || '.'}`);
    const stats = processDir(dir, args.dryRun);
    totalRenamed += stats.renamed;
    totalDeleted += stats.deleted;
    totalUnchanged += stats.unchanged;
    totalSkipped += stats.skipped;
    totalFiles += stats.total;
    console.log(`   ${stats.total} files: ${stats.renamed} renamed, ${stats.deleted} deleted, ${stats.unchanged} unchanged`);
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`✅ Tổng: ${totalFiles} files`);
  console.log(`   ✓ Renamed:  ${totalRenamed}`);
  console.log(`   ✗ Deleted:  ${totalDeleted}`);
  console.log(`   = Unchanged: ${totalUnchanged}`);
  if (totalSkipped > 0) console.log(`   ? Skipped: ${totalSkipped}`);
  if (!args.dryRun && totalRenamed > 0) {
    console.log('\n💡 Tip: chạy tiếp `npm run convert` để convert PNG -> JPG.');
  }
}

// Cho phép gọi từ module khác (test) hoặc chạy trực tiếp.
if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

module.exports = { processDir, processFile, parseArgs };
