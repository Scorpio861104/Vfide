/**
 * /feed page — redirects to /social-hub.
 *
 * Pre-cleanup, /feed mounted the legacy `SocialFeed` component which
 * rendered SEED_POSTS (fake fixture activity from Kofi Textiles, Amara's
 * Kitchen, etc.) as if it were live community posts, with no-op
 * Like/Bookmark/Share buttons. /social-hub already exists and uses the
 * real /api/community/posts endpoint, so this page now just redirects.
 *
 * Using server-side redirect (next/navigation) so the URL bar updates
 * and existing links still work.
 */

import { redirect } from 'next/navigation';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function FeedPage() {
  const { locale } = useLocale();
  void locale;

  redirect('/social-hub');
}
