import { forwardRef, type InputHTMLAttributes } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  indeterminate?: boolean;
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, checked, label, ...rest }, ref) => {
    return (
      <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none", className)}>
        <span
          className={cn(
            "relative w-[16px] h-[16px] rounded border flex items-center justify-center transition-colors",
            checked || indeterminate
              ? "bg-accent border-accent"
              : "bg-bg-subtle border-border hover:border-accent/60"
          )}
        >
          <input
            ref={ref}
            type="checkbox"
            className="absolute inset-0 opacity-0 cursor-pointer"
            checked={!!checked}
            {...rest}
          />
          {indeterminate ? (
            <Minus size={12} className="text-white" />
          ) : checked ? (
            <Check size={12} className="text-white" strokeWidth={3} />
          ) : null}
        </span>
        {label && <span className="text-sm text-fg">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
