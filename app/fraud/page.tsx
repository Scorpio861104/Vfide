import { redirect } from 'next/navigation';
// Fraud reporting is now a tab inside /governance — redirect preserved for bookmarks and nav links.
export default function FraudRedirect() {
  redirect('/governance?tab=fraud');
}
