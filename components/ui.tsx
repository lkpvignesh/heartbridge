"use client";
import clsx from "clsx";
import { Fragment, ReactNode } from "react";

export const cx = clsx;

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cx("rounded-2xl border border-line bg-white shadow-soft", pad && "p-6", className)}>{children}</div>;
}

export function Button({ children, onClick, variant = "primary", disabled, className, size = "md", type = "button" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "accent"; disabled?: boolean; className?: string; size?: "sm" | "md"; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cx("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "md" ? "h-11 px-5 text-[15px]" : "h-9 px-3.5 text-sm",
        variant === "primary" && "bg-brand-700 text-white hover:bg-brand-900",
        variant === "accent" && "bg-accent-500 text-white hover:bg-accent-600",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-canvas",
        variant === "ghost" && "text-brand-700 hover:bg-brand-50", className)}>
      {children}
    </button>
  );
}

export type Tone = "done" | "active" | "upcoming" | "skipped" | "flag" | "neutral";
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
      tone === "done" && "bg-brand-50 text-brand-600",
      tone === "active" && "bg-accent-50 text-accent-600",
      tone === "upcoming" && "bg-canvas text-muted ring-1 ring-line",
      tone === "skipped" && "border border-dashed border-line text-muted",
      tone === "flag" && "bg-flag-50 text-flag-500",
      tone === "neutral" && "bg-canvas text-ink ring-1 ring-line")}>
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-2 text-sm text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
        {desc && <p className="mt-2 text-[15px] leading-relaxed text-muted">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,108px)_minmax(0,1fr)] gap-x-4 gap-y-3 text-[15px]">
      {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="min-w-0">{v}</dd></Fragment>))}
    </dl>
  );
}

export function Avatar({ initials, tone = "brand", size = 36 }: { initials: string; tone?: "brand" | "accent" | "slate" | "india"; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cx("inline-grid flex-none place-items-center rounded-full text-xs font-semibold",
      tone === "brand" && "bg-brand-100 text-brand-700", tone === "accent" && "bg-accent-100 text-accent-600",
      tone === "slate" && "bg-slate-100 text-slate-700", tone === "india" && "bg-emerald-50 text-emerald-800")}>{initials}</span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Section({ title, desc, children, right }: { title: string; desc?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold">{title}</h2>{desc && <p className="mt-1 text-sm text-muted">{desc}</p>}</div>{right}
      </div>
      {children}
    </section>
  );
}
