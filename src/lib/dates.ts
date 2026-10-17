import { format, isAfter } from "date-fns";

export function localDateString(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function dateFromString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function databaseDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function previousDate(value: string, days = 1) {
  const date = dateFromString(value);
  date.setUTCDate(date.getUTCDate() - days);
  return databaseDateString(date);
}

export function isFutureDate(value: string) {
  return isAfter(dateFromString(value), dateFromString(localDateString()));
}

export function weekdayFromString(value: string) {
  return dateFromString(value).getUTCDay();
}

export function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(dateFromString(value));
}

export function monthDates(value: string) {
  const [year, month] = value.split("-").map(Number);
  const end = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: end }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(month).padStart(2, "0")}-${day}`;
  });
}

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateFromString(value));
}
