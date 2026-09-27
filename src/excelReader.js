'use strict';

const fs = require('fs');
const XLSX = require('xlsx');

/**
 * Đọc file Excel và trả về danh sách các dòng dữ liệu dạng object.
 *
 * Port từ Services.ExcelReader.cs (C#):
 *   - Đọc sheet đầu tiên (mặc định) hoặc theo tên
 *   - Bỏ qua hàng đầu tiên (header) nếu `format.skipHeaderRow = true`
 *   - Mỗi cột được ánh xạ theo `format.columns[].index` (0-based array index)
 *     và đặt tên theo `key` tương ứng.
 *
 * @param {string} filePath         - Đường dẫn file Excel.
 * @param {object} [format]         - Format ánh xạ cột.
 * @param {string} [format.sheetName]
 * @param {boolean}[format.skipHeaderRow]
 * @param {Array<{key:string,index:number}>} [format.columns]
 * @returns {{ sheetName: string, rows: Array<Object> }}
 */
function readExcel(filePath, format = {}) {
  if (!filePath) throw new Error('readExcel: filePath is required');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file Excel: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });

  const sheetName = format.sheetName || workbook.SheetNames[0];
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Không tìm thấy sheet "${sheetName}" trong file Excel.`);
  }

  const sheet = workbook.Sheets[sheetName];

  // Lấy mảng 2D trực tiếp để control chính xác việc skip header & index-based access.
  // blankrows: false -> bỏ các row hoàn toàn rỗng.
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false, // Ép kiểu string để giống row.ItemArray[i].ToString() của C#
  });

  // Skip header row nếu cần (giống C#: `for (var rowIndex = 1; ...)`)
  const startIndex = format.skipHeaderRow ? 1 : 0;
  const columns = format.columns || [];

  const rows = [];
  for (let i = startIndex; i < rawRows.length; i++) {
    rows.push(toRowObject(rawRows[i], columns));
  }

  return { sheetName, rows };
}

function toRowObject(rowArray, columns) {
  const obj = {};
  for (const col of columns) {
    const rawValue = col.index < rowArray.length ? rowArray[col.index] : '';
    obj[col.key] = rawValue == null ? '' : String(rawValue);
  }
  return obj;
}

module.exports = {
  readExcel,
};
