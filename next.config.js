/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: [
      'localhost',
      'via.placeholder.com',
      'images.unsplash.com',
      'res.cloudinary.com',
      'storage.googleapis.com',
      'supabase.co'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**'
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**'
      }
    ]
  },
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    FASTAPI_URL: process.env.FASTAPI_URL || 'http://localhost:8001'
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle canvas for PDF generation
    config.resolve.alias.canvas = false
    
    // Handle node modules for server-side rendering
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil'
      })
    }
    
    return config
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : process.env.NEXT_PUBLIC_APP_URL || 'https://balidmc.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true
      },
      {
        source: '/agent',
        destination: '/agent/dashboard',
        permanent: true
      },
      {
        source: '/customer',
        destination: '/customer/dashboard',
        permanent: true
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/webhooks/whatsapp',
        destination: '/api/webhooks/whatsapp'
      },
      {
        source: '/api/webhooks/stripe',
        destination: '/api/webhooks/stripe'
      }
    ]
  }
}

module.exports = nextConfig