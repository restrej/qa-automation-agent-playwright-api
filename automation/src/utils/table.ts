/** Normaliza claves de DataTables: "Zip / postal code" -> "zippostalcode". */
export const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export function normalizedHash(hash: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(hash).map(([k, v]) => [normalizeKey(k), v.trim()]));
}
