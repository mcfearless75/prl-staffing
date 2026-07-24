"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface PortalLinkButtonProps {
  portalUrl: string;
  hasPortalAccount: boolean;
}

const COPY_CONFIRMATION_MS = 2000;

export function PortalLinkButton({ portalUrl, hasPortalAccount }: PortalLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Clipboard write failed (unsupported browser / no permission) — silently ignore,
      // the user can still select and copy the link manually via "Open".
    }
  }

  if (!hasPortalAccount) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-400">
        No portal account yet — worker portal link is unavailable until the contractor completes account setup.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open
      </a>
    </div>
  );
}
