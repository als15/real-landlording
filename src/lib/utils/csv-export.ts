/**
 * CSV Export Utility
 * Converts data to CSV and triggers download
 */

type CsvValue = string | number | boolean | null | undefined;

interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: CsvValue, row: T) => string;
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
export function objectsToCsv<T extends Record<string, CsvValue>>(
  data: T[],
  columns: CsvColumn<T>[]
): string {
  // Header row
  const headers = columns.map((col) => escapeCsvValue(col.header)).join(',');

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const key = col.key as keyof T;
        const value = key.toString().includes('.')
          ? getNestedValue(row, key.toString())
          : row[key];

        if (col.formatter) {
          return escapeCsvValue(col.formatter(value as CsvValue, row));
        }

        return escapeCsvValue(value as CsvValue);
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Trigger CSV file download in browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV export
 */
export function formatDateForCsv(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format datetime for CSV export
 */
export function formatDateTimeForCsv(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Format array for CSV export
 */
export function formatArrayForCsv(arr: unknown[] | null | undefined): string {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join('; ');
}

/**
 * Format boolean for CSV export
 */
export function formatBooleanForCsv(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}
