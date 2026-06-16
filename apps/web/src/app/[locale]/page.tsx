import Link from 'next/link';

const FEATURES = [
  {
    icon: '📅',
    title: 'Smart Event Planning',
    body: 'Create events in seconds — set date, location, cover photo, and RSVP management all in one place.',
  },
  {
    icon: '👥',
    title: 'Group Management',
    body: 'Organize communities, manage memberships, and keep every member in sync with group-wide events.',
  },
  {
    icon: '✅',
    title: 'RSVP & Guest Tracking',
    body: "Know exactly who's coming. Track responses, manage guest lists, and export attendee data instantly.",
  },
  {
    icon: '🔔',
    title: 'Instant Notifications',
    body: 'Send message blasts and event updates that reach attendees in-app or by email the moment you hit send.',
  },
];

const STEPS = [
  { num: '01', title: 'Create your event', body: 'Fill in the details — title, date, location, cover photo — in under a minute.' },
  { num: '02', title: 'Invite your people', body: 'Share a link, invite group members, or send direct invites by email or phone.' },
  { num: '03', title: 'Stay in sync', body: 'Track RSVPs, send updates, and send message blasts all from one dashboard.' },
];

export default function LandingPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;

  return (
    <>
      <style>{`
        @keyframes orb-a {
          0%,100%{transform:translateY(0) scale(1);}
          50%{transform:translateY(-40px) scale(1.05);}
        }
        @keyframes orb-b {
          0%,100%{transform:translateY(0) scale(1);}
          50%{transform:translateY(-25px) scale(1.07);}
        }
        @keyframes orb-c {
          0%,100%{transform:translateY(0) scale(1);}
          50%{transform:translateY(-18px) scale(1.03);}
        }
        @keyframes fade-up {
          from{opacity:0;transform:translateY(24px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes shimmer {
          0%{background-position:200% center;}
          100%{background-position:-200% center;}
        }
        .orb-a{animation:orb-a 7s ease-in-out infinite;}
        .orb-b{animation:orb-b 5s ease-in-out infinite;}
        .orb-c{animation:orb-c 4s ease-in-out infinite;}
        .fade-up-0{animation:fade-up .7s ease-out both;}
        .fade-up-1{animation:fade-up .7s ease-out .15s both;}
        .fade-up-2{animation:fade-up .7s ease-out .3s both;}
        .fade-up-3{animation:fade-up .7s ease-out .45s both;}
        .shimmer-text{
          background:linear-gradient(90deg,#6366f1,#a78bfa,#818cf8,#6366f1);
          background-size:300% auto;
          -webkit-background-clip:text;
          background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmer 4s linear infinite;
        }
        .card-hover{transition:transform .2s,box-shadow .2s;}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(99,102,241,.12);}
      `}</style>

      <div className="relative overflow-x-hidden bg-white dark:bg-gray-950">

        {/* ── Floating orbs ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="orb-a absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-indigo-400/15 dark:bg-indigo-500/8 blur-3xl" />
          <div className="orb-b absolute top-1/2 -right-48 w-96 h-96 rounded-full bg-violet-400/15 dark:bg-violet-500/8 blur-3xl" style={{ animationDelay: '1.8s' }} />
          <div className="orb-c absolute bottom-32 left-1/4 w-80 h-80 rounded-full bg-sky-400/10 dark:bg-sky-500/6 blur-3xl" style={{ animationDelay: '.9s' }} />
        </div>

        {/* ── Hero ── */}
        <section className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="fade-up-0 inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-indigo-100 dark:border-indigo-800/60 select-none">
            ✨ Events &amp; Communities, Made Simple
          </div>

          <h1 className="fade-up-1 text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1] mb-6">
            Plan events.<br />
            <span className="shimmer-text">Build community.</span>
          </h1>

          <p className="fade-up-2 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Judien brings individuals and groups together through beautifully simple event planning — from the first invite to the final headcount.
          </p>

          <div className="fade-up-3 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${locale}/signup`}
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-base shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/45 transition-all"
            >
              Get Started — it&apos;s free
            </Link>
            <Link
              href={`/${locale}/login`}
              className="px-8 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-base backdrop-blur-sm transition-all"
            >
              Log In
            </Link>
          </div>
        </section>

        {/* ── App preview tiles ── */}
        <section className="relative max-w-3xl mx-auto px-6 mb-24">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl bg-gradient-to-br from-slate-50 to-indigo-50/60 dark:from-gray-900 dark:to-indigo-950/30 p-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { title: 'Hiking Trip', tag: '18 going', color: 'bg-indigo-100 dark:bg-indigo-900/40' },
                { title: 'Team Dinner', tag: '7 going', color: 'bg-violet-100 dark:bg-violet-900/40' },
                { title: 'Workshop', tag: '24 going', color: 'bg-sky-100 dark:bg-sky-900/40' },
              ].map((e, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60">
                  <div className={`w-full h-16 rounded-lg mb-3 ${e.color}`} />
                  <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{e.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{e.tag}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">RSVPs</p>
                <div className="flex gap-3 text-sm font-semibold">
                  <span className="text-green-600">✓ 49 Going</span>
                  <span className="text-red-400">✗ 12 Not Going</span>
                </div>
              </div>
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Last Update</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">📣 Blast sent to all</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="relative max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Everything in one place
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Whether you're planning a one-off outing or managing a recurring community group, Judien has you covered.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="relative bg-gray-50 dark:bg-gray-900/60 py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white mb-12">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-lg mb-4 shadow-lg shadow-indigo-500/25">
                    {s.num}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quote ── */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600" />
            <div className="orb-a absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
            <div className="orb-b absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="text-3xl sm:text-4xl font-bold text-white leading-snug mb-4">
              &ldquo;Finally, an event app that works for our community.&rdquo;
            </p>
            <p className="text-indigo-200 text-base">— Judien community organizer</p>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to bring your group together?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
            Join Judien and start planning events your community will love.
          </p>
          <Link
            href={`/${locale}/signup`}
            className="inline-block px-10 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/45 transition-all"
          >
            Create Your Free Account
          </Link>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 py-10 px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">Judien</span>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <a href="mailto:contact@madebyfayde.com" className="hover:text-gray-800 dark:hover:text-gray-200 transition">
                Contact Support
              </a>
              <Link href={`/${locale}/privacy-policy`} className="hover:text-gray-800 dark:hover:text-gray-200 transition">
                Privacy Policy
              </Link>
              <Link href={`/${locale}/terms-of-use`} className="hover:text-gray-800 dark:hover:text-gray-200 transition">
                Terms of Use
              </Link>
            </div>
            <span>© {new Date().getFullYear()} Judien</span>
          </div>
        </footer>

      </div>
    </>
  );
}
