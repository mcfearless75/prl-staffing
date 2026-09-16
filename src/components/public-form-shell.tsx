import { defaultBrand } from "@/lib/brand";

interface PublicFormShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Shared ink-header shell for public-facing forms (apply, onboarding,
 * new-starter, grievance, payment-query). Wraps the page's existing form
 * markup — only the header and outer background are standardised here.
 */
export function PublicFormShell({ title, subtitle, children }: PublicFormShellProps) {
  return (
    <div className="min-h-screen bg-prism-canvas">
      <header className="bg-prism-ink text-prism-paper">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prl-logo.png" alt="PRL Site Solutions" width={48} height={48} className="w-12 h-12 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
              <p className="text-sm text-white/60 truncate">{subtitle || "PRL Site Solutions — Recruitment Specialists"}</p>
            </div>
          </div>
          <a
            href={`tel:${defaultBrand.phone.replace(/\s+/g, "")}`}
            className="hidden sm:block shrink-0 text-sm text-white/70 hover:text-prism-paper whitespace-nowrap"
          >
            {defaultBrand.phone}
          </a>
        </div>
      </header>

      {children}

      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-prism-ink-muted">
        <a href="/privacy" className="hover:text-prism-ink hover:underline">
          Privacy notice
        </a>
      </footer>
    </div>
  );
}
