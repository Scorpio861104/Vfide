import { redirect } from 'next/navigation';

/**
 * /demo root — redirect to the primary demo experience.
 * This page exists so that the /demo route is properly defined;
 * the actual demo content lives at /demo/crypto-social.
 */
export default function DemoPage() {
  redirect('/demo/crypto-social');
}
