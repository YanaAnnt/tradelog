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
      // CSP header - allows recharts (eval) + external fonts
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://hnfqhyiobidkpnvkcbmh.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;