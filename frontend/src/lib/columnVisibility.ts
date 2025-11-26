/**
 * Column Visibility Utilities
 * Manages column visibility preferences in localStorage
 */

const STORAGE_PREFIX = 'table_columns_';

/**
 * Get column visibility preferences from localStorage
 * @param tableId - Unique identifier for the table
 * @param defaultColumns - Array of default column keys that should be visible
 * @returns Object mapping column keys to visibility boolean
 */
export function getColumnVisibility(
  tableId: string,
  defaultColumns: string[]
): Record<string, boolean> {
  if (typeof window === 'undefined') {
    // Server-side: return all columns visible
    return defaultColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {});
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all columns exist
      const result: Record<string, boolean> = {};
      defaultColumns.forEach(col => {
        result[col] = parsed[col] !== undefined ? parsed[col] : true;
      });
      return result;
    }
  } catch (error) {
    console.error('Error reading column visibility from localStorage:', error);
  }

  // Default: all columns visible
  return defaultColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {});
}

/**
 * Save column visibility preferences to localStorage
 * @param tableId - Unique identifier for the table
 * @param visibility - Object mapping column keys to visibility boolean
 */
export function saveColumnVisibility(tableId: string, visibility: Record<string, boolean>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(visibility));
  } catch (error) {
    console.error('Error saving column visibility to localStorage:', error);
  }
}

/**
 * Reset column visibility to defaults (all visible)
 * @param tableId - Unique identifier for the table
 * @param defaultColumns - Array of default column keys
 */
export function resetColumnVisibility(tableId: string, defaultColumns: string[]): void {
  const defaultVisibility = defaultColumns.reduce(
    (acc, col) => ({ ...acc, [col]: true }),
    {}
  );
  saveColumnVisibility(tableId, defaultVisibility);
}

