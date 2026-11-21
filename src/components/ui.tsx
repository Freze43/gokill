"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { IconX } from "@/components/icons";
import { KATEGORI_META, KATEGORI_ORDER, cn, kategoriMeta, rupiah, statusMeta, type UnitKategori } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-extrabold leading-tight tracking-[-0.01em] text-ink-900 sm:text-[1.55rem]">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-[0.8rem] leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        meta.badge,
        size === "sm" ? "px-2 py-0.5 text-[0.63rem]" : "px-2.5 py-1 text-[0.68rem]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.short}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "ink",
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "ink" | "amber" | "emerald" | "rose" | "sky";
  trend?: { value: string; positive?: boolean };
}) {
  const tones: Record<string, string> = {
    ink: "bg-ink-800/5 text-ink-800",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="card animate-rise p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        {icon && <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tones[tone])}>{icon}</span>}
      </div>
      <p className="numeric mt-2.5 text-[1.35rem] font-extrabold leading-none tracking-[-0.02em] text-ink-900">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {trend && (
          <span
            className={cn(
              "numeric rounded px-1.5 py-0.5 text-[0.62rem] font-bold",
              trend.positive === false ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600",
            )}
          >
            {trend.value}
          </span>
        )}
        {hint && <span className="text-[0.68rem] leading-snug text-slate-400">{hint}</span>}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-5xl" };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-5">
      <button
        className="fixed inset-0 animate-fade bg-ink-950/55 backdrop-blur-[2px]"
        aria-label="Tutup dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 max-h-[92vh] w-full animate-pop overflow-hidden rounded-t-2xl bg-white shadow-float sm:rounded-2xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[0.95rem] font-bold text-ink-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[0.72rem] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink-800">
            <IconX size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-8.5rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-slate-50/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon ?? "∅"}</div>
      <p className="text-[0.9rem] font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[0.78rem] leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/80 px-4 py-3">
        <div>
          <h3 className="text-[0.88rem] font-bold text-ink-900">{title}</h3>
          {description && <p className="mt-0.5 text-[0.7rem] text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("px-4 py-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "amber" | "ink" | "rose" }) {
  const tones = { emerald: "bg-emerald-500", amber: "bg-brand-400", ink: "bg-ink-700", rose: "bg-rose-500" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("numeric", className)}>{rupiah(value)}</span>;
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50/70 text-sky-900",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    danger: "border-rose-200 bg-rose-50/70 text-rose-900",
  };
  return (
    <div className={cn("rounded-xl border px-3.5 py-2.5 text-[0.75rem] leading-relaxed", tones[tone])}>
      {title && <p className="mb-0.5 font-bold">{title}</p>}
      {children}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "light";
  className?: string;
}) {
  const variants = {
    primary: "bg-ink-800 text-white hover:bg-ink-900 shadow-sm",
    ghost: "border border-line bg-white text-ink-800 hover:bg-slate-50",
    light: "bg-brand-100 text-brand-700 hover:bg-brand-200",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.76rem] font-semibold transition",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}


export function KategoriBadge({ kategori, size = "sm" }: { kategori?: string | null; size?: "sm" | "md" }) {
  const meta = kategoriMeta(kategori);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-bold uppercase tracking-wide ring-1 ring-inset",
        meta.badge,
        size === "sm" ? "px-1.5 py-0.5 text-[0.56rem]" : "px-2 py-0.5 text-[0.64rem]",
      )}
    >
      <span aria-hidden>{meta.icon}</span>
      {meta.singkat}
    </span>
  );
}

export function KategoriChips({
  value,
  onChange,
  counts,
  includeAll = true,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  counts?: Partial<Record<UnitKategori | "semua", number>>;
  includeAll?: boolean;
  className?: string;
}) {
  const options: Array<{ key: string; label: string }> = [
    ...(includeAll ? [{ key: "semua", label: "Semua Unit" }] : []),
    ...KATEGORI_ORDER.map((kategori) => ({ key: kategori, label: KATEGORI_META[kategori].label })),
  ];
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-0.5", className)}>
      {options.map((option) => {
        const count = counts?.[option.key as UnitKategori | "semua"];
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.72rem] font-semibold transition",
              active
                ? "border-ink-700 bg-ink-800 text-white"
                : "border-line bg-white text-slate-600 hover:border-ink-300 hover:bg-slate-50",
            )}
          >
            {option.key !== "semua" && <span aria-hidden>{KATEGORI_META[option.key as UnitKategori].icon}</span>}
            {option.label}
            {typeof count === "number" && (
              <span className={cn("numeric rounded px-1 text-[0.6rem] font-bold", active ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
