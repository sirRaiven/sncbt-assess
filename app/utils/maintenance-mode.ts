/**
 * Normalizes public runtime configuration values for the temporary
 * SNCBT-AMS maintenance gate. Nuxt normally casts environment values,
 * but this keeps the middleware safe if a hosting layer supplies text.
 */
export function isMaintenanceModeEnabled(
  value: unknown,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    return normalized === "true"
      || normalized === "1"
      || normalized === "yes"
      || normalized === "on";
  }

  return false;
}
