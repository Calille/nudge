import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50",
  secondary:
    "bg-bg-hover text-fg border border-border hover:bg-bg-subtle disabled:opacity-50",
  outline:
    "border border-border text-fg hover:bg-bg-hover disabled:opacity-50",
  ghost:
    "text-fg hover:bg-bg-hover disabled:opacity-40",
  danger:
    "bg-danger text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-9 px-4 text-sm rounded-md gap-2",
  lg: "h-11 px-5 text-base rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "secondary", size = "md", icon, loading, children, disabled, ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors select-none whitespace-nowrap focus:outline-none focus-visible:shadow-focus",
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...rest}
      >
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
