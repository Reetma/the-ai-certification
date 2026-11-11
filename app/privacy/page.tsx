import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { company } from '@/lib/company';
import { localeFromSearch } from '@/lib/requestLocale';
import { SITE_DOMAIN } from '@/lib/site';

export const metadata = { title: 'Privacy policy | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const q = `?lang=${locale}`;
  const mail = <Link href={`/support${q}`}>{SITE_DOMAIN}/support</Link>;
  const controller = [company.name, company.address].filter(Boolean).join(', ');

  if (locale === 'fr') {
    return (
      <LegalPage locale={locale} title="Politique de confidentialité" updated="Dernière mise à jour : 24 octobre 2026">
        <h2>Responsable du traitement</h2>
        <p>
          {controller ? <><strong>{controller}</strong> (« The AI Certification »)</> : 'The AI Certification'}, joignable à {mail}. The AI Certification n’a pas désigné de délégué à la
          protection des données ; cette adresse sert pour toute question sur tes données.
        </p>

        <h2>Les données que nous utilisons</h2>
        <ul>
          <li><strong>Inscription :</strong> prénom, nom, email, téléphone si tu le donnes, école ou organisation, programme et session choisis, langue.</li>
          <li><strong>Paiement :</strong> montant, devise, statut et référence du paiement. Les données de carte sont saisies chez Mollie et ne nous sont jamais transmises.</li>
          <li><strong>Compte :</strong> email, mot de passe (stocké uniquement sous forme chiffrée irréversible), dates de connexion.</li>
          <li><strong>Formation :</strong> leçons terminées, réponses aux exercices, résultats des quiz et de l’examen, certificat délivré.</li>
          <li><strong>Ambassadeurs :</strong> écoles suivies, commissions, titulaire et IBAN pour les versements.</li>
          <li><strong>Contact et liste d’attente :</strong> nom, email, organisation et message envoyés via les formulaires.</li>
          <li><strong>Emails envoyés :</strong> une copie des emails que le site t’envoie (confirmation, mot de passe).</li>
        </ul>

        <h2>Pourquoi et sur quelle base</h2>
        <ul>
          <li><strong>Exécuter ta commande</strong> (contrat) : créer ton compte, te donner accès aux leçons, corriger l’examen, délivrer le certificat, t’envoyer les emails nécessaires.</li>
          <li><strong>Obligations légales</strong> : facturation et comptabilité.</li>
          <li><strong>Intérêt légitime</strong> : sécurité du site, prévention de la fraude à l’examen, réponse à tes demandes de contact, amélioration des programmes à partir de statistiques.</li>
          <li><strong>Consentement</strong> : emails sur les futurs programmes, seulement si tu as coché la case prévue. Tu peux le retirer à tout moment.</li>
        </ul>
        <p>Nous ne vendons jamais tes données et ne les partageons pas avec ton école ou ton employeur.</p>

        <h2>Qui y a accès</h2>
        <ul>
          <li>L’équipe The AI Certification, pour gérer les inscriptions et le support.</li>
          <li>Nos prestataires, uniquement pour leur mission : l’hébergeur du site et de la base de données ({company.host}), Mollie B.V. (paiement, Pays-Bas) et notre service d’envoi d’emails.</li>
          <li>Les autorités, si la loi l’exige.</li>
        </ul>
        <p>
          Certains prestataires peuvent traiter des données hors de l’Union européenne, notamment aux États-Unis. Ces transferts sont encadrés par les
          garanties prévues par le RGPD (clauses contractuelles types de la Commission européenne ou décision d’adéquation).
        </p>

        <h2>Combien de temps</h2>
        <ul>
          <li>Compte et données de formation : pendant ton accès, puis 3 ans après ta dernière activité.</li>
          <li>Certificat : tant qu’il doit pouvoir être vérifié, sauf si tu demandes sa suppression.</li>
          <li>Pièces comptables (paiements) : 10 ans, comme l’exige la loi.</li>
          <li>Inscription non payée, liste d’attente et demandes de contact : 3 ans maximum.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          Le site n’utilise que des cookies nécessaires à son fonctionnement : un cookie de session qui te garde connecté et un cookie qui indique
          d’afficher le bouton « Mon espace ». Aucun cookie publicitaire ni de mesure d’audience. Ils ne demandent donc pas de consentement.
        </p>

        <h2>Tes droits</h2>
        <p>
          Tu peux accéder à tes données, les corriger, les effacer, en limiter l’usage, t’opposer à un traitement fondé sur l’intérêt légitime, retirer
          ton consentement et récupérer tes données dans un format lisible. Écris à {mail}. Nous répondons sous un mois.
        </p>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>

        <h2>Âge</h2>
        <p>Les programmes s’adressent aux personnes de 18 ans ou plus.</p>

        <p>Voir aussi les <Link href={`/terms${q}`}>conditions générales de vente et d’utilisation</Link>.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage locale={locale} title="Privacy policy" updated="Last updated: October 24, 2026">
      <h2>Data controller</h2>
      <p>
        {controller ? <><strong>{controller}</strong> (“The AI Certification”)</> : 'The AI Certification'}, reachable at {mail}. The AI Certification has not appointed a data
        protection officer; this address handles every question about your data.
      </p>

      <h2>The data we use</h2>
      <ul>
        <li><strong>Registration:</strong> first and last name, email, phone if you give it, school or organization, chosen program and cohort, language.</li>
        <li><strong>Payment:</strong> amount, currency, status and payment reference. Card details are entered with Mollie and never sent to us.</li>
        <li><strong>Account:</strong> email, password (stored only as an irreversible hash), sign-in dates.</li>
        <li><strong>Learning:</strong> lessons completed, exercise answers, quiz and exam results, certificate issued.</li>
        <li><strong>Ambassadors:</strong> schools held, commissions, account holder and IBAN for payouts.</li>
        <li><strong>Contact and waitlist:</strong> name, email, organization and message sent through the forms.</li>
        <li><strong>Emails sent:</strong> a copy of the emails the site sends you (confirmation, password).</li>
      </ul>

      <h2>Why, and on what legal basis</h2>
      <ul>
        <li><strong>Performing your order</strong> (contract): creating your account, giving you access to lessons, grading the exam, issuing the certificate, sending necessary emails.</li>
        <li><strong>Legal obligations</strong>: invoicing and accounting.</li>
        <li><strong>Legitimate interest</strong>: site security, preventing exam fraud, answering contact requests, improving programs from statistics.</li>
        <li><strong>Consent</strong>: emails about future programs, only if you ticked the box. You can withdraw it any time.</li>
      </ul>
      <p>We never sell your data and do not share it with your school or employer.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>The AI Certification team, to manage registrations and support.</li>
        <li>Our providers, only for their task: the site and database host ({company.host}), Mollie B.V. (payments, Netherlands) and our email delivery service.</li>
        <li>Authorities, when the law requires it.</li>
      </ul>
      <p>
        Some providers may process data outside the European Union, notably in the United States. These transfers rely on the safeguards provided by the
        GDPR (European Commission standard contractual clauses or an adequacy decision).
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and learning data: during your access, then 3 years after your last activity.</li>
        <li>Certificate: as long as it must remain verifiable, unless you ask us to delete it.</li>
        <li>Accounting records (payments): 10 years, as required by law.</li>
        <li>Unpaid registrations, waitlist and contact requests: 3 years at most.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        The site only uses cookies it needs to work: a session cookie that keeps you signed in and a cookie that shows the “My space” button. No
        advertising or analytics cookies, so no consent banner is needed.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, correct or delete your data, restrict or object to its use, withdraw your consent and get a copy in a readable format. Write to{' '}
        {mail}. We answer within one month.
      </p>
      <p>
        If you think your rights are not respected, you can complain to the French data protection authority, the CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>), or to the authority of your country.
      </p>

      <h2>Age</h2>
      <p>The programs are for people aged 18 or over.</p>

      <p>See also the <Link href={`/terms${q}`}>terms of sale and use</Link>.</p>
    </LegalPage>
  );
}
