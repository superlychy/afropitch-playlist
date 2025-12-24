export const pricingConfig = {
    currency: "₦",
    currencyCode: "NGN",
    tiers: {
        standard: {
            id: "standard",
            price: 3000,
            duration: "5 days",
            title: "Standard Review",
            description: "Great for artists planning ahead.",
            features: [
                "Review within 5 days",
                "Standard submission queue",
                "Email feedback",
                "Playlist consideration"
            ]
        },
        express: {
            id: "express",
            price: 5000,
            duration: "48 hours",
            title: "Express Review",
            description: "Get heard fast. Priority handling.",
            features: [
                "Guaranteed review within 48 hours",
                "Priority submission queue",
                "Detailed email feedback",
                "Playlist consideration (Fast-track)"
            ]
        }
    }
};
