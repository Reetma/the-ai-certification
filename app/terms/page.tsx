import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { company } from '@/lib/company';
import { localeFromSearch } from '@/lib/requestLocale';
import { SITE_DOMAIN } from '@/lib/site';

export const metadata = { title: 'Terms of sale and use | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const seller = () => [company.name, company.legalForm].filter(Boolean).join(', ');

export default async function Page({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const q = `?lang=${locale}`;
  const vat = company.vatExempt;

  if (locale === 'fr') {
    return (
      <LegalPage locale={locale} title="Conditions générales de vente et d’utilisation" updated="Dernière mise à jour : 24 octobre 2026">
        <h2>1. Qui sommes-nous</h2>
        <p>
          Le site {SITE_DOMAIN} et les certifications The AI Certification sont édités par <strong>{seller()}</strong>
          {company.siren && <>, SIREN {company.siren}</>}
          {company.address && <>, {company.address}</>}. Contact : <Link href={`/support${q}`}>{SITE_DOMAIN}/support</Link>.
        </p>
        <p>
          Les présentes conditions s’appliquent à toute commande passée sur le site et à l’utilisation de l’espace personnel. En cochant la case
          prévue lors de l’inscription, tu les acceptes sans réserve.
        </p>

        <h2>2. Ce que nous vendons</h2>
        <p>
          The AI Certification vend des programmes de certification en ligne : des leçons en ligne, des exercices, un examen final et, en cas de réussite, un
          certificat numérique. Le contenu, la durée indicative et la date de début de chaque programme sont décrits sur sa page avant l’achat.
        </p>
        <p>
          Il s’agit d’un <strong>contenu numérique fourni sans support matériel</strong>. The AI Certification est indépendant des écoles, universités et
          éditeurs de logiciels cités sur le site (Microsoft, Google, LinkedIn, OpenAI, Anthropic…), qui ne sont pas partenaires et n’ont pas validé
          les programmes.
        </p>

        <h2>3. Prix et paiement</h2>
        <p>
          Les prix sont indiqués en euros ou en dollars US, toutes taxes comprises, sur la page du programme et au moment du paiement.
          {vat && ' TVA non applicable, article 293 B du Code général des impôts.'}
        </p>
        <p>
          Le paiement se fait en une fois, par carte ou par les moyens proposés par notre prestataire de paiement Mollie B.V. Les données bancaires sont
          saisies chez Mollie et ne transitent jamais par nos serveurs. Pendant le paiement, ta place est réservée pendant une durée limitée ; sans
          paiement confirmé dans ce délai, elle est libérée.
        </p>
        <p>La commande est définitive à la confirmation du paiement. Tu reçois alors un email de confirmation qui vaut reçu.</p>

        <h2>4. Accès à la formation</h2>
        <ul>
          <li>L’accès se fait depuis ton espace personnel, avec ton email et ton mot de passe.</li>
          <li>Les leçons ouvrent à la date de début de la session indiquée lors de l’achat. L’accès dure 6 mois à partir de cette date.</li>
          <li>Ton compte est personnel : il ne peut être ni partagé, ni prêté, ni revendu.</li>
          <li>Un ordinateur ou un téléphone récent et une connexion internet sont nécessaires.</li>
        </ul>

        <h2>5. Pas de droit de rétractation, pas de remboursement</h2>
        <div className="box">
          <p style={{ margin: 0 }}>
            <strong>Toutes les ventes sont définitives.</strong> Les programmes The AI Certification sont des contenus numériques. Conformément à
            l’article L221-28, 13° du Code de la consommation, en passant commande tu demandes expressément l’accès au contenu dès la confirmation de
            ton paiement et tu reconnais <strong>renoncer à ton droit de rétractation</strong>. Aucun remboursement n’est donc accordé, même partiel,
            y compris si tu ne suis pas les leçons, n’utilises pas ton accès ou échoues à l’examen.
          </p>
        </div>
        <p>
          Seule exception : si The AI Certification annule une session ou ne parvient pas à te donner accès au programme acheté, tu peux choisir entre un report sur
          une autre session et le remboursement intégral. Le détail figure dans la{' '}
          <Link href={`/refund-policy${q}`}>politique de remboursement</Link>.
        </p>

        <h2>6. Examen et certificat</h2>
        <p>
          Le certificat est délivré uniquement après réussite de l’examen final. Il atteste des compétences évaluées par The AI Certification ; ce n’est pas un
          diplôme d’État ni une certification inscrite au RNCP. Toute fraude (aide extérieure non autorisée, usurpation d’identité, partage des
          réponses) entraîne l’annulation de l’examen et, le cas échéant, du certificat, sans remboursement.
        </p>
        <p>The AI Certification ne garantit aucun résultat particulier : stage, emploi, note ou admission.</p>

        <h2>7. Utilisation du site</h2>
        <ul>
          <li>Tu t’engages à fournir des informations exactes et à garder ton mot de passe confidentiel.</li>
          <li>Il est interdit de copier, diffuser ou revendre les contenus des programmes, ou de perturber le fonctionnement du site.</li>
          <li>En cas de manquement grave, The AI Certification peut suspendre ou fermer le compte concerné, sans remboursement.</li>
        </ul>

        <h2>8. Propriété intellectuelle</h2>
        <p>
          Les textes, vidéos, exercices, examens, logos et la mascotte Kai sont protégés. L’achat donne un droit d’utilisation personnel et non
          transférable pendant la durée d’accès, sans transfert de propriété.
        </p>

        <h2>9. Responsabilité et garanties</h2>
        <p>
          The AI Certification fait ses meilleurs efforts pour que le site soit disponible et que les contenus soient exacts, sans pouvoir garantir une absence
          totale d’interruption. Tu bénéficies de la garantie légale de conformité des contenus numériques (articles L224-25-12 et suivants du Code de
          la consommation) : si le contenu acheté n’est pas fourni ou n’est pas conforme, écris-nous et nous le mettrons en conformité.
        </p>

        <h2>10. Données personnelles</h2>
        <p>
          Le traitement de tes données est décrit dans la <Link href={`/privacy${q}`}>politique de confidentialité</Link>.
        </p>

        <h2>11. Réclamations</h2>
        <p>
          Pour toute question ou réclamation, ouvre une demande sur <Link href={`/support${q}`}>{SITE_DOMAIN}/support</Link>. Nous répondons sous 7 jours ouvrés.
        </p>

        <h2>12. Droit applicable</h2>
        <p>
          Les présentes conditions sont soumises au droit français, sans te priver de la protection des règles impératives du pays où tu résides. En cas
          de litige, les tribunaux compétents sont ceux prévus par la loi.
        </p>
      </LegalPage>
    );
  }

  return (
    <LegalPage locale={locale} title="Terms of sale and use" updated="Last updated: October 24, 2026">
      <h2>1. Who we are</h2>
      <p>
        {SITE_DOMAIN} and The AI Certification certifications are operated by <strong>{seller()}</strong>
        {company.siren && <>, SIREN {company.siren}</>}
        {company.address && <>, {company.address}</>}. Contact: <Link href={`/support${q}`}>{SITE_DOMAIN}/support</Link>.
      </p>
      <p>
        These terms apply to every order placed on the site and to the use of your personal space. By ticking the box when you register, you accept
        them in full.
      </p>

      <h2>2. What we sell</h2>
      <p>
        The AI Certification sells online certification programs: online lessons, exercises, a final exam and, if you pass, a digital certificate. The content,
        indicative length and start date of each program are described on its page before you buy.
      </p>
      <p>
        These are <strong>digital content supplied without a physical medium</strong>. The AI Certification is independent from the schools, universities and
        software publishers mentioned on the site (Microsoft, Google, LinkedIn, OpenAI, Anthropic…), which are not partners and have not endorsed the
        programs.
      </p>

      <h2>3. Prices and payment</h2>
      <p>
        Prices are shown in euros or US dollars, all taxes included, on the program page and at checkout.
        {vat && ' VAT not applicable, article 293 B of the French General Tax Code.'}
      </p>
      <p>
        Payment is made once, by card or another method offered by our payment provider Mollie B.V. Card details are entered with Mollie and never
        pass through our servers. Your place is held for a limited time while you pay; without a confirmed payment it is released.
      </p>
      <p>The order is final once the payment is confirmed. You then receive a confirmation email, which is your receipt.</p>

      <h2>4. Access to the program</h2>
      <ul>
        <li>You access the program from your personal space, with your email and password.</li>
        <li>Lessons open on the cohort start date shown at purchase. Access lasts 6 months from that date.</li>
        <li>Your account is personal: it may not be shared, lent or resold.</li>
        <li>You need a recent computer or phone and an internet connection.</li>
      </ul>

      <h2>5. No right of withdrawal, no refunds</h2>
      <div className="box">
        <p style={{ margin: 0 }}>
          <strong>All sales are final.</strong> The AI Certification programs are digital content. Under article L221-28, 13° of the French Consumer Code, by
          placing your order you expressly ask for access to the content as soon as your payment is confirmed and you acknowledge that you{' '}
          <strong>waive your right of withdrawal</strong>. No refund, full or partial, is given, including if you do not follow the lessons, do not use
          your access or fail the exam.
        </p>
      </div>
      <p>
        The only exception: if The AI Certification cancels a cohort or cannot give you access to the program you bought, you can choose between moving to another
        cohort and a full refund. Details are in the <Link href={`/refund-policy${q}`}>refund policy</Link>.
      </p>

      <h2>6. Exam and certificate</h2>
      <p>
        The certificate is issued only after you pass the final exam. It attests the skills assessed by The AI Certification; it is not a state diploma or an
        accredited degree. Any fraud (unauthorized outside help, impersonation, sharing answers) cancels the exam and, where relevant, the
        certificate, without refund.
      </p>
      <p>The AI Certification does not guarantee any particular outcome: internship, job, grade or admission.</p>

      <h2>7. Using the site</h2>
      <ul>
        <li>You agree to give accurate information and to keep your password confidential.</li>
        <li>Copying, sharing or reselling program content, or disrupting the site, is forbidden.</li>
        <li>In case of serious breach, The AI Certification may suspend or close the account, without refund.</li>
      </ul>

      <h2>8. Intellectual property</h2>
      <p>
        The texts, videos, exercises, exams, logos and the Kai mascot are protected. Your purchase gives you a personal, non-transferable right of
        use for the access period, with no transfer of ownership.
      </p>

      <h2>9. Liability and guarantees</h2>
      <p>
        The AI Certification does its best to keep the site available and the content accurate, without being able to guarantee it will never be interrupted. You
        keep the legal guarantee of conformity for digital content: if the content you bought is not supplied or does not conform, write to us and we
        will fix it.
      </p>

      <h2>10. Personal data</h2>
      <p>
        How we handle your data is explained in the <Link href={`/privacy${q}`}>privacy policy</Link>.
      </p>

      <h2>11. Complaints</h2>
      <p>
        For any question or complaint, open a request on <Link href={`/support${q}`}>{SITE_DOMAIN}/support</Link>. We answer within 7 working days.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by French law, without depriving you of the mandatory protections of the country where you live. Disputes go to the
        courts designated by law.
      </p>
    </LegalPage>
  );
}
