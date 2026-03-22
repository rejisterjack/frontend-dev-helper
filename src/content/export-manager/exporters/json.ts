/**
 * JSON Exporter
 *
 * Handles JSON export generation
 */

/**
 * Export data as JSON file
 * @param data - Data to export
 * @param filename - Optional custom filename
 * @returns Blob and filename
 */
export function exportAsJSON(data: object, filename?: string): { blob: Blob; filename: string } {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const finalFilename = filename
    ? `${filename}.json`
    : `export-${new Date().toISOString().split('T')[0]}.json`;

  return { blob, filename: finalFilename };
}

/**
 * Parse and validate JSON data
 * @param jsonString - JSON string to parse
 * @returns Parsed data or null if invalid
 */
export function parseJSON<T = unknown>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

/**
 * Compress report data for sharing
 * @param data - Data to compress
 * @returns Base64 compressed string
 */
export function compressData(data: object): string {
  const json = JSON.stringify(data);
  return btoa(json);
}

/**
 * Decompress report data
 * @param compressed - Compressed string
 * @returns Decompressed data or null if invalid
 */
export function decompressData<T = unknown>(compressed: string): T | null {
  try {
    const json = atob(compressed);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
