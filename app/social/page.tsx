import { redirect } from 'next/navigation';

// T1-1: /social now consolidates into /social-hub under the Analytics tab.
// Keeping this file so any bookmarks/links to /social still work.
export default function SocialAnalyticsRedirect() {
  redirect('/social-hub');
}
