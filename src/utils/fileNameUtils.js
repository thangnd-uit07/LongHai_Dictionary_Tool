'use strict';

/**
 * Port từ Form1._FormatName (C#).
 *
 * Chuẩn hóa tên file media:
 *   - Bỏ space, dấu gạch ngang, gạch dưới
 *   - Bỏ ký tự đặc biệt: " " - _ / “ ” ’ , . & ( ) \ : ; ? # @ ! $ % ^ * { } [ ] | ` ~ < > ...
 *   - Lower-case
 *   - Trim
 *
 * Dùng để tên file khớp với NameEn sau khi bỏ dấu/ký tự đặc biệt.
 *
 * Ví dụ:
 *   "Adam's Apple" -> "adamsapple"
 *   "Bell's Palsy" -> "bellspalsy"
 */
function formatName(name) {
  if (!name) return '';
  return String(name)
    .replace(/ /g, '')
    .replace(/-/g, '')
    .replace(/_/g, '')
    .replace(/\//g, '')
    .replace(/[“”]/g, '')
    .replace(/’/g, '')
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/&/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\\/, '')
    .replace(/:/g, '')
    .replace(/;/g, '')
    .replace(/\?/g, '')
    .replace(/#/g, '')
    .replace(/@/g, '')
    .replace(/!/g, '')
    .replace(/\$/g, '')
    .replace(/%/g, '')
    .replace(/\^/g, '')
    .replace(/\*/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\|/g, '')
    .replace(/`/g, '')
    .replace(/~/g, '')
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/\r\n/g, '')
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Loại bỏ BOM (Byte Order Mark) UTF-8 từ đầu chuỗi.
 * Port từ Form1.RemoveBom (C#) - tránh lỗi hiển thị ký tự BOM trong DB.
 */
function removeBom(text) {
  if (!text) return text;
  const BOM = '\uFEFF';
  let str = String(text);
  while (str.startsWith(BOM)) {
    str = str.substring(BOM.length);
  }
  return str;
}

module.exports = {
  formatName,
  removeBom,
};
