const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src')
    return config
  },
  async rewrites() {
    const rawUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const backendUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
