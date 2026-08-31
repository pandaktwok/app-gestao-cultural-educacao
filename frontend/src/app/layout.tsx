import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sociedade Cultural Cruzeiro do Sul - Gestão Cultural',
  description: 'Sistema de Gestão de Projetos Culturais e Prestação de Contas - Sociedade Cultural Cruzeiro do Sul',
  manifest: '/manifest.json',
  themeColor: '#1E1E24',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon-512.png',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className="bg-bgLight text-charcoal antialiased selection:bg-accentPeach/30">
        {children}
      </body>
    </html>
  );
}
