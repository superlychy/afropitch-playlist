import { MetadataRoute } from 'next';
import { siteConfig } from '@/../config/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/portal/', '/admin/', '/verify/'],
        },
        sitemap: `${siteConfig.url}/sitemap.xml`,
    };
}
