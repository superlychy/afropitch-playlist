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
        },
        exclusive: {
            id: "exclusive",
            price: 13500,
            duration: "24 hours",
            title: "Exclusive Placement",
            description: "Premium placement on top-tier lists.",
            features: [
                "Guaranteed review within 24 hours",
                "Top position placement",
                "Direct curator feedback",
                "Social media shoutout"
            ]
        },
        free: {
            id: "free",
            price: 0,
            duration: "7-14 days",
            title: "Free Submission",
            description: "Submit for consideration. No guarantee.",
            features: [
                "Review within 14 days",
                "Standard submission queue",
                "No feedback guarantee",
                "Playlist consideration"
            ]
        }
    }
};
