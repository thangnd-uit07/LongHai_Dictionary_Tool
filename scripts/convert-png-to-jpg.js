'use strict';

/**
 * Convert TẤT CẢ file ảnh (PNG/JPEG/GIF/WEBP/BMP/TIFF) trong `input/images/`
 * sang JPG.
 *
 * Hành vi:
 *   - Quét tất cả file có extension thuộc IMAGE_INPUT_EXTS (PNG, JPEG, GIF,
 *     WEBP, BMP, TIFF).
 *   - Với mỗi file nguồn, convert thành JPG cùng baseName.
 *   - Mặc định XÓA file gốc sau khi convert thành công (deleteSource = true).
 *
 * Quy tắc xử lý trùng tên:
 *   - Nếu file nguồn đã là .jpg/.jpeg → bỏ qua (không xóa, vì nó là đích).
 *   - Nếu JPG đích đã tồn tại sẵn:
 *       + Giữ nguyên JPG có sẵn (không re-encode).
 *       + Xóa file nguồn để khỏi rác folder.
 *
 * Sử dụng:
 *   node scripts/convert-png-to-jpg.js                     # convert + xóa gốc (mặc định)
 *   node scripts/convert-png-to-jpg.js --keep-source       # convert, giữ file gốc
 *   node scripts/convert-png-to-jpg.js --dir input         # chỉ định thư mục input
 *   node scripts/convert-png-to-jpg.js --quality 90        # chỉnh JPG quality (1-100)
 *   node scripts/convert-png-to-jpg.js --dry-run           # chỉ log, không ghi file
 *
 * Lưu ý: `npm start` đã tự động gọi script này, không cần chạy tay.
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const { paths } = require('../src/config');

// Tất cả định dạng ảnh đầu vào sẽ được convert sang JPG.
const IMAGE_INPUT_EXTS = ['.png', '.jpeg', '.jpg', '.gif', '.webp', '.bmp', '.tiff', '.tif'];
// JPG/JPEG: file nguồn đã là đích → skip.
const JPG_EXTS = new Set(['.jpg', '.jpeg']);

function parseArgs(argv) {
  const args = {
    dir: paths.INPUT_DIR,
    deleteSource: true,   // mặc định xóa file gốc sau khi convert
    dryRun: false,
    quality: 90,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' || a === '-d') args.dir = path.resolve(argv[++i]);
    else if (a === '--keep-source') args.deleteSource = false;
    else if (a === '--delete-source') args.deleteSource = true;
    else if (a === '--delete-png') args.deleteSource = true; // backward-compat
    else if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--quality' || a === '-q') args.quality = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/convert-png-to-jpg.js [options]');
      console.log('  --dir, -d <path>     Thư mục input (mặc định: input/)');
      console.log('  --keep-source        Giữ file gốc sau khi convert (mặc định: xóa)');
      console.log('  --delete-source      Xóa file gốc sau khi convert (mặc định)');
      console.log('  --quality, -q <1-100> Chất lượng JPG (mặc định: 90)');
      console.log('  --dry-run, -n        Chỉ log, không ghi file');
      process.exit(0);
    }
  }
  return args;
}

async function convertToJpg(srcPath, dstPath, quality, dryRun) {
  if (dryRun) {
    return { ok: true, dryRun: true };
  }
  // Jimp đọc file ảnh (PNG/JPEG/GIF/WEBP/BMP/TIFF) -> write JPG.
  // JPG không hỗ trợ alpha -> thay bằng background trắng.
  const image = await Jimp.read(srcPath);
  image.background(0xffffffff);
  image.quality(quality);
  await image.writeAsync(dstPath);
  return { ok: true };
}

async function processDir(imagesDir, options) {
  if (!fs.existsSync(imagesDir)) {
    console.log(`⚠ Không tồn tại: ${imagesDir}`);
    return { total: 0, converted: 0, skipped: 0, failed: 0, deleted: 0 };
  }

  const files = fs.readdirSync(imagesDir)
    .filter((name) => {
      const full = path.join(imagesDir, name);
      return fs.statSync(full).isFile();
    })
    // Lấy mọi file có extension thuộc IMAGE_INPUT_EXTS (case-insensitive).
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return IMAGE_INPUT_EXTS.includes(ext);
    });

  const stats = {
    total: files.length,
    converted: 0,
    skipped: 0,
    failed: 0,
    deleted: 0,
  };

  for (const name of files) {
    const srcPath = path.join(imagesDir, name);
    const ext = path.extname(name).toLowerCase();
    const baseName = name.slice(0, -ext.length);
    const dstName = baseName + '.jpg';
    const dstPath = path.join(imagesDir, dstName);

    // Case 1: File nguồn đã là JPG/JPEG → không cần convert.
    if (JPG_EXTS.has(ext)) {
      console.log(`  ⏭ ${name} (đã là JPG, bỏ qua)`);
      stats.skipped++;
      continue;
    }

    // Case 2: JPG đích đã tồn tại sẵn → giữ JPG, xóa file nguồn.
    if (fs.existsSync(dstPath)) {
      console.log(`  ⏭ ${name} -> ${dstName} (jpg exists, keeping existing jpg)`);
      stats.skipped++;
      if (options.deleteSource && !options.dryRun) {
        try {
          fs.unlinkSync(srcPath);
          stats.deleted++;
          console.log(`    🗑️ Deleted ${name}`);
        } catch (err) {
          console.log(`    ⚠ Cannot delete ${name}: ${err.message}`);
        }
      }
      continue;
    }

    // Case 3: Convert bình thường.
    try {
      const result = await convertToJpg(srcPath, dstPath, options.quality, options.dryRun);
      if (result.dryRun) {
        console.log(`  [DRY] ${name} -> ${dstName}`);
      } else {
        console.log(`  ✓ ${name} -> ${dstName}`);
      }
      stats.converted++;

      // Xóa file gốc sau khi convert thành công (mặc định).
      if (options.deleteSource && !options.dryRun) {
        try {
          fs.unlinkSync(srcPath);
          stats.deleted++;
          console.log(`    🗑️ Deleted ${name}`);
        } catch (err) {
          console.log(`    ⚠ Cannot delete ${name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  ✗ ${name} (${err.message})`);
      stats.failed++;
    }
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv);
  const imagesDir = path.join(args.dir, 'images');

  console.log('🖼️   Convert ảnh -> JPG');
  console.log(`   📁 ${imagesDir}`);
  console.log(`   🎚️  Quality: ${args.quality}`);
  console.log(`   🗑️  Delete source after convert: ${args.deleteSource ? 'YES' : 'NO'}`);
  if (args.dryRun) console.log('   🔍 Chế độ DRY RUN (không ghi file)');
  console.log('');

  const stats = await processDir(imagesDir, args);

  console.log('');
  console.log('─'.repeat(60));
  console.log(`✅ Tổng: ${stats.total} files`);
  console.log(`   ✓ Converted: ${stats.converted}`);
  console.log(`   ⏭ Skipped:   ${stats.skipped}`);
  console.log(`   ✗ Failed:    ${stats.failed}`);
  if (stats.deleted > 0) console.log(`   🗑️ Deleted:  ${stats.deleted}`);

  if (!args.dryRun && stats.failed > 0) {
    console.log('\n💡 Có file convert lỗi, kiểm tra lại định dạng hoặc dung lượng file.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Lỗi:', err.message);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  });
}

module.exports = { processDir, convertToJpg, parseArgs };
