export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("uz-UZ").format(fromCents(cents));
}
