'use client';

import { useEffect, useState } from 'react';

// An invite link shown as a read-only field with Copy (and Share on phones that support it).
export default function CopyLink({ url, copy = 'Copy', copied = 'Copied', share = 'Share', shareText }: { url: string; copy?: string; copied?: string; share?: string; shareText?: string }) {
  const [done, setDone] = useState(false);
  // Known only in the browser: decided after the first render so the server and browser HTML match.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare('share' in navigator), []);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: select the text so the user can copy it by hand.
      (document.getElementById('invite-url') as HTMLInputElement | null)?.select();
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className="copy-link">
      <svg className="copy-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
      <input id="invite-url" readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-green'}`} onClick={onCopy} aria-live="polite">
        {done ? `✓ ${copied}` : copy}
      </button>
      {canShare && (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigator.share({ url, text: shareText }).catch(() => {})}>
          {share}
        </button>
      )}
    </div>
  );
}
