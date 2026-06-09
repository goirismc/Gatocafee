// app/layout.js
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../lib/AuthContext';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Gatocafee — Sistema de Gestión',
  description: 'Sistema integral de gestión para Gatocafee',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-crema-100 text-cafe-900 antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#4a2c2a',
                color: '#fdf6f0',
                fontFamily: 'var(--font-body)',
                borderRadius: '10px',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#edc47a', secondary: '#4a2c2a' } },
              error:   { iconTheme: { primary: '#fca5a5', secondary: '#4a2c2a' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
