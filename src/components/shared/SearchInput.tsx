import { Search, X } from "lucide-react";
import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, ...rest }, ref) => {
    return (
      <div className={cn("relative flex items-center", className)}>
        <Search
          size={14}
          className="absolute left-3 text-fg-subtle pointer-events-none"
        />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full pl-9 pr-9 bg-bg-subtle border border-border rounded-md text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent/60 focus:shadow-focus"
          {...rest}
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              onClear?.();
            }}
            className="absolute right-2 p-1 rounded text-fg-subtle hover:text-fg hover:bg-bg-hover"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
