/**
 * CSV Utility implementing RFC 4180 standard with UTF-8 BOM support.
 */

/**
 * Format a single CSV cell according to RFC 4180
 * @param {any} value
 * @returns {string}
 */
export function formatCsvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/**
 * Export data array to RFC 4180 CSV string with UTF-8 BOM.
 * @param {string[]} headers Column header names
 * @param {Array<Record<string, any> | any[]>} rows Data rows
 * @returns {string} CSV content with \uFEFF BOM
 */
export function exportToCsv(headers, rows) {
  const headerLine = headers.map(formatCsvCell).join(",");
  const dataLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map(formatCsvCell).join(",");
    }
    return headers.map((h) => formatCsvCell(row[h])).join(",");
  });

  const content = [headerLine, ...dataLines].join("\r\n");
  return `\uFEFF${content}`;
}

/**
 * Parse RFC 4180 CSV string into structured objects.
 * Handles multi-line fields, escaped quotes (""), and BOM.
 * @param {string} csvString
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
export function parseCsv(csvString) {
  if (!csvString) {
    return { headers: [], rows: [] };
  }

  // Strip UTF-8 BOM
  let cleanStr = csvString;
  if (cleanStr.charCodeAt(0) === 0xfeff) {
    cleanStr = cleanStr.slice(1);
  }

  const rawRows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const len = cleanStr.length;

  while (i < len) {
    const char = cleanStr[i];

    if (insideQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < len && cleanStr[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // Closing quote
        insideQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r") {
        if (i + 1 < len && cleanStr[i + 1] === "\n") {
          i++; // Skip \r\n
        }
        currentRow.push(currentField);
        currentField = "";
        rawRows.push(currentRow);
        currentRow = [];
        i++;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rawRows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Push final field/row if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rawRows.push(currentRow);
  }

  // Filter out empty rows (e.g. trailing empty line)
  const validRows = rawRows.filter(
    (row) => row.length > 0 && (row.length > 1 || row[0].trim() !== ""),
  );

  if (validRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = validRows[0].map((h) => h.trim());
  const rows = validRows.slice(1).map((row) => {
    const obj = {};
    for (let hIdx = 0; hIdx < headers.length; hIdx++) {
      const h = headers[hIdx];
      obj[h] = hIdx < row.length ? row[hIdx] : "";
    }
    return obj;
  });

  return { headers, rows };
}
