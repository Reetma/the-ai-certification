import { saveSettingAction, testSettingAction } from '@/lib/privateActions';
import { settingsOverview, SETTINGS } from '@/lib/settings';
import { mollieMode } from '@/lib/mollie';
import { emailConfigured } from '@/lib/email';
import { siteUrl } from '@/lib/site';

// Admin settings: API keys and sender address, saved encrypted, active at once. Each one can be tested.
export default async function Settings({ params }: { params: Record<string, string | string[] | undefined> }) {
  const rows = await settingsOverview();
  const saved = String(params.saved ?? '');
  const tested = String(params.test ?? '');
  const ok = params.ok === '1';
  const detail = String(params.detail ?? '');
  const [mode, mail] = await Promise.all([mollieMode(), emailConfigured()]);
  // Payments need both: Mollie to take the money, e-mail to send the buyer their confirmation.
  const payments = !mode
    ? { tone: 'tone-warn', label: 'Off', text: 'Paste the Mollie key below. Until then, the payment button says payments are unavailable.' }
    : !mail
      ? { tone: 'tone-warn', label: 'Blocked', text: 'The Mollie key is set, but the Resend key is missing: no payment is taken while the buyer cannot receive their confirmation.' }
      : mode === 'test'
        ? { tone: 'tone-info', label: 'Test mode', text: 'Payments go through Mollie in test mode: no money is taken, and each test payment opens a real access. Replace it with the live_… key to sell.' }
        : { tone: 'tone-ok', label: 'Live', text: 'Real payments: buyers pay on Mollie’s secure page, then come back to The AI Certification with their access.' };

  return (
    <>
      <section className="cx-card">
        <h2>Settings</h2>
        <p className="help">
          Paste the service keys here. They are stored encrypted and apply at once, without touching the code.
          Only the start and end of each key are shown. To change a key, just paste the new one.
        </p>
      </section>
      <section className="cx-card">
        <div className="cx-toolbar">
          <h2 style={{ margin: 0 }}>Payments</h2>
          <span className={`cx-badge ${payments.tone}`}>{payments.label}</span>
        </div>
        <p className="help">{payments.text}</p>
        <p className="help">
          Nothing to set in Mollie: each payment gives its own return address ({siteUrl()}/confirmation) and
          webhook (<code>{siteUrl()}/api/mollie/webhook</code>), which grants access even if the buyer closes the page.
        </p>
      </section>
      {rows.map((r) => (
        <section key={r.key} className="cx-card cx-setting">
          <div className="cx-toolbar">
            <h2 style={{ margin: 0 }}>{r.label}</h2>
            {r.source ? <span className="cx-badge tone-ok">Set</span> : <span className="cx-badge tone-warn">To set</span>}
          </div>
          <p className="help">{r.help}</p>
          {r.masked && (
            <p className="cx-setting-current">
              Current: <code>{r.masked}</code> <small>({r.source === 'admin' ? 'saved here' : 'set at the host'})</small>
            </p>
          )}
          {saved === r.key && <p className="price-alert" role="status">Saved. Click “Test” to check it.</p>}
          {tested === r.key && <p className={`price-alert${ok ? ' learn-pass' : ''}`} role="status">{ok ? '✓ ' : '✗ '}{detail}</p>}
          {/* Configured: the form stays folded away behind “Change”; still to set: shown at once. */}
          <details className="cx-setting-edit" open={!r.source || saved === r.key || (tested === r.key && !ok)}>
            {r.source && <summary className="btn btn-sm">Change</summary>}
            <form action={saveSettingAction} className="cx-setting-form">
              <input type="hidden" name="key" value={r.key} />
              <label className="skip" htmlFor={`v-${r.key}`}>{r.label}</label>
              <input
                id={`v-${r.key}`}
                name="value"
                type={SETTINGS[r.key].secret ? 'password' : 'text'}
                autoComplete="off"
                placeholder={r.masked ? 'New value…' : 'Paste the value…'}
                required
              />
              <button className="btn btn-sm btn-green" type="submit">Save</button>
            </form>
            <div className="cx-setting-actions">
              {r.source && (
                <form action={testSettingAction}>
                  <input type="hidden" name="key" value={r.key} />
                  <button className="btn btn-sm" type="submit">Test</button>
                </form>
              )}
              {r.source === 'admin' && (
                <form action={saveSettingAction}>
                  <input type="hidden" name="key" value={r.key} />
                  <input type="hidden" name="clear" value="1" />
                  <button className="linklike" type="submit">Remove</button>
                </form>
              )}
            </div>
          </details>
        </section>
      ))}
    </>
  );
}
