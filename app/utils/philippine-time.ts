export const PHILIPPINE_TIME_ZONE =
  "Asia/Manila" as const;

const PHILIPPINE_UTC_OFFSET = "+08:00";

const philippineLocalFormatter =
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        PHILIPPINE_TIME_ZONE,
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
      hour:
        "2-digit",
      minute:
        "2-digit",
      hourCycle:
        "h23",
    },
  );

function asDate(
  value: Date | string,
): Date | null {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/**
 * Convert an instant to the value expected by an HTML datetime-local input,
 * always using Philippine civil time rather than the device timezone.
 */
export function toPhilippineLocalInput(
  value: Date | string,
): string {
  const date = asDate(value);

  if (!date) {
    return "";
  }

  const parts =
    philippineLocalFormatter
      .formatToParts(date)
      .reduce<Record<string, string>>(
        (output, part) => {
          if (part.type !== "literal") {
            output[part.type] = part.value;
          }

          return output;
        },
        {},
      );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Convert an instant to an HTML date input value using the Philippine
 * calendar date, independent of the device timezone.
 */
export function philippineDateInput(
  value: Date | string,
): string {
  return toPhilippineLocalInput(value).slice(0, 10);
}

/**
 * Interpret a datetime-local value as Philippine Time and return a UTC ISO
 * timestamp. Invalid civil dates are rejected rather than normalized.
 */
export function philippineLocalInputToIso(
  value: string,
): string | null {
  const normalized = value.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
      .exec(normalized);

  if (!match) {
    return null;
  }

  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    month < 1
    || month > 12
    || day < 1
    || day > 31
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    return null;
  }

  const date = new Date(
    `${normalized}:00${PHILIPPINE_UTC_OFFSET}`,
  );

  if (
    Number.isNaN(date.getTime())
    || toPhilippineLocalInput(date)
      !== normalized
  ) {
    return null;
  }

  return date.toISOString();
}

export function formatPhilippineDateTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  const date = asDate(value);

  if (!date) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      ...options,
      timeZone:
        PHILIPPINE_TIME_ZONE,
    },
  ).format(date);
}
