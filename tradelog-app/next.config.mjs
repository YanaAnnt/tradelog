/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
      },
    ];
  },
};

export default nextConfig;
