import { loadExcelJS } from './cdnLibs';

/** Download an ExcelJS workbook as an .xlsx file in the browser. */
export async function downloadExcelWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Export an array of row objects (keys = column headers) to .xlsx. */
export async function exportRowsToExcel(exportRows, sheetName, fileName) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (exportRows.length > 0) {
    const headers = Object.keys(exportRows[0]);
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(String(header).length, 12), 40),
    }));
    exportRows.forEach((row) => worksheet.addRow(row));
  }

  await downloadExcelWorkbook(workbook, fileName);
}
