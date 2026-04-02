/** @type {import('next').NextConfig} */
const nextConfig = {
    // Necesario para Vercel: output standalone permite despliegue sin servidor dev
    output: 'standalone',

    // Variable de entorno pública accesible desde el navegador
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },

    // Permite imágenes externas si en el futuro se agregan
    images: {
        remotePatterns: [],
    },

    // Deshabilitar telemetría
    reactStrictMode: true,
};

module.exports = nextConfig;
