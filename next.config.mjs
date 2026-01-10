/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack(config, { isServer, dev }) {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };
        config.resolve = {
            ...config.resolve,
            fallback: {
                ...config.resolve.fallback,
                fs: false,
                path: false,
        }
        };

        return config;
    },
    output: 'standalone',
};

export default nextConfig;
