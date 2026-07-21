"use client";

import { useState } from "react";

interface Props {
  /** Site-relative path to share, e.g. `/team/uncrowned-kings/sessions/abc123`. */
  path: string;
  title?: string;
  text?: string;
  className?: string;
}

const DEFAULT_CLASS_NAME =
  "text-[10px] text-gray-600 hover:text-orange-400 transition-colors";

/**
 * Persistent share affordance for a session card: native Web Share API where supported
 * (opens the phone's share sheet straight to iMessage/WhatsApp/etc.), falling back to
 * copy-to-clipboard with a brief inline "Copied!" text swap — no toast, matching this
 * app's existing no-toast/no-modal convention. The URL is built lazily inside the click
 * handler (not at render time) since `window` is only available client-side.
 */
export function ShareButton({
  path,
  title,
  text,
  className,
}: Props): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleShare(): Promise<void> {
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled the native share sheet — not a failure, nothing to fall back to.
        if (err instanceof Error && err.name === "AbortError") return;
        // Any other share failure (e.g. unsupported target) falls through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable/denied — nothing further we can do here.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={className ?? DEFAULT_CLASS_NAME}
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
