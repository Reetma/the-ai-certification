# The AI Certification

Site and learning platform for **The AI Certification**: online AI certifications with lessons, exercises, quizzes, a final exam and a certificate anyone can verify.

It is a copy of the Certifiix platform with a new identity (logo, colours, mascot Kai) and a new catalogue of 13 AI certifications. Next.js 15 (App Router), React 19, TypeScript, Postgres (Neon in production, embedded PGlite locally), Mollie payments, emails through Resend or SMTP, and a site assistant powered by Claude.

## Run it locally

```bash
npm ci
cp .env.example .env.local   # leave everything empty to start: a local database and a mock payment page are used
npm run dev                  # http://localhost:3000
```

Without any setting, the site runs on its own: the database is stored in `.data/`, payments go through a mock page (`/pay/mock`) and emails are only stored (visible in the admin console).

To get into the admin console locally, put your email in `ADMIN_EMAILS` and a password hash in `ADMIN_PASSWORD_HASH` (`node scripts/hash-password.mjs 'your-password'`), then sign in at `/login`.

## Deploy (Vercel recommended)

1. Push this repository to GitHub and import it in Vercel (framework: Next.js, no build setting to change).
2. Create a Postgres database (Neon, from the Vercel marketplace or neon.tech) and set `DATABASE_URL`. The tables are created automatically on first start.
3. Set the environment variables (see `.env.example`). The ones that matter in production:
   - `BASE_URL`: `https://<domain>` (payment returns, webhooks, links in emails).
   - `NEXT_PUBLIC_SITE_DOMAIN`: `<domain>` without https:// (shown in texts and emails). Redeploy after changing it.
   - `MOLLIE_API_KEY`: `live_…` (or `test_…` to try).
   - `ADMIN_EMAILS`, `ADMIN_PASSWORD_HASH`.
   - `SETTINGS_KEY`: any long random string, set once; it encrypts the API keys entered in the admin console.
   - `RESEND_API_KEY` and `EMAIL_FROM` (the sender domain must be verified in Resend), or the SMTP settings.
   - `ANTHROPIC_API_KEY` for the site assistant (it can also be entered later in the admin console › Settings).
   - `SUPPORT_EMAIL`. The company fields (`COMPANY_*`) already default to Pierre Cazaban EI (see Décisions).
4. Add the domain name in Vercel › Settings › Domains and follow the DNS instructions.
5. In the admin console (`/admin` › Formation), put the catalogue certifications on sale.

## Addresses

| Address | What |
|---|---|
| `/` | Home page and catalogue |
| `/studies`, `/etudes`, `/estudios`, `/studi`, `/studium` | Student programme “AI for students”, in 5 languages |
| `/certifications/<slug>` | A certification page, then `/enroll` to buy it |
| `/space` | Learner space: modules, exam, certificate |
| `/verify` | Certificate verification |
| `/admin` | Admin console (signed-in admins only) |
| `/ambassador` | Ambassador space (signed-in ambassadors and admins) |
| `/ambassador-terms` | Terms of the ambassador programme |

## Catalogue

The student programme **AI for students** (5 languages) plus 13 certifications, each with 3 modules × 3 lessons, an exercise and a 5-question quiz per module, and a 30-question final exam (in English, like the catalogue):

- AI assistants: ChatGPT · Claude · Gemini · Microsoft Copilot
- Prompting & research: Prompt engineering · Research with AI
- Creative AI: AI image creation · AI video and voice
- Automation & agents: Automation with AI · AI agents without code
- Data & code: Data analysis with AI · AI coding assistants
- Trust & safety: Responsible AI

Card text in `lib/catalog.ts`, full courses in `lib/learning/catalog/<slug>.ts`.

## Identity

Everything is in `brand/`: logos (SVG, text outlined so no font is needed, plus white versions and PNGs), app icons, Kai's images and the logo generator (`generate-logo.py`). `brand/apercu.png` shows the whole set.

- Colours taken from Kai: navy `#17274C`, night `#0B152C`, gold `#D4A74C`, dark gold for text and buttons `#8A6420` (readable on white). Font: Manrope.
- The logo is the `components/Logo.tsx` component: it takes the text colour, so it works on light and dark backgrounds.

## Décisions

Choices made while building, without a spec to settle them:

1. **Starting point.** The specification file `prompt-the-ai-certification.md` could not be found. The site is therefore a faithful copy of Certifiix (same pages, flows, database, payments, emails, admin and ambassador spaces), with only the brand, the catalogue and the two addresses below changed.
2. **Addresses.** `/pro` became `/admin`, and the ambassador space `/team` became `/ambassador` (one setting in `lib/private.ts`).
3. **Domain.** No domain is written in the code: `NEXT_PUBLIC_SITE_DOMAIN` and `BASE_URL` set it. Without them, the local address is used.
4. **Brand name in sentences.** “Certifiix” became “The AI Certification” everywhere. Where that read badly after a possessive (“your Certifiix place”), the brand was dropped (“your place”).
5. **Certificate references** now start with `TAC-` (was `CFX-`).
6. **Catalogue.** The 13 office-tool certifications were replaced by 13 AI certifications. The course content was written for this site; it avoids prices, usage limits and model version numbers so it does not go out of date quickly. Review it before selling, especially *Responsible AI* (which says it is not legal advice).
7. **Product logos.** No logo of OpenAI, Anthropic, Google, Microsoft, etc. on the cards: each certification shows its own badge (colour + icon), to stay clear of trademark issues. A logo dropped into `public/logos/` and referenced with `logo:` in `lib/catalog.ts` would be shown instead. The trademark notice in the footer lists the products named in the courses.
8. **Kai (provisional images).** Three poses were supplied (sitting, holding a certificate, at a laptop). They were cut out on a transparent background and used for every mascot slot. The 7 course illustrations in `public/assets/course/` reuse them until dedicated poses exist:
   - `welcome.webp` Kai welcoming · `m1.webp` Kai learning at a laptop · `m2.webp` Kai connecting tools (automation) · `m3.webp` Kai checking a list / launching
   - `exam.webp` Kai at a desk taking a test · `certified.webp` Kai celebrating with a certificate · `support.webp` Kai with a headset
   Replace a file with a new image of the same name and size to update it.
9. **Site assistant** keeps the Certifiix behaviour, with the new name and catalogue.
10. **Legal entity.** The site is operated by Pierre Cazaban’s individual business: “Pierre Cazaban EI”, entrepreneur individuel (micro-entreprise), SIREN 132 067 414, 74 rue du Mas de Caze, 34090 Montpellier, France, publication director Pierre Cazaban, VAT-exempt (franchise en base). These are the defaults in `lib/company.ts` (taken from the Reetma legal notice); the `COMPANY_*` variables override them. Same terms, refund policy, privacy policy and ambassador terms as Certifiix, with the new name.
11. **Emails.** Same logic and templates as Certifiix (sign-in link, registration confirmation, support tickets, ambassador welcome, test email). Until Resend (or SMTP) is connected, every email is stored and readable in `/admin` › Emails; nothing else changes once the key is added.
12. **History.** A new Git repository, starting from this copy (Certifiix's history is not included).
