# AfroPitch Playlist Platform

A production-ready platform for Afro-based artists to submit their music for playlist review and promotion. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

## ⚙️ Configuration

The platform is designed for easy maintenance via configuration files in `/config`.

### 1. Changing Price & Review Time
Edit `config/pricing.ts`:
```typescript
export const pricingConfig = {
  review: {
    price: 5000,
    duration: "48-hour",
    // ...
  }
};
```
Changes reflect immediately across the Home, Pricing, How It Works, and Submit pages.

### 2. Branding & Contact Info
Edit `config/site.ts` to update the platform name, description, email, and social links.

### 3. Genres
Edit `config/genres.ts` to add or remove music genres from the submission form.

## 📁 Project Structure

```
/config         # Central configuration (Pricing, Site Info, Genres)
/src/app        # Next.js App Router pages
/src/components
  /layout       # Navbar, Footer
  /ui           # Reusable UI components (Button, Card, Input...)
/public         # Static assets
```

## 🔮 Future Scaling

The platform is "Future-Ready". Here is how to scale it:

1.  **Payment Integration**:
    - The `SubmitPage` currently simulates an API call.
    - Integrate Paystack or Flutterwave in `src/app/submit/page.tsx` inside the `onSubmit` function.
    - Use server actions or API routes (`src/app/api/submit/route.ts`) to handle secure transactions.

2.  **Database**:
    - Currently stateless. Connect a database (PostgreSQL/MongoDB) to store submissions.
    - Use Prisma ORM for easy integration.

3.  **Admin Dashboard**:
    - Create a secure route `/admin` to view submissions.
    - Fetch data from your database.

## 🛠 Deployment

This project is optimized for Vercel or any static hosting that supports Next.js.
- **Build Command**: `npm run build`
- **Output**: `.next` folder (or static assets if configured)

Powered by **AntiGravity**.
