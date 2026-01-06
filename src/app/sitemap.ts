import { MetadataRoute } from 'next';
import { siteConfig } from '@/../config/site';
// import { supabase } from '@/lib/supabase'; // Optional: Fetch dynamic routes

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = siteConfig.url;

    // Static routes
    const routes = [
        '',
        '/playlists',
        '/curators',
        '/pricing',
        '/submit',
        '/contact',
        '/about', // Assuming about exists or directs to home
        '/how-it-works',
        '/trust',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // FETCH DYNAMIC PLAYLISTS (Optional - Uncomment if supabase server client is set up for this)
    /*
    const { data: playlists } = await supabase.from('playlists').select('id, updated_at').eq('is_active', true);
    const playlistRoutes = playlists?.map((p) => ({
      url: `${baseUrl}/playlist/${p.id}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })) || [];
  
    const { data: curators } = await supabase.from('profiles').select('id, updated_at').eq('role', 'curator');
    const curatorRoutes = curators?.map((c) => ({
      url: `${baseUrl}/curators/${c.id}`,
      lastModified: new Date(c.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || [];
  
    return [...routes, ...playlistRoutes, ...curatorRoutes];
    */

    return routes;
}
