/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode is enabled by default in Next.js 16
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
  images: {
    domains: ["cdn.jsdelivr.net", "sautiyamkenya.co.ke"],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

module.exports = nextConfig;