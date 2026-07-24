// RFC 4180 compliant CSV utilities used when exporting tables for download.
//
// We always wrap text fields in double quotes so embedded commas, newlines
// and unicode characters survive a round-trip through spreadsheet tools,
// and we double any embedded `"` character to escape it cleanly. Numeric
// fields are emitted raw (without quotes) to keep them arithmetic-friendly
// in Excel / Google Sheets.
//
// We also prepend a UTF-8 BOM ("\ufeff") to the output so that Excel — which
// otherwise guesses based on system locale — recognises the file as UTF-8
// and renders non-ASCII characters (e.g. ₦ in NGN amounts) correctly.

const BOM = '\ufeff';

/**
 * Escape a single CSV field for safe inclusion in a comma-separated value
 * stream. `null` and `undefined` are coerced to empty strings so a missing
 * column doesn't accidentally produce the literal text "null".
 */
export function escapeCsvField(value: unknown): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Build a fully-formed CSV string from a header row and an array of
 * already-stringified rows. Each row should already include its own field
 * separators — the helper does not split or join cells.
 *
 * The returned string is prefixed with a UTF-8 BOM so Excel detects the
 * encoding correctly. Row separators are fixed at LF (`\n`) because that is
 * what every CSV consumer (Excel, LibreOffice, Google Sheets, spreadsheets
 * on Linux/macOS) tolerates. Callers should ensure their `headers` string
 * already ends with `\n` if they want a newline before the first data row.
 */
export function buildCsv(headers: string, rows: string[]): string {
  return BOM + headers + rows.join('\n');
}
