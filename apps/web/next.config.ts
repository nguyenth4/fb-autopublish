import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  // outputFileTracingRoot: trace shared packages from monorepo root
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  // Trust X-Forwarded-* headers from Nginx
  // Required for correct URL generation behind reverse proxy
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
  }),
}

export default nextConfig
