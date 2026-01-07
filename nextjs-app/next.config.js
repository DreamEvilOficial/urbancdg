/** @type {import('next').NextConfig} */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHost = undefined
try {
  supabaseHost = url ? new URL(url).hostname : undefined
} catch {}

const nextConfig = {
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: supabaseHost ? [
      {
        protocol: 'https',
        hostname: supabaseHost,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ] : [],
    domains: supabaseHost ? [supabaseHost] : [],
  },
}

module.exports = nextConfig
