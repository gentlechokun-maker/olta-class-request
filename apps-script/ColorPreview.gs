/** Run in the existing private operations spreadsheet project. */
function showColorPreview() {
  admin_();
  const sheet = db_().getSheetByName('색상');
  if (!sheet) throw new Error('색상 탭이 없습니다. setup을 먼저 실행하세요.');
  const rows = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 2).getDisplayValues();
  if (rows[0][0] !== 'hex' || rows[0][1] !== 'status') {
    throw new Error('A1=hex, B1=status인지 확인하세요.');
  }
  const headings = ['실제 색상', '글자색 예시', '등록 상태'];
  const existing = sheet.getRange(1, 3, Math.max(rows.length, 1), 3).getDisplayValues();
  if (existing.some(function(row) { return row.some(function(value) { return value !== ''; }); }) &&
      existing[0].some(function(value, index) { return value !== headings[index]; })) {
    throw new Error('C:E열에 기존 내용이 있습니다. 빈 열을 확보한 뒤 실행하세요.');
  }
  sheet.getRange('C1:E1').setValues([headings]).setBackground('#e5eddc').setFontColor('#202830').setFontWeight('bold');
  const labels = {registered:'확정 등록', paused:'임시 휴원', makeup:'보강', consultation:'상담 요청', starting:'시작 예정'};
  for (let i = 1; i < rows.length; i++) {
    const hex = rows[i][0].trim();
    const valid = /^#[0-9a-f]{6}$/i.test(hex);
    const target = sheet.getRange(i + 1, 3, 1, 3);
    target.setValues([[valid ? '견본' : 'HEX 확인', valid ? '가나다 ABC 123' : '', labels[rows[i][1]] || rows[i][1]]]);
    target.setBackground('#ffffff').setFontColor('#202830');
    if (valid) {
      const rgb = [1, 3, 5].map(function(offset) { return parseInt(hex.slice(offset, offset + 2), 16) / 255; });
      const linear = rgb.map(function(value) { return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4); });
      const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      sheet.getRange(i + 1, 3).setBackground(hex).setFontColor(luminance > 0.179 ? '#000000' : '#ffffff');
      sheet.getRange(i + 1, 4).setFontColor(hex).setFontWeight('bold');
    }
  }
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 190);
  sheet.setColumnWidth(5, 130);
  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();
}
