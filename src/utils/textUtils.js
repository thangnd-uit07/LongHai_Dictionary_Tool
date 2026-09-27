'use strict';

/**
 * Port từ ExcelUtils.utils.TextUtils (C#) -> Node.js.
 *
 * RemoveSign4VietnameseString: thay tất cả ký tự tiếng Việt có dấu thành
 * ký tự không dấu tương ứng. Dùng cho FTS unsign-name.
 */

const VIETNAMESE_SIGNS = [
  'aAeEoOuUiIdDyY',
  'áàạảãâấầậẩẫăắằặẳẵ',
  'ÁÀẠẢÃÂẤẦẬẨẪĂẮẰẶẲẴ',
  'éèẹẻẽêếềệểễ',
  'ÉÈẸẺẼÊẾỀỆỂỄ',
  'óòọỏõôốồộổỗơớờợởỡ',
  'ÓÒỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠ',
  'úùụủũưứừựửữ',
  'ÚÙỤỦŨƯỨỪỰỬỮ',
  'íìịỉĩ',
  'ÍÌỊỈĨ',
  'đ',
  'Đ',
  'ýỳỵỷỹ',
  'ÝỲỴỶỸ',
];

function removeVietnameseSigns(input) {
  if (!input) return '';
  let str = String(input);
  // Bỏ qua phần tử đầu (index 0) vì nó là bảng ký tự đích.
  for (let i = 1; i < VIETNAMESE_SIGNS.length; i++) {
    const replacements = VIETNAMESE_SIGNS[i];
    const target = VIETNAMESE_SIGNS[0][i - 1];
    for (const ch of replacements) {
      str = str.split(ch).join(target);
    }
  }
  return str;
}

/**
 * Port từ SqliteDb._CreateWordFTS (C#).
 *
 * Tạo text để index cho FTS4: gồm chính từ đó + mọi prefix của từng token.
 * Ví dụ: "abdominal pain" -> "abdominal pain abdo abd ab abdomina ... pain pai pa"
 * Giúp tra cứu nhanh theo prefix.
 */
function createWordFts(word) {
  if (!word) return '';
  let text = String(word);
  const tokens = text.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    for (let i = 0; i < token.length; i++) {
      text += ' ' + token.substring(i);
    }
  }
  if (text.startsWith('-')) {
    text = 'o_o ' + text;
  }
  return text;
}

module.exports = {
  removeVietnameseSigns,
  createWordFts,
};
