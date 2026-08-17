// Structured opening hours so "Open now" can be a real filter rather than a
// guess at free text.

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Span = { dayOfWeek: number; openMin: number; closeMin: number };

export function minutesToLabel(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

// A span may run past midnight (closeMin > 1440). To decide "open now" we
// check today's spans plus yesterday's overnight spill.
export function isOpenAt(spans: Span[], when = new Date()): boolean {
  const day = when.getDay();
  const minute = when.getHours() * 60 + when.getMinutes();
  const prevDay = (day + 6) % 7;

  for (const s of spans) {
    if (s.dayOfWeek === day && minute >= s.openMin && minute < s.closeMin) return true;
    if (s.dayOfWeek === prevDay && s.closeMin > 1440 && minute < s.closeMin - 1440) return true;
  }
  return false;
}

// "Closes in 25 min" / "Open until 22:00" / "Closed · opens Mon 09:00"
export function openStatusLabel(spans: Span[], when = new Date()): string | null {
  if (spans.length === 0) return null;
  const day = when.getDay();
  const minute = when.getHours() * 60 + when.getMinutes();

  for (const s of spans) {
    if (s.dayOfWeek === day && minute >= s.openMin && minute < s.closeMin) {
      const left = s.closeMin - minute;
      if (left <= 60) return `Closes in ${left} min`;
      return `Open until ${minutesToLabel(s.closeMin)}`;
    }
  }
  // Next opening within the coming week
  for (let ahead = 0; ahead < 8; ahead++) {
    const d = (day + ahead) % 7;
    const candidates = spans
      .filter((s) => s.dayOfWeek === d && (ahead > 0 || s.openMin > minute))
      .sort((a, b) => a.openMin - b.openMin);
    if (candidates.length) {
      const next = candidates[0];
      const when_ = ahead === 0 ? "today" : ahead === 1 ? "tomorrow" : DAY_SHORT[d];
      return `Closed · opens ${when_} ${minutesToLabel(next.openMin)}`;
    }
  }
  return "Closed";
}

export function groupByDay(spans: Span[]): { day: number; spans: Span[] }[] {
  return DAY_NAMES.map((_, day) => ({
    day,
    spans: spans.filter((s) => s.dayOfWeek === day).sort((a, b) => a.openMin - b.openMin),
  }));
}

export const PRICE_LABELS: Record<number, string> = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
