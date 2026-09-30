export interface Playlist {
    id: string;
    name: string;
    followers: number;
    submissions: number;
    type: "free" | "standard" | "express" | "exclusive";
    cover_image: string;
    description?: string;
    playlist_link?: string;
}
