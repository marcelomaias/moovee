"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ value, onChange, isSearching }: Props) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search movie..."
        className="bg-transparent text-white placeholder-[var(--text-muted)] text-base focus:outline-none w-36 sm:w-56 text-right"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="text-xs transition-colors text-muted hover:text-white"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      <div className="text-muted">
        {isSearching ? (
          <svg
            className="animate-spin h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
