import { clsx } from "clsx";
import { eachDayOfInterval, isSameDay } from "date-fns";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CYRILLIC_TO_LATIN = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Транслит названия в slug для URL (латиница, цифры, дефисы). */
export function slugFromTitle(title) {
  const transliterated = [...String(title).toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  return transliterated
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ISO YYYY-MM-DD → Date (полдень UTC+локаль без сдвига дня). */
export function parseIsoDate(iso) {
  if (!iso) return undefined;
  return new Date(`${iso}T12:00:00`);
}

/** Date → ISO YYYY-MM-DD для API. */
export function toIsoDate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Две ISO-даты → объект для react-day-picker mode="range". */
export function dateRangeFromIso(startDate, endDate) {
  const from = parseIsoDate(startDate);
  const to = parseIsoDate(endDate);
  if (!from && !to) return undefined;
  return { from, to };
}

/** Диапазон дат мероприятия для UI (ISO YYYY-MM-DD с API). */
export function formatEventDateRange(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const opts = { day: "numeric", month: "long", year: "numeric" };
  const fmt = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", opts);
  if (startDate && endDate) return `${fmt(startDate)} — ${fmt(endDate)}`;
  if (startDate) return `с ${fmt(startDate)}`;
  return `до ${fmt(endDate)}`;
}

/** Все календарные дни мероприятия (ISO start/end с API). */
export function getEventDays(event) {
  const start = parseIsoDate(event.start_date);
  if (!start) return [];
  const end = parseIsoDate(event.end_date) ?? start;
  if (end < start) return [start];
  return eachDayOfInterval({ start, end });
}

/** Мероприятие проходит в указанный день. */
export function eventOnDate(event, date) {
  if (!date) return true;
  return getEventDays(event).some((day) => isSameDay(day, date));
}
