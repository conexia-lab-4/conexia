// Deja solo los dígitos de lo que se escribe y aplica el tope, si lo hay
export function parseNumericInput(raw: string, max?: number): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '' || max === undefined) return digits;
  return String(Math.min(max, Number(digits)));
}

// El número no puede quedar por debajo del mínimo; vacío queda vacío
export function applyMinimum(value: string, min: number): string {
  return value === '' ? '' : String(Math.max(min, Number(value)));
}
