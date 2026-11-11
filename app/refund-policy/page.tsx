import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { company } from '@/lib/company';
import { localeFromSearch } from '@/lib/requestLocale';
import { SITE_DOMAIN } from '@/lib/site';

export const metadata = { title: 'Refund policy | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const q = `?lang=${locale}`;
  const mail = <Link href={`/support${q}&topic=refund`}>{SITE_DOMAIN}/support</Link>;

  if (locale === 'fr') {
    return (
      <LegalPage locale={locale} title="Politique de remboursement" updated="Dernière mise à jour : 24 octobre 2026">
        <div className="box">
          <p style={{ margin: 0 }}>
            <strong>Les programmes The AI Certification ne sont pas remboursables.</strong> Ce sont des contenus numériques : en commandant, tu demandes l’accès dès
            la confirmation du paiement et tu renonces expressément à ton droit de rétractation (article L221-28, 13° du Code de la consommation).
          </p>
        </div>

        <h2>Ce qui n’est pas remboursé</h2>
        <ul>
          <li>Un changement d’avis après l’achat.</li>
          <li>Des leçons non suivies ou un accès non utilisé.</li>
          <li>Un échec à l’examen final, ou un examen annulé pour fraude.</li>
          <li>Un compte suspendu pour non-respect des <Link href={`/terms${q}`}>conditions générales</Link>.</li>
          <li>Une erreur de programme ou de session choisie par toi lors de l’achat. Écris-nous quand même : nous ferons notre possible pour te changer de session si une place est libre.</li>
        </ul>

        <h2>Les seuls cas de remboursement</h2>
        <ul>
          <li><strong>Session annulée par The AI Certification :</strong> tu choisis entre un report sur une autre session et le remboursement intégral.</li>
          <li><strong>Accès impossible de notre fait :</strong> si nous ne pouvons pas te donner accès au programme acheté et que nous ne réglons pas le problème dans un délai raisonnable, nous te remboursons intégralement.</li>
          <li><strong>Double paiement :</strong> un paiement débité deux fois pour la même place est remboursé.</li>
        </ul>
        <p>Le remboursement se fait sur le moyen de paiement utilisé, dans les 14 jours suivant notre accord.</p>

        <h2>Nous contacter</h2>
        <p>Ouvre une demande sur {mail} avec la référence de ton inscription (elle figure dans l’email de confirmation).</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage locale={locale} title="Refund policy" updated="Last updated: October 24, 2026">
      <div className="box">
        <p style={{ margin: 0 }}>
          <strong>The AI Certification programs are non-refundable.</strong> They are digital content: when you order, you ask for access as soon as your payment is
          confirmed and you expressly waive your right of withdrawal (article L221-28, 13° of the French Consumer Code).
        </p>
      </div>

      <h2>What is not refunded</h2>
      <ul>
        <li>Changing your mind after purchase.</li>
        <li>Lessons you did not follow or access you did not use.</li>
        <li>Failing the final exam, or an exam cancelled for fraud.</li>
        <li>An account suspended for breaching the <Link href={`/terms${q}`}>terms</Link>.</li>
        <li>Choosing the wrong program or cohort at purchase. Write to us anyway: we will try to move you to another cohort if a place is free.</li>
      </ul>

      <h2>The only cases we refund</h2>
      <ul>
        <li><strong>Cohort cancelled by The AI Certification:</strong> you choose between moving to another cohort and a full refund.</li>
        <li><strong>No access because of us:</strong> if we cannot give you access to the program you bought and do not fix it within a reasonable time, we refund you in full.</li>
        <li><strong>Double payment:</strong> a payment charged twice for the same place is refunded.</li>
      </ul>
      <p>Refunds go back to the payment method you used, within 14 days of our agreement.</p>

      <h2>Contact us</h2>
      <p>Open a request on {mail} with your registration reference (it is in your confirmation email).</p>
    </LegalPage>
  );
}
