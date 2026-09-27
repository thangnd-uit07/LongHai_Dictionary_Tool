# LongHai Dictionary Tool

Tool Node.js (port từ C# `ExcelUtils/ExcelToDb`) dùng để:

1. Đọc dữ liệu từ điển chuyên ngành từ 2 file Excel:
   - `sys_types.xlsx` (Body System — chuyên ngành y khoa)
   - `words.xlsx` (danh sách từ vựng, vd: `ENT.xlsx`)
2. Kiểm tra file hình ảnh + âm thanh (mp3) có tồn tại trong các thư mục tương ứng.
3. Xuất ra file **`application.db`** (SQLite binary) cho app Flutter đọc trực tiếp.

---

## 📁 Cấu trúc thư mục

```
LongHai_Dictionary_Tool/
├── package.json
├── scripts/                # Các script CLI tiện ích (chạy độc lập)
│   ├── rename-files.js         # Chuẩn hóa tên file media
│   └── convert-png-to-jpg.js   # Convert PNG -> JPG
├── src/
│   ├── index.js          # Entry point (orchestrator)
│   ├── config.js         # Cấu hình đường dẫn + format cột Excel
│   ├── excelReader.js    # Đọc file Excel (SheetJS) theo format index-based
│   ├── mediaResolver.js  # Tìm file hình ảnh + 4 loại âm thanh
│   ├── wordBuilder.js    # Build Word records (port từ Form1._importWords)
│   ├── sqlExporter.js    # Xuất ra file .db (node:sqlite)
│   ├── db/
│   │   ├── schema.js     # Re-export schema
│   │   └── sqliteDb.js   # Schema SQLite + prepared statements
│   └── utils/
│       ├── textUtils.js       # RemoveSign4VietnameseString, createWordFts
│       └── fileNameUtils.js   # _FormatName + RemoveBom
├── input/                # Đặt file vào đây trước khi chạy
│   ├── sys_types.xlsx
│   ├── words.xlsx
│   ├── images/
│   └── sounds/
│       ├── en/
│       ├── us/
│       ├── vi/
│       └── fr/
└── output/
    └── application.db    # File SQLite cho Flutter app
```

---

## 🚀 Cài đặt

Yêu cầu: **Node.js >= 22.5** (cần `node:sqlite` built-in).

```bash
npm install
```

Không cần compile native module (đã dùng `node:sqlite` built-in thay cho `better-sqlite3`).

---

## ▶️ Sử dụng

### Workflow tổng thể (khuyến nghị)

```bash
# 1. Chuẩn bị dữ liệu thô trong input/ (Excel + ảnh + mp3)

# 2. Chuẩn hóa tên file media + convert PNG -> JPG (chạy 1 lần)
npm run prep

# 3. Tạo application.db
npm start
```

### Workflow từng bước

1. **Đặt file Excel:**
   - `input/sys_types.xlsx` — chuyên ngành (format giống `HeThongCoThe-20210426.xlsx`)
   - `input/words.xlsx` — từ vựng (format giống `ENT.xlsx`)
2. **Đặt media:**
   - `input/images/{nameEn}.{jpg|png|gif|jpeg}` — hình ảnh
   - `input/sounds/{en|us|vi|fr}/{nameEn}.mp3` — âm thanh theo ngôn ngữ
3. **Chạy `npm start`** — Output: `output/application.db`

---

## 🛠️ Scripts tiện ích

### `scripts/rename-files.js`

Chuẩn hóa tên file media theo `_FormatName` (port từ `Form1._RenameFiles`):

```bash
# Chuẩn hóa trong input/ mặc định
npm run rename

# Xem trước không thực sự rename
node scripts/rename-files.js --dry-run

# Chỉ định folder khác
node scripts/rename-files.js --dir /path/to/data
```

Áp dụng cho: `images/`, `sounds/en/`, `sounds/us/`, `sounds/vi/`, `sounds/fr/`.

### `scripts/convert-png-to-jpg.js`

Convert tất cả `.png` sang `.jpg` (port từ `btnConvertImages_Click`):

```bash
# Convert (giữ PNG gốc - giống C#)
npm run convert

# Convert rồi XÓA PNG
node scripts/convert-png-to-jpg.js --delete-png

# Tùy chỉnh quality (mặc định: 90)
node scripts/convert-png-to-jpg.js --quality 85

# Chỉ log không convert
node scripts/convert-png-to-jpg.js --dry-run
```

**Lưu ý:** Script lọc theo **extension file** (`.png`), không phải MIME type. File PNG được lưu với tên `.gif` sẽ không bị convert.

---

## 🗄️ Schema SQLite

Port y hệt từ C# `SqliteDb.cs`:

| Bảng | Mô tả |
|------|-------|
| `sys_types` | Chuyên ngành (`id`, `en`, `vi`) |
| `words` | Bảng từ vựng chính (19 cột, xem schema) |
| `virtual_words_en` | FTS4 cho full-text search tiếng Anh |
| `virtual_words_vi` | FTS4 cho full-text search tiếng Việt (đã bỏ dấu) |

### Bảng `words`

```
id, nameEn, nameVi, nameFr, meaningEn, meaningVi,
imagePath, imageSource, ipa,
soundEn, soundUs, soundVi, soundFr,
term, flashCardVi, sysType, sysTypeEn, sysTypeVi, isActive
```

- `imagePath`: path tương đối (`images/abc.jpg`) hoặc NULL nếu file không tồn tại
- `soundEn/Us/Vi/Fr`: path tương đối (`sounds/en/abc.mp3`), luôn set (kể cả file không tồn tại)
- `sysTypeEn/Vi`: lookup từ bảng `sys_types`

---

## 🔄 So sánh với C# project

| C# | Node.js |
|---|---|
| `Form1.cs` | `src/index.js` |
| `SqliteDb.cs` | `src/db/sqliteDb.js` |
| `ExcelReader.cs` | `src/excelReader.js` |
| `TextUtils.cs` | `src/utils/textUtils.js` |
| `_FormatName` | `src/utils/fileNameUtils.js` |
| `DictionaryTableFormat.json` | `src/config.js` (`WORDS_FORMAT`) |
| `BodySystemFormat.json` | `src/config.js` (`SYS_TYPES_FORMAT`) |
| `System.Data.SQLite` | `node:sqlite` (built-in) |
| `SixLabors.ImageSharp` (convert PNG→JPG) | Không cần — Flutter app tự xử lý |

### Khác biệt chính
- Tool Node.js **không có UI**: dùng file Excel cố định (`input/sys_types.xlsx`, `input/words.xlsx`) thay vì OpenFileDialog.
- Tool Node.js **không convert PNG→JPG** (button `btnConvertImages` của Form1.cs). Nếu cần, copy file `btnConvertImages_Click` logic sang Node.js.
- Tool Node.js **không rename file** (`_RenameFiles` của Form1.cs) trước khi import — vì format tên file đã được chuẩn hóa.

---

## 📝 Format Excel

### `sys_types.xlsx`

| Cột | Tên | Mô tả |
|---|---|---|
| 0 | `id` | INTEGER (sysType id) |
| 1 | `vi` | Tiếng Việt |
| 2 | `en` | Tiếng Anh |

Row đầu tiên là header (bị skip).

### `words.xlsx`

| Cột | Tên | Mô tả |
|---|---|---|
| 0 | (STT) | Bỏ qua |
| 1 | `nameEn` | Từ tiếng Anh |
| 2 | `nameVi` | Từ tiếng Việt |
| 3 | `term` | Thuật ngữ |
| 4 | `imageSource` | Nguồn hình |
| 5 | `meaningEn` | Nghĩa tiếng Anh |
| 6 | `meaningVi` | Nghĩa tiếng Việt |
| 7 | `sysType` | ID chuyên ngành |
| 8 | `hasTerm` | (không dùng) |
| 9 | `flashCardVi` | Flashcard tiếng Việt |
| 10 | `nameFr` | Từ tiếng Pháp |

Row đầu tiên là header (bị skip).

---

## ⚙️ Cấu hình

Sửa `src/config.js` để:

- Đổi đường dẫn input/output
- Thay đổi format cột Excel
- Thêm/bớt extension media

---

## 📊 Output

Sau khi chạy, `output/application.db` chứa:

- ~2.000+ từ vựng (tùy file Excel)
- ~10+ chuyên ngành
- 2 bảng FTS4 cho search nhanh (prefix + unsign Vietnamese)

Copy file này vào Flutter project's `assets/` và dùng `sqflite` để mở.

