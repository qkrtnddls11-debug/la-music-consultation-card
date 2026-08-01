import type { BirthDateParts } from "@/lib/birth-date";

type BirthDateFieldsProps = {
  value: BirthDateParts;
  onChange: (value: BirthDateParts) => void;
  inputClassName: string;
  autoFocus?: boolean;
  autoComplete?: boolean;
  disabled?: boolean;
  idPrefix?: string;
  labelPrefix?: string;
};

function maximumDay(year: string, month: string) {
  if (!month) return 31;
  const safeYear = /^\d{4}$/.test(year) ? Number(year) : 2000;
  return new Date(safeYear, Number(month), 0).getDate();
}

export function BirthDateFields({
  value,
  onChange,
  inputClassName,
  autoFocus = false,
  autoComplete = true,
  disabled = false,
  idPrefix = "birth",
  labelPrefix = "태어난",
}: BirthDateFieldsProps) {
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
      <label className="sr-only" htmlFor={`${idPrefix}-year`}>{labelPrefix} 연도</label>
      <input
        id={`${idPrefix}-year`}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete ? "bday-year" : "off"}
        aria-label={`${labelPrefix} 연도`}
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.year}
        onChange={(event) => updateYear(event.target.value)}
        placeholder="YYYY"
        maxLength={4}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      <label className="sr-only" htmlFor={`${idPrefix}-month`}>{labelPrefix} 월</label>
      <select
        id={`${idPrefix}-month`}
        autoComplete={autoComplete ? "bday-month" : "off"}
        aria-label={`${labelPrefix} 월`}
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.month}
        onChange={(event) => updateMonth(event.target.value)}
        disabled={disabled}
      >
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => <option key={month} value={month}>{Number(month)}월</option>)}
      </select>
      <label className="sr-only" htmlFor={`${idPrefix}-day`}>{labelPrefix} 일</label>
      <select
        id={`${idPrefix}-day`}
        autoComplete={autoComplete ? "bday-day" : "off"}
        aria-label={`${labelPrefix} 일`}
        className={`${inputClassName} px-2 text-center font-bold sm:px-3`}
        value={value.day}
        onChange={(event) => onChange({ ...value, day: event.target.value })}
        disabled={disabled}
      >
        <option value="">일</option>
        {Array.from({ length: dayCount }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{Number(day)}일</option>)}
      </select>
    </div>
  );
}
