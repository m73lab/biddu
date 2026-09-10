import { BadRequestError } from "./api/errors";

/**
 * Maximum auction/item duration.
 * End dates can't be more than 30 days in the future, and empty dates
 * default to 30 days out on creation.
 */
export const MAX_END_DATE_DAYS = 30;

/** Now + 30 days (rolling window, evaluated per call). */
export function getMaxEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + MAX_END_DATE_DAYS * 86400000);
}

/** Throw 400 if the date is invalid or beyond the 30-day window. */
export function assertEndDateWithinLimit(
  value: string | Date,
  field = "End date",
): void {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError(`Invalid ${field.toLowerCase()}`);
  }
  if (d.getTime() > getMaxEndDate().getTime()) {
    throw new BadRequestError(
      `${field} cannot be more than ${MAX_END_DATE_DAYS} days in the future`,
    );
  }
}
