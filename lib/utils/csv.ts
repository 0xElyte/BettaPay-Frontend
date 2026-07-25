export interface CSVColumn<T = any> {
  header: string;
  key: keyof T | ((item: T) => string | number | null | undefined);
}

/**
 * Escapes a grid value for CSV storage following RFC 4180 rules.
 * Handles commas, double quotes, and carriage return / line feeds.
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a UTF-8 CSV string with BOM for Excel compatibility.
 */
export function generateCSV<T = any>(data: T[], columns: CSVColumn<T>[]): string {
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');
  const rows = data.map(item =>
    columns
      .map(col => {
        const val = typeof col.key === 'function' ? col.key(item) : item[col.key];
        return escapeCSVValue(val);
      })
      .join(',')
  );

  // Prefix with UTF-8 BOM to ensure Excel opens special characters correctly
  return '\ufeff' + [headers, ...rows].join('\r\n');
}
