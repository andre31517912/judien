'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CALENDAR_W = 288;
const CALENDAR_H = 420; // conservative estimate for flip detection

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
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function to12(h24: number): { h12: number; ampm: 'AM' | 'PM' } {
  return { h12: h24 % 12 || 12, ampm: h24 >= 12 ? 'PM' : 'AM' };
}
function to24(h12: number, ampm: 'AM' | 'PM'): number {
  if (ampm === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
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
    parsed ? { year: parsed.year, month: parsed.month, day: parsed.day } : null,
  );
  const [hour12, setHour12] = useState(() => to12(parsed?.hour ?? 9).h12);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => to12(parsed?.hour ?? 9).ampm);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when the value prop changes externally
  useEffect(() => {
    const p = parse(value);
    if (p) {
      setViewYear(p.year); setViewMonth(p.month);
      setSelDay({ year: p.year, month: p.month, day: p.day });
      setSelKey(`${p.year}-${p.month}-${p.day}`);
      const t = to12(p.hour);
      setHour12(t.h12); setAmpm(t.ampm); setMinute(p.minute);
    } else {
      setSelDay(null); setSelKey(null);
    }
  }, [value]);

  // Non-passive wheel listeners so we can scroll hour/minute inputs without scrolling the page
  useEffect(() => {
    if (!open) return;
    const hourEl = hourInputRef.current;
    const minEl = minuteInputRef.current;
    const onHourWheel = (e: WheelEvent) => {
      e.preventDefault();
      setHour12(h => { const n = h + (e.deltaY < 0 ? 1 : -1); return n > 12 ? 1 : n < 1 ? 12 : n; });
    };
    const onMinWheel = (e: WheelEvent) => {
      e.preventDefault();
      setMinute(m => ((m + (e.deltaY < 0 ? 5 : -5) + 60) % 60));
    };
    hourEl?.addEventListener('wheel', onHourWheel, { passive: false });
    minEl?.addEventListener('wheel', onMinWheel, { passive: false });
    return () => {
      hourEl?.removeEventListener('wheel', onHourWheel);
      minEl?.removeEventListener('wheel', onMinWheel);
    };
  }, [open]);

  // Close on outside click — check both trigger and portal popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node);
      const inPopover = popoverRef.current?.contains(e.target as Node);
      if (!inTrigger && !inPopover) setOpen(false);
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
      const t = to12(p.hour);
      setHour12(t.h12); setAmpm(t.ampm); setMinute(p.minute);
    } else {
      setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
      setSelDay(null); setSelKey(null);
      setHour12(9); setAmpm('AM'); setMinute(0);
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // getBoundingClientRect() returns visual-pixel coords; position:fixed uses
      // CSS-pixel coords (pre-zoom). With html { zoom: N }, divide by N to convert.
      const zoomStr = getComputedStyle(document.documentElement).zoom;
      const zoom = (zoomStr && zoomStr !== 'normal') ? parseFloat(zoomStr) || 1 : 1;

      const rb = rect.bottom / zoom;
      const rt = rect.top / zoom;
      const rl = rect.left / zoom;

      const fitsBelow = rb + CALENDAR_H <= window.innerHeight;
      const top = fitsBelow ? rb : Math.max(8, rt - CALENDAR_H);
      const left = Math.max(8, Math.min(rl, window.innerWidth - CALENDAR_W - 8));
      setPopoverPos({ top, left });
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

  const confirm = () => {
    if (!selDay) return;
    onChange(toOutput(selDay.year, selDay.month, selDay.day, to24(hour12, ampm), minute));
    setOpen(false);
  };

  const cells = buildCalendar(viewYear, viewMonth);

  const popover = (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999, width: CALENDAR_W }}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
    >
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

      {/* Day grid — all dates selectable */}
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
              onClick={() => { setSelDay({ year: viewYear, month: viewMonth, day }); setSelKey(key); }}
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

      {/* Time picker — 12h */}
      <div className="flex items-center gap-2">
        <IconClock />
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700">
          <input
            ref={hourInputRef}
            type="number" min={1} max={12}
            value={hour12}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setHour12(Math.min(12, Math.max(1, v)));
            }}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            className="w-7 text-center text-sm font-mono bg-transparent text-gray-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-gray-400 font-semibold text-sm">:</span>
          <input
            ref={minuteInputRef}
            type="number" min={0} max={59}
            value={pad(minute)}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setMinute(Math.min(59, Math.max(0, v)));
            }}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            className="w-7 text-center text-sm font-mono bg-transparent text-gray-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {/* AM / PM toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
          {(['AM', 'PM'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmpm(p)}
              className={`px-2.5 py-1.5 transition ${ampm === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <button type="button" onClick={confirm} disabled={!selDay}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition font-medium">
          Confirm
        </button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="w-full flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition text-left"
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

      {/* Popover rendered via portal — escapes all ancestor overflow/transform/stacking constraints */}
      {open && createPortal(popover, document.body)}
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
