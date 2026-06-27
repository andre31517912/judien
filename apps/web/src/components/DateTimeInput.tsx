'use client';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
}

export default function DateTimeInput({ value, onChange, clearable = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition [color-scheme:light] dark:[color-scheme:dark]"
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition font-medium"
        >
          Clear
        </button>
      )}
    </div>
  );
}
