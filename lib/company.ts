// Legal entity operating The AI Certification: Pierre Cazaban's individual business (EI, micro-entreprise).
// Each value can be replaced from the environment without touching the code (see .env.example).
const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const company = {
  // French individual entrepreneurs must show "EI" (or "Entrepreneur individuel") next to their name.
  name: env('COMPANY_NAME', 'Pierre Cazaban EI'),
  legalForm: env('COMPANY_LEGAL_FORM', 'Entrepreneur individuel (micro-entreprise)'),
  siren: env('COMPANY_SIREN', '132 067 414'),
  address: env('COMPANY_ADDRESS', '74 rue du Mas de Caze, 34090 Montpellier, France'),
  email: env('SUPPORT_EMAIL', 'support@example.com'),
  publisher: env('COMPANY_PUBLISHER', 'Pierre Cazaban'),
  // Micro-entreprises under "franchise en base de TVA" do not charge VAT.
  vatExempt: env('VAT_EXEMPT', 'true') !== 'false',
  vatNumber: env('COMPANY_VAT_NUMBER', ''),
  host: env(
    'HOSTING_PROVIDER',
    'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States',
  ),
};
