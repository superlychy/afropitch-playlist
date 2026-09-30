import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'AfroPitch',
        short_name: 'AfroPitch',
        description: 'Connect African artists with real curators',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        background_color: '#0A0A0B',
        theme_color: '#0A0A0B',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
