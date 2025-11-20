/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    output: 'standalone',
    swcMinify: true,
    images: {
        minimumCacheTTL: 60,
    },
    experimental: {
        optimizeCss: true,
        scrollRestoration: true,
    },
    typescript: { ignoreBuildErrors: true },
};

export default (nextConfig);