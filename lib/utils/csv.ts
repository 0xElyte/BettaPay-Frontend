export interface CSVColumn<T = Record<string, unknown>> {
  header: string;
  key: keyof T | ((item: T) => string | number | null | undefined);
}

/**
 * Escapes a grid value for CSV storage following RFC 4180 rules.
 * Handles commas, double quotes, and carriage return / line feeds.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const BOM = '\ufeff';

/**
 * Escape a single CSV field for safe inclusion in a comma-separated value stream.
 */
export function escapeCsvField(value: unknown): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Build a fully-formed CSV string from a header row and array of rows.
 */
export function buildCsv(headers: string, rows: string[]): string {
  return BOM + headers + rows.join('\n');
}

/**
 * Generates a UTF-8 CSV string with BOM for Excel compatibility.
 */
export function generateCSV<T = Record<string, unknown>>(data: T[], columns: CSVColumn<T>[]): string {
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');
  const rows = data.map(item =>
    columns
      .map(col => {
        const val = typeof col.key === 'function' ? col.key(item) : (item as Record<string, unknown>)[col.key as string];
        return escapeCSVValue(val);
      })
      .join(',')
  );

  return BOM + [headers, ...rows].join('\r\n');
}

