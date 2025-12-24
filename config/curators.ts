export interface Playlist {
    id: string;
    name: string;
    genre: string;
    followers: number;
    description: string;
    coverImage: string;
    submissionFee: number; // 0 for Free
}

export interface Curator {
    id: string;
    name: string;
    bio: string;
    verified: boolean;
    playlists: Playlist[];
}

export const curators: Curator[] = [
    {
        id: "curator_1",
        name: "Lagos Vibes Team",
        bio: "We curate the hottest sounds coming out of Lagos. From mainland to island.",
        verified: true,
        playlists: [
            {
                id: "pl_1",
                name: "Naija Party 101",
                genre: "Afrobeats",
                followers: 15400,
                description: "The ultimate party starter pack.",
                coverImage: "bg-green-600",
                submissionFee: 3000
            },
            {
                id: "pl_2",
                name: "Alté Cruise",
                genre: "Afro-Fusion",
                followers: 8200,
                description: "For the cool kids. Smooth vibes only.",
                coverImage: "bg-purple-600",
                submissionFee: 0 // Free
            }
        ]
    },
    {
        id: "curator_2",
        name: "Amapiano Central",
        bio: "Strictly Piano. If it doesn't verify the log drum, we don't want it.",
        verified: true,
        playlists: [
            {
                id: "pl_3",
                name: "Piano to the World",
                genre: "Amapiano",
                followers: 45000,
                description: "Global Amapiano hits.",
                coverImage: "bg-orange-500",
                submissionFee: 5000
            },
            {
                id: "pl_4",
                name: "Private School Piano",
                genre: "Amapiano",
                followers: 12000,
                description: "Deep, soulful, and exclusive.",
                coverImage: "bg-yellow-600",
                submissionFee: 3000
            }
        ]
    },
    {
        id: "curator_3",
        name: "Afro-Pop Daily",
        bio: "Daily updates of the freshest Afro-Pop melodies.",
        verified: false,
        playlists: [
            {
                id: "pl_5",
                name: "Afro Love",
                genre: "Afro-Pop",
                followers: 25000,
                description: "Love songs and heartbreak anthems.",
                coverImage: "bg-pink-600",
                submissionFee: 0 // Free
            }
        ]
    }
];
