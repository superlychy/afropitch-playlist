import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
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
            Connecting <span className="grad-text">African Artists</span> to <br className="hidden md:block" />
            Real Curators
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Afropitch is Africa’s trusted playlist pitching platform for Afrobeats, Amapiano and Francophone African music.
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

      {/* What Is Afropitch / Trust Section */}
      <section className="w-full py-20 px-4 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">What Is Afropitch?</h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Afropitch was built with one clear mission: to connect artists directly with playlist curators.
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

      {/* Live Activity Section */}
      <section className="py-24 w-full px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Live Activity</h2>
            <p className="text-gray-400">Real artists getting approved right now</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-orange-500/10 rounded-2xl blur-3xl -z-10" />
            <RecentApprovals />
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
