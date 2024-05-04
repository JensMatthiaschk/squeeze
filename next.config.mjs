/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack(config, { isServer, dev }) {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };

        return config;
    },
};

export default nextConfig;
