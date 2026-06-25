import type { Metadata } from "next";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about BIA — who it's for, how to join, events, housing and course tools, sponsorship, and how to get in touch.",
  alternates: { canonical: "/faq" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is BIA?",
    a: "BIA (Bridging Internationals Association) is a student-led community starting from USC, exploring how humanity, technology, and art reshape the way young people connect, experience, and belong. We host events, build student tools, and support international students with community, housing help, and career resources.",
  },
  {
    q: "Who is BIA for?",
    a: "BIA is oriented around USC international students, with deep roots in the Chinese international student community — but anyone who shares our spirit of connection, creativity, and growth is welcome.",
  },
  {
    q: "How do I join BIA, and is it free?",
    a: "Head to the Join page to get connected with event invites, group chats, and community updates. Joining the BIA community and using our student tools is free.",
  },
  {
    q: "What kind of events does BIA host?",
    a: "We run 15+ events a year — company recruiting sessions, startup and innovation talks, AI hackathons, orientation, and socials. Flagship events draw 300–500+ attendees.",
  },
  {
    q: "Can BIA help me find housing or a roommate?",
    a: "Yes. Our Apartments, Roommates, and Sublet tools help USC international students find curated housing near campus, connect with roommates, and post or find short-term sublets.",
  },
  {
    q: "What are the course tools?",
    a: "The Course Planner builds conflict-free USC schedules with the best professors (with RateMyProfessor ratings and seat tracking), and Course Ratings surfaces student-sourced ratings and rankings for USC courses and professors.",
  },
  {
    q: "How can my company partner with or sponsor BIA?",
    a: "We work with event, recruiting, local-service, and payment partners. See the Sponsors page or email us to put together a partnership that fits your goals.",
  },
  {
    q: "How do I contact BIA?",
    a: `Email ${SITE.email}, message us on Instagram @bia_usc, or use the Contact page.`,
  },
];

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--cardinal)", color: "white" }}>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>
            Frequently asked questions
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[1] sm:text-[56px]">FAQ</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="border-[3px] p-6" style={{ borderColor: "var(--black)", background: "var(--cream)" }}>
              <h2 className="font-display text-lg">{f.q}</h2>
              <p className="mt-2 text-base leading-7" style={{ color: "var(--mid)" }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
