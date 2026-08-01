import type { BirthDateParts } from "@/lib/birth-date";

type BirthDateFieldsProps = {
  value: BirthDateParts;
  onChange: (value: BirthDateParts) => void;
  inputClassName: string;
  autoFocus?: boolean;
};

function maximumDay(year: string, month: string) {
  if (!month) return 31;
  const safeYear = /^\d{4}$/.test(year) ? Number(year) : 2000;
  return new Date(safeYear, Number(month), 0).getDate();
}

export function BirthDateFields({ value, onChange, inputClassName, autoFocus = false }: BirthDateFieldsProps) {
  const dayCount = maximumDay(value.year, value.month);

  function updateYear(rawYear: string) {
    const year = rawYear.replace(/\D/g, "").slice(0, 4);
    const nextMaximum = maximumDay(year, value.month);
    const day = value.day && Number(value.day) > nextMaximum ? String(nextMaximum).padStart(2, "0") : value.day;
    onChange({ ...value, year, day });
  }

  function updateMonth(month: string) {
    const nextMaximum = maximumDay(value.year, month);
    const day = value.day && Number(value.day) > nextMaximum ? String(nextMaximum).padStart(2, "0") : value.day;
    onChange({ ...value, month, day });
  }

  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 sm:gap-3">
      <label className="sr-only" htmlFor="birth-year">태어난 연도</label>
      <input
        id="birth-year"
        type="text"
        inputMode="numeric"
        autoComplete="bday-year"
        aria-label="태어난 연도"
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.year}
        onChange={(event) => updateYear(event.target.value)}
        placeholder="YYYY"
        maxLength={4}
        autoFocus={autoFocus}
      />
      <label className="sr-only" htmlFor="birth-month">태어난 월</label>
      <select
        id="birth-month"
        autoComplete="bday-month"
        aria-label="태어난 월"
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.month}
        onChange={(event) => updateMonth(event.target.value)}
      >
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => <option key={month} value={month}>{Number(month)}월</option>)}
      </select>
      <label className="sr-only" htmlFor="birth-day">태어난 일</label>
      <select
        id="birth-day"
        autoComplete="bday-day"
        aria-label="태어난 일"
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.day}
        onChange={(event) => onChange({ ...value, day: event.target.value })}
      >
        <option value="">일</option>
        {Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{Number(day)}일</option>)}
      </select>
    </div>
  );
}
