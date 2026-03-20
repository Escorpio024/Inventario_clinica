import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
    weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
    title: 'Inventario Clínica',
    description: 'Sistema de inventario médico con trazabilidad FEFO. Gestión de productos, lotes, movimientos y alertas de vencimiento.',
    keywords: ['inventario', 'clínica', 'médico', 'stock', 'FEFO'],
    authors: [{ name: 'Inventario Clínica' }],
    robots: 'noindex, nofollow',   // No indexar en Google (app privada)
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: '#667eea',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es" className={inter.variable} suppressHydrationWarning>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
