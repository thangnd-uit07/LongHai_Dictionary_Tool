'use strict';

/**
 * Convert tất cả file PNG trong thư mục hình ảnh sang JPG.
 *
 * Port từ Form1.btnConvertImages_Click (C#):
 *   - Dùng SixLabors.ImageSharp load PNG, save thành JPEG cùng tên
 *   - Mặc định KHÔNG xóa file PNG gốc (giống C#)
 *   - Có flag --delete-png để xóa PNG sau khi convert thành công
 *
 * Sử dụng:
 *   node scripts/convert-png-to-jpg.js                     # chỉ convert (giữ PNG)
 *   node scripts/convert-png-to-jpg.js --delete-png        # convert rồi xóa PNG
 *   node scripts/convert-png-to-jpg.js --dir input         # chỉ định thư mục input
 *   node scripts/convert-png-to-jpg.js --quality 90        # chỉnh JPG quality (1-100)
 *   node scripts/convert-png-to-jpg.js --dry-run           # chỉ log
 *
 * Sau khi chạy xong, chạy tiếp `npm start` để tạo application.db.
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const { paths } = require('../src/config');

function parseArgs(argv) {
  const args = {
    dir: paths.INPUT_DIR,
    deletePng: false,
    dryRun: false,
    quality: 90,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' || a === '-d') args.dir = path.resolve(argv[++i]);
    else if (a === '--delete-png') args.deletePng = true;
    else if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--quality' || a === '-q') args.quality = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/convert-png-to-jpg.js [options]');
      console.log('  --dir, -d <path>     Thư mục input (mặc định: input/)');
      console.log('  --delete-png         Xóa file PNG sau khi convert thành công');
      console.log('  --quality, -q <1-100> Chất lượng JPG (mặc định: 90)');
      console.log('  --dry-run, -n        Chỉ log, không ghi file');
      process.exit(0);
    }
  }
  return args;
}

async function convertPngToJpg(srcPath, dstPath, quality, dryRun) {
  if (dryRun) {
    return { ok: true, dryRun: true };
  }
  // Jimp đọc file PNG (decode alpha nếu có) -> write JPG.
  // background mặc định là đen, có thể thêm .background(0xffffffff) nếu cần.
  const image = await Jimp.read(srcPath);
  // JPG không hỗ trợ alpha -> thay bằng background trắng.
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
    // Chỉ lấy file PNG. Lưu ý: ảnh PNG bắt đầu bằng '.PNG' (uppercase)
    // vẫn được hỗ trợ - lọc case-insensitive nhưng giữ tên gốc.
    .filter((name) => /\.png$/i.test(name));

  const stats = {
    total: files.length,
    converted: 0,
    skipped: 0,
    failed: 0,
    deleted: 0,
  };

  for (const name of files) {
    const srcPath = path.join(imagesDir, name);
    const dstName = name.replace(/\.png$/i, '.jpg');
    const dstPath = path.join(imagesDir, dstName);

    // Nếu JPG đích đã tồn tại -> skip (giống C# SaveAsJpeg throw sẽ bị catch)
    if (fs.existsSync(dstPath)) {
      console.log(`  ⏭ ${name} -> ${dstName} (jpg exists, skipped)`);
      stats.skipped++;
      continue;
    }

    try {
      const result = await convertPngToJpg(srcPath, dstPath, options.quality, options.dryRun);
      if (result.dryRun) {
        console.log(`  [DRY] ${name} -> ${dstName}`);
      } else {
        console.log(`  ✓ ${name} -> ${dstName}`);
      }
      stats.converted++;

      // Xóa PNG nếu được yêu cầu.
      if (options.deletePng && !options.dryRun) {
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

  console.log('🖼️   Convert PNG -> JPG');
  console.log(`   📁 ${imagesDir}`);
  console.log(`   🎚️  Quality: ${args.quality}`);
  if (args.deletePng) console.log('   🗑️  Will DELETE PNG after convert');
  if (args.dryRun) console.log('   🔍 Chế độ DRY RUN (không ghi file)');
  console.log('');

  const stats = await processDir(imagesDir, args);

  console.log('');
  console.log('─'.repeat(60));
  console.log(`✅ Tổng: ${stats.total} PNG files`);
  console.log(`   ✓ Converted: ${stats.converted}`);
  console.log(`   ⏭ Skipped:   ${stats.skipped}`);
  console.log(`   ✗ Failed:    ${stats.failed}`);
  if (stats.deleted > 0) console.log(`   🗑️ Deleted:  ${stats.deleted}`);

  if (!args.dryRun && stats.converted > 0 && !args.deletePng) {
    console.log('\n💡 Tip: chạy với --delete-png để xóa PNG gốc và tiết kiệm dung lượng.');
    console.log('💡 Sau đó chạy `npm start` để tạo application.db.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Lỗi:', err.message);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  });
}

module.exports = { processDir, convertPngToJpg, parseArgs };
