import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'AfroPitch',
        short_name: 'AfroPitch',
        description: 'The #1 African Music Promotion Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#16a34a',
        icons: [
            {
                src: '/logo.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
