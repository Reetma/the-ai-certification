import { Brand } from '../Header';
import Link from 'next/link';
import { AMBASSADOR_TERMS_VERSION, freeSchools, RATES } from '@/lib/team';
import { joinAction } from '@/lib/privateActions';
import UniversityPicker from '@/components/UniversityPicker';

type Params = Record<string, string | string[] | undefined>;

const ERRORS: Record<string, string> = {
  invalid: 'Fill in every field with a valid email and choose a school.',
  taken: 'Someone just took that school. Choose another one.',
  exists: 'This email already has an ambassador account. Sign in with your email and password (or “Forgot your password?”).',
  terms: 'Accept the ambassador terms to continue.',
  school: 'Choose your school, type its name if it is missing, or choose “No school”.',
};

// Sign-up page reached only through an invite link (/<code>). Rendered on the server, no client code.
export default async function JoinPage({ code, inviterName, params }: { code: string; inviterName: string; params: Params }) {
  const sent = params.sent === '1';
  const error = ERRORS[String(params.error ?? '')];
  const schools = sent ? [] : await freeSchools();

  return (
    <div lang="en">
      <header className="site-header">
        <nav className="container nav" aria-label="Main">
          <Brand />
          {/* Already an ambassador: signing in leads straight to the ambassador space. */}
          <Link className="btn btn-sm btn-green" href="/login?lang=en-us">Sign in</Link>
        </nav>
      </header>
      <main id="main" className="register hero-bands">
        <div className="container">
          <div className="register-card">
            {sent ? (
              <>
                <h1>Check your inbox</h1>
                <p className="lead">We sent you an email with a link to choose your password and open your ambassador space, plus a copy of the ambassador terms. Not in your inbox? Check your spam folder.</p>
              </>
            ) : (
              <>
                <span className="eyebrow">Invited{inviterName ? ` by ${inviterName}` : ''}</span>
                <h1>Become an ambassador for The AI Certification</h1>
                <p className="lead" style={{ fontSize: 17 }}>
                  Pick your school. Every student of that school who pays for The AI Certification earns you {RATES.owner / 100} % of what they pay, automatically.
                  When an ambassador you invite does the same at their school, you earn {RATES.parent / 100} %.
                </p>
                {error && <p className="alert" role="alert">{error}</p>}
                <form className="form" action={joinAction}>
                  <input type="hidden" name="code" value={code} />
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="j-first">First name</label>
                      <input id="j-first" name="first_name" autoComplete="given-name" required />
                    </div>
                    <div className="field">
                      <label htmlFor="j-last">Last name</label>
                      <input id="j-last" name="last_name" autoComplete="family-name" required />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="j-email">Email</label>
                    <input id="j-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  {/* The school is yours: every student of it who pays earns you the owner commission. */}
                  <UniversityPicker schools={schools.map((s) => ({ id: s.id, name: s.name, state: s.state ?? '' }))} label={`Your school (${schools.length} still free)`} allowAdd allowNone />
                  <p className="help" style={{ marginTop: -6 }}>One ambassador per school: the first to choose it keeps it, and earns {RATES.owner / 100} % of every sale there. Every ambassador you invite earns you {RATES.parent / 100} % of all their sales.</p>
                  <label className="check">
                    <input type="checkbox" name="terms" />
                    <span>I have read and accept the <Link href={`/ambassador-terms?from=${code}`}>ambassador terms</Link> (version {AMBASSADOR_TERMS_VERSION}).</span>
                  </label>
                  <div><button className="btn btn-green" type="submit">Create my ambassador space</button></div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
