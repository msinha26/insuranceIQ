import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InsuranceIQ',
    short_name: 'InsuranceIQ',
    description: 'Know what your health policy pays, before the bill.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F4F5',
    theme_color: '#0C0C0E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
