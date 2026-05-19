import { redirect } from 'next/navigation';
// NAV-2: Pass tab context so /notifications lands on the Notifications tab inside /settings
export default function NotificationsRedirect() {
  redirect('/settings?tab=notifications');
}
