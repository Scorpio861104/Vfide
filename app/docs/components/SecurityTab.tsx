'use client';

import { useLocale } from '@/lib/locale/LocaleProvider';

const SECURITY_COPY = {
  'en-US': {
    title: 'Security Practices',
    items: [
      'Use a hardware wallet for long-term storage.',
      'Verify payment requests and QR signatures before approving.',
      'Keep recovery contacts and vault guardians up to date.',
    ],
  },
  'es-ES': {
    title: 'Prácticas de seguridad',
    items: [
      'Usa una hardware wallet para almacenamiento a largo plazo.',
      'Verifica solicitudes de pago y firmas QR antes de aprobar.',
      'Mantén actualizados tus contactos de recuperación y guardians del vault.',
    ],
  },
};

export function SecurityTab() {
  const { locale } = useLocale();
  const copy = (SECURITY_COPY as Record<string, typeof SECURITY_COPY['en-US']>)[locale] ?? SECURITY_COPY['en-US'];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <h3 className="mb-3 text-xl font-bold text-white">{copy.title}</h3>
        <ul className="space-y-2 text-gray-300">
          {copy.items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
