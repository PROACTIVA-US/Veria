/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_QB_CONNECTOR_URL: process.env.NEXT_PUBLIC_QB_CONNECTOR_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig