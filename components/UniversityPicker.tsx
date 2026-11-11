'use client';

import { useMemo, useState } from 'react';

type School = { id: string; name: string; state: string };

// School search and list, the same as step 1 of the student registration, for forms rendered on the server:
// the chosen school is sent as a hidden field.
export default function UniversityPicker({
  schools,
  name = 'university_id',
  label = 'Search for your school',
  placeholder = 'e.g. EDHEC, NYU, Bocconi',
  empty = (q: string) => `No free school matches “${q}”.`,
  allowAdd = false,
  allowNone = false,
}: {
  schools: School[];
  name?: string;
  label?: string;
  placeholder?: string;
  empty?: (q: string) => string;
  /** “My school isn't listed”: the ambassador types it (sent as new_school / new_school_city, id "new"). */
  allowAdd?: boolean;
  /** “No school”: join without one, to grow a team (id "none"). */
  allowNone?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? schools.filter((s) => `${s.name} ${s.state}`.toLowerCase().includes(q)) : schools;
  }, [query, schools]);

  return (
    <>
      <div className="field">
        <label htmlFor={`${name}-search`}>{label}</label>
        <input
          id={`${name}-search`}
          type="search"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            const school = schools.find((s) => s.id === chosen);
            if (school && e.target.value !== school.name) setChosen('');
          }}
        />
      </div>
      <input type="hidden" name={name} value={chosen} />
      <ul className="uni-list" aria-label="Schools">
        {filtered.map((s) => (
          <li key={s.id}>
            <button type="button" aria-pressed={s.id === chosen} onClick={() => { setChosen(s.id); setQuery(s.name); }}>
              {s.name}
              {s.state && <small>{s.state}</small>}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li style={{ padding: 16 }} className="help">{empty(query)}</li>}
      </ul>
      {(allowAdd || allowNone) && (
        <div className="uni-extra">
          {allowAdd && (
            <button type="button" className={`uni-choice${chosen === 'new' ? ' is-on' : ''}`} aria-pressed={chosen === 'new'} onClick={() => setChosen('new')}>
              <strong>My school isn’t listed</strong>
              <small>Add it: it becomes yours and students can choose it.</small>
            </button>
          )}
          {allowNone && (
            <button type="button" className={`uni-choice${chosen === 'none' ? ' is-on' : ''}`} aria-pressed={chosen === 'none'} onClick={() => setChosen('none')}>
              <strong>No school, I’ll grow a team</strong>
              <small>Invite ambassadors: you earn on the sales of everyone you invite.</small>
            </button>
          )}
        </div>
      )}
      {chosen === 'new' && (
        <div className="form-row">
          <div className="field">
            <label htmlFor={`${name}-new`}>School name</label>
            <input id={`${name}-new`} name="new_school" required minLength={3} defaultValue={query} placeholder="e.g. ISG Paris" />
          </div>
          <div className="field">
            <label htmlFor={`${name}-city`}>City</label>
            <input id={`${name}-city`} name="new_school_city" placeholder="e.g. Paris" />
          </div>
        </div>
      )}
    </>
  );
}
