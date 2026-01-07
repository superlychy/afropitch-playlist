import Link from "next/link";
import { pricingConfig } from "@/../config/pricing";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { RecentApprovals } from "@/components/RecentApprovals";

export default function Home() {
  const faqs = [
    {
      q: "What is Afropitch Playlist?",
      a: "Afropitch is an African playlist pitching platform that connects artists directly with real curators across Afrobeat, Amapiano and Francophone genres."
    },
    {
      q: "Is Afropitch safe to use?",
      a: "Yes. Afropitch works only with real curators and playlists. No bots, no fake streams, and transparent pitching."
    },
    {
      q: "Does Afropitch offer free playlists?",
      a: "Yes. Artists can submit to both free and paid playlists on the platform."
    },
    {
      q: "What happens if my song is not playlisted?",
      a: "Afropitch offers a refund policy if your song does not make it to a playlist (based on platform rules)."
    },
    {
      q: "Can curators make money on Afropitch?",
      a: "Yes. Curators can earn money by accepting song submissions that fit their playlists."
    },
    {
      q: "What genres does Afropitch support?",
      a: "Afropitch supports Afrobeats, Amapiano, Francophone African music, Afro-house, Alte and emerging African sounds."
    }
  ];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden py-24 md:py-32 flex flex-col items-center text-center px-4">
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-green-400 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Accepting New Submissions
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
            Get Your <span className="grad-text">Afro Music</span> Reviewed <br className="hidden md:block" />
            & Pitched
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-white/90 mt-4 mb-2">
            Connecting African Artists to Real Curators
          </p>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            The trusted platform for Amapiano, Afrobeats, and Francophone African artists.
            Real human feedback, free Afrobeat playlist options, and premium paid playlist pitching starting at{" "}
            <span className="text-white font-semibold">
              {pricingConfig.currency}{pricingConfig.tiers.standard.price.toLocaleString()}
            </span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Link
              href="/submit"
              className="px-8 py-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]"
            >
              Pitch Your Music
            </Link>
            <Link
              href="/portal?role=curator"
              className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-lg transition-all"
            >
              Become a Curator
            </Link>
          </div>
        </div>
      </section>

      {/* Trust/Social Proof Strip */}
      <section className="w-full border-y border-white/5 bg-white/[0.02] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-6">
            Trusted by Artists
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500" />
              <span className="text-lg font-bold">No Bots</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500" />
              <span className="text-lg font-bold">48h Turnaround</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500" />
              <span className="text-lg font-bold">Detailed Feedback</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight / Why Section (Restored & Enhanced) */}
      <section className="py-24 px-4 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Why AfroPitch?</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Most playlist services use bots or leave you ghosted. We built AfroPitch to bring transparency and trust back to music promotion.
          </p>
          <ul className="space-y-4">
            {[
              "Strictly for Afro genres (Afrobeats, Amapiano, Francophone African)",
              "Direct feedback from real curators",
              "Honest pricing - no hidden fees",
              "Secure platform with refund policy"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1 min-w-5 min-h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <span className="text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <Link href="/how-it-works" className="text-green-500 font-medium hover:text-green-400 inline-flex items-center gap-1 group">
              Learn more about our review process
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-orange-500/20 rounded-2xl blur-2xl -z-10" />
          <RecentApprovals />
        </div>
      </section>

      {/* Ecosystem / Trust Cards */}
      <section className="w-full py-20 px-4 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">The Afropitch Promise</h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              We connect artists directly with playlist curators.
              <br className="hidden md:block" />
              <span className="text-white font-semibold block mt-4 text-2xl">
                No bots. No fake streams. No risky promotions.
              </span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-colors">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real Curators Only</h3>
              <p className="text-gray-400">Strict vetting process. We only work with active, human curators who actually listen to your music.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-colors">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Money Back Guarantee</h3>
              <p className="text-gray-400">We protect our artists. If your song isn't playlisted after a paid submission, we have a refund policy.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-colors">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">All African Genres</h3>
              <p className="text-gray-400">From Afrobeats & Amapiano to Francophone African music, Afro-house, Alte and more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Curators Section */}
      <section className="w-full py-24 bg-gradient-to-b from-transparent to-green-900/10 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">For Curators</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Turn your playlist into a revenue stream. Discover fresh African music and get paid to review submissions directly from artists.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-left bg-white/5 p-8 rounded-3xl border border-white/5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                <span>Earn money per review</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                <span>Full control of your list</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                <span>Discover hidden gems</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                <span>Grow your audience</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/portal?role=curator"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-colors"
            >
              Start Curating
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full py-24 px-4 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="font-semibold text-lg mb-2 text-white">{faq.q}</h3>
                <p className="text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
