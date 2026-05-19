import { redirect } from 'next/navigation';
// T1-3: /notifications is now the Notifications tab inside /settings
export default function NotificationsRedirect() {
  redirect('/settings');
}
