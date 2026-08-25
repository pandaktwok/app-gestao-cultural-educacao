import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestão Cultural & Prestação de Contas',
  description: 'PWA Bento UI para Acompanhamento Pedagógico e Prestação de Contas',
  manifest: '/manifest.json',
  themeColor: '#1E1E24',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-bgLight text-charcoal antialiased selection:bg-accentPeach/30">
        {children}
      </body>
    </html>
  );
}
