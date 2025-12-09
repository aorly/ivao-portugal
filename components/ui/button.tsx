import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)] disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[color:var(--primary-strong)]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]",
  ghost: "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  ),
);

Button.displayName = "Button";
