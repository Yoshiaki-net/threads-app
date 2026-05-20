/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rawUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    // Render's fromService.host returns hostname without protocol, so add https:// if needed
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
