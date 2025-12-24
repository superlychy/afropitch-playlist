export const genres = [
    "Afrobeats",
    "Amapiano",
    "Afro-Pop",
    "Afro-Fusion",
    "Highlife",
    "Hip-Hop / Afro-Rap",
    "R&B / Afro-Soul",
    "Dancehall / Reggae",
    "Gospel",
    "Traditional",
    "Other",
] as const;

export type Genre = (typeof genres)[number];
