"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ModernDatePickerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  align?: "left" | "right";
  allowClear?: boolean;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inRange(date: Date, minDate: Date | null, maxDate: Date | null): boolean {
  const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const minTime = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
    : null;
  const maxTime = maxDate
    ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()
    : null;

  if (minTime !== null && time < minTime) return false;
  if (maxTime !== null && time > maxTime) return false;
  return true;
}

function formatForDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function clampVisibleMonth(month: Date, minDate: Date | null, maxDate: Date | null): Date {
  const monthStart = startOfMonth(month);
  if (minDate) {
    const minMonth = startOfMonth(minDate);
    if (monthStart < minMonth) return minMonth;
  }
  if (maxDate) {
    const maxMonth = startOfMonth(maxDate);
    if (monthStart > maxMonth) return maxMonth;
  }
  return monthStart;
}

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  disabled = false,
  className,
  align = "left",
  allowClear = false,
}: ModernDatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedDate = useMemo(() => parseIsoDateString(value), [value]);
  const minDate = useMemo(() => parseIsoDateString(min), [min]);
  const maxDate = useMemo(() => parseIsoDateString(max), [max]);

  const today = useMemo(() => new Date(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const initial = selectedDate ?? today;
    return clampVisibleMonth(startOfMonth(initial), minDate, maxDate);
  });

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth((current) => {
      const next = clampVisibleMonth(startOfMonth(selectedDate), minDate, maxDate);
      if (
        current.getFullYear() === next.getFullYear() &&
        current.getMonth() === next.getMonth()
      ) {
        return current;
      }
      return next;
    });
  }, [selectedDate, minDate, maxDate]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current) return;
      const target = event.target as Node;
      if (!rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const currentYear = visibleMonth.getFullYear();
  const currentMonthIndex = visibleMonth.getMonth();

  const selectedYear = selectedDate?.getFullYear();
  const computedYearStart = minDate?.getFullYear() ?? today.getFullYear() - 120;
  const computedYearEnd = maxDate?.getFullYear() ?? today.getFullYear() + 20;
  const yearStart = Math.min(computedYearStart, selectedYear ?? computedYearStart);
  const yearEnd = Math.max(computedYearEnd, selectedYear ?? computedYearEnd);
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, idx) => yearStart + idx);

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonthIndex, 1).getDay();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const prevMonth = new Date(currentYear, currentMonthIndex - 1, 1);
  const nextMonth = new Date(currentYear, currentMonthIndex + 1, 1);
  const canGoPrev = !minDate || endOfMonth(prevMonth) >= minDate;
  const canGoNext = !maxDate || startOfMonth(nextMonth) <= maxDate;

  const triggerClassName =
    className ??
    "w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 border border-[color:var(--color-light)]/40 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30";

  return (
    <div className="relative mt-1" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setVisibleMonth((current) => clampVisibleMonth(current, minDate, maxDate));
          setIsOpen((open) => !open);
        }}
        className={`${triggerClassName} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="flex items-center justify-between gap-3">
          <span className={selectedDate ? "text-[color:var(--color-ink)]" : "text-[color:var(--color-text-muted)]"}>
            {selectedDate ? formatForDisplay(selectedDate) : placeholder}
          </span>
          <span aria-hidden="true" className="text-[color:var(--color-brand)]">v</span>
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose date"
          className={`absolute z-[80] mt-2 w-[19rem] rounded-xl border border-[color:var(--color-light)]/70 bg-white p-3 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!canGoPrev) return;
                setVisibleMonth((current) =>
                  clampVisibleMonth(
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    minDate,
                    maxDate,
                  ),
                );
              }}
              disabled={!canGoPrev}
              className="rounded-md border border-[color:var(--color-light)]/70 px-2 py-1 text-sm text-[color:var(--color-ink)] disabled:opacity-40"
              aria-label="Previous month"
            >
              {"<"}
            </button>

            <select
              value={currentMonthIndex}
              onChange={(event) => {
                const nextMonthIndex = Number(event.target.value);
                setVisibleMonth((current) =>
                  clampVisibleMonth(
                    new Date(current.getFullYear(), nextMonthIndex, 1),
                    minDate,
                    maxDate,
                  ),
                );
              }}
              className="h-8 flex-1 rounded-md border border-[color:var(--color-light)]/70 bg-white px-2 text-sm"
            >
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index}>
                  {monthName}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setVisibleMonth((current) =>
                  clampVisibleMonth(
                    new Date(nextYear, current.getMonth(), 1),
                    minDate,
                    maxDate,
                  ),
                );
              }}
              className="h-8 w-24 rounded-md border border-[color:var(--color-light)]/70 bg-white px-2 text-sm"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (!canGoNext) return;
                setVisibleMonth((current) =>
                  clampVisibleMonth(
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    minDate,
                    maxDate,
                  ),
                );
              }}
              disabled={!canGoNext}
              className="rounded-md border border-[color:var(--color-light)]/70 px-2 py-1 text-sm text-[color:var(--color-ink)] disabled:opacity-40"
              aria-label="Next month"
            >
              {">"}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[color:var(--color-text-muted)]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: cellCount }, (_, index) => {
              const dayNumber = index - firstWeekday + 1;
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return <div key={`empty-${index}`} className="h-8" aria-hidden="true" />;
              }

              const date = new Date(currentYear, currentMonthIndex, dayNumber);
              const isDisabled = !inRange(date, minDate, maxDate);
              const isSelected = selectedDate ? isSameDay(selectedDate, date) : false;
              const isToday = isSameDay(today, date);

              return (
                <button
                  key={toIsoDateString(date)}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(toIsoDateString(date));
                    setIsOpen(false);
                  }}
                  className={`h-8 rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-[color:var(--color-brand)] text-white"
                      : isToday
                        ? "border border-[color:var(--color-brand)]/50 text-[color:var(--color-brand)]"
                        : "text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50"
                  } ${isDisabled ? "cursor-not-allowed opacity-30" : ""}`}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setVisibleMonth(clampVisibleMonth(startOfMonth(today), minDate, maxDate));
                if (inRange(today, minDate, maxDate)) {
                  onChange(toIsoDateString(today));
                  setIsOpen(false);
                }
              }}
              className="text-xs font-medium text-[color:var(--color-brand)] hover:underline"
            >
              Today
            </button>
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-xs font-medium text-[color:var(--color-text-muted)] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
