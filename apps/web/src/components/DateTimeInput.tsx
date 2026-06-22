'use client';

import { useState, useRef, useEffect } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function parse(value: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  if (!value) return null;
  if (value.length <= 16) {
    const [datePart, timePart = '00:00'] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if (!year || !month || !day) return null;
    return { year, month: month - 1, day, hour: hour ?? 0, minute: minute ?? 0 };
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function toOutput(year: number, month: number, day: number, h: number, m: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}`;
}

function toDisplay(year: number, month: number, day: number, h: number, m: number) {
  return new Date(year, month, day, h, m).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
}

export default function DateTimeInput({ value, onChange, placeholder = 'Select date & time', clearable = false, className = '' }: Props) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const parsed = parse(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
  const [selKey, setSelKey] = useState<string | null>(parsed ? `${parsed.year}-${parsed.month}-${parsed.day}` : null);
  const [selDay, setSelDay] = useState<{ year: number; month: number; day: number } | null>(
    parsed ? { year: parsed.year, month: parsed.month, day: parsed.day } : null
  );
  const [hour, setHour] = useState(parsed?.hour ?? 9);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parse(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
      setSelDay({ year: p.year, month: p.month, day: p.day });
      setSelKey(`${p.year}-${p.month}-${p.day}`);
      setHour(p.hour);
      setMinute(p.minute);
    } else {
      setSelDay(null);
      setSelKey(null);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPicker = () => {
    const p = parse(value);
    if (p) {
      setViewYear(p.year); setViewMonth(p.month);
      setSelDay({ year: p.year, month: p.month, day: p.day });
      setSelKey(`${p.year}-${p.month}-${p.day}`);
      setHour(p.hour); setMinute(p.minute);
    } else {
      setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
      setSelDay(null); setSelKey(null);
      setHour(9); setMinute(0);
    }
    setOpen(true);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const pickDay = (day: number) => {
    const d = { year: viewYear, month: viewMonth, day };
    setSelDay(d);
    setSelKey(`${viewYear}-${viewMonth}-${day}`);
  };

  const confirm = () => {
    if (!selDay) return;
    onChange(toOutput(selDay.year, selDay.month, selDay.day, hour, minute));
    setOpen(false);
  };

  const cells = buildCalendar(viewYear, viewMonth);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 focus-within:border-indigo-500 transition text-left group"
      >
        <IconCalendar />
        <span className={`flex-1 text-sm ${parsed ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {parsed ? toDisplay(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute) : placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onChange(''))}
            className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition text-base leading-none"
            aria-label="Clear"
          >
            ×
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[280px]">

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition text-lg font-light">
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition text-lg font-light">
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const key = `${viewYear}-${viewMonth}-${day}`;
              const isToday = key === todayKey;
              const isSel = key === selKey;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={[
                    'w-full aspect-square flex items-center justify-center rounded-full text-[13px] transition',
                    isSel
                      ? 'bg-indigo-600 text-white font-semibold'
                      : isToday
                        ? 'ring-1 ring-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800 my-3" />

          {/* Time picker */}
          <div className="flex items-center gap-2">
            <IconClock />
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700 flex-1">
              <input
                type="number" min={0} max={23}
                value={hour}
                onChange={e => setHour(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-8 text-center text-sm font-mono bg-transparent text-gray-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-gray-400 font-semibold">:</span>
              <input
                type="number" min={0} max={59}
                value={pad(minute)}
                onChange={e => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-8 text-center text-sm font-mono bg-transparent text-gray-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">24 h</span>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {clearable && value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition mr-auto">
                Clear
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition ml-auto">
              Cancel
            </button>
            <button type="button" onClick={confirm} disabled={!selDay}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition font-medium">
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
