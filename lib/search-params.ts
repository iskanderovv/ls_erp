export type SearchValue = string | string[] | undefined;

export function searchValue(value: SearchValue) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}
