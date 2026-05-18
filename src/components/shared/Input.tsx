import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full bg-bg-subtle border border-border rounded-md text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:border-accent focus:shadow-focus disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leftIcon, rightIcon, ...rest }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="block text-xs font-medium text-fg-muted mb-1.5">
            {label}
          </span>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              base,
              "h-9 px-3",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-danger focus:border-danger",
              className
            )}
            {...rest}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-fg-subtle">
              {rightIcon}
            </div>
          )}
        </div>
        {(hint || error) && (
          <div className={cn("mt-1 text-xs", error ? "text-danger" : "text-fg-muted")}>
            {error || hint}
          </div>
        )}
      </label>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, ...rest }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="block text-xs font-medium text-fg-muted mb-1.5">
            {label}
          </span>
        )}
        <textarea
          ref={ref}
          className={cn(
            base,
            "px-3 py-2 min-h-[80px] resize-y",
            error && "border-danger focus:border-danger",
            className
          )}
          {...rest}
        />
        {(hint || error) && (
          <div className={cn("mt-1 text-xs", error ? "text-danger" : "text-fg-muted")}>
            {error || hint}
          </div>
        )}
      </label>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, children, ...rest }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="block text-xs font-medium text-fg-muted mb-1.5">
            {label}
          </span>
        )}
        <select
          ref={ref}
          className={cn(
            base,
            "h-9 px-3 pr-8 appearance-none",
            error && "border-danger focus:border-danger",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        {(hint || error) && (
          <div className={cn("mt-1 text-xs", error ? "text-danger" : "text-fg-muted")}>
            {error || hint}
          </div>
        )}
      </label>
    );
  }
);
Select.displayName = "Select";
