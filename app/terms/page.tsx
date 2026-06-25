import type { Metadata } from "next";
import MarketingShell from "@/components/MarketingShell";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of BIA's website and services at uscbia.com.",
  alternates: { canonical: "/terms" },
};

const EFFECTIVE_DATE = "June 25, 2026";

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Acceptance of these terms",
    p: [
      "By accessing or using uscbia.com and the tools and services offered on it (the “Service”), you agree to these Terms of Service. If you do not agree, please do not use the Service.",
    ],
  },
  {
    h: "2. Who can use BIA",
    p: [
      "BIA is a student-led community oriented around USC international students. The Service is intended for individuals who are at least 18 years old, or the age of majority in their jurisdiction. You are responsible for any activity that happens under your account or device.",
    ],
  },
  {
    h: "3. Acceptable use",
    p: [
      "You agree not to misuse the Service: no unlawful, harassing, fraudulent, or harmful activity; no scraping, overloading, or attempting to break the Service or its security; and no impersonation of BIA, its members, or others. We may suspend access that violates these terms.",
    ],
  },
  {
    h: "4. Content you submit",
    p: [
      "Some features let you submit content — for example roommate or sublet listings, comments, votes, or event submissions. You are responsible for the content you post and confirm you have the right to share it. You grant BIA a non-exclusive license to display and distribute that content within the Service. We may remove content that violates these terms or that we consider inappropriate.",
    ],
  },
  {
    h: "5. Listings, recommendations, and third parties",
    p: [
      "Information about apartments, sublets, courses, professors, events, and partners is provided for convenience and may come from third parties or community members. BIA does not guarantee its accuracy, availability, or outcomes, and listing or linking something is not an endorsement. Verify details directly with the relevant provider before making decisions or payments.",
    ],
  },
  {
    h: "6. Not professional advice",
    p: [
      "Housing, course, career, and community information on the Service is general and informational only. It is not legal, financial, immigration, or professional advice. Use your own judgment and consult qualified professionals where appropriate.",
    ],
  },
  {
    h: "7. Disclaimers and limitation of liability",
    p: [
      "The Service is provided “as is” and “as available,” without warranties of any kind. To the fullest extent permitted by law, BIA and its organizers are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, or for the actions of third parties, listings, or partners.",
    ],
  },
  {
    h: "8. Changes to the Service and these terms",
    p: [
      "We may update, change, or discontinue parts of the Service, and we may revise these terms from time to time. When we make material changes, we will update the effective date above. Continued use of the Service after changes means you accept the revised terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="border-b-[3px]" style={{ borderColor: "var(--black)", background: "var(--beige)" }}>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="font-display text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--mid)" }}>
            Effective {EFFECTIVE_DATE}
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[1] sm:text-[56px]">Terms of Service</h1>
          <p className="mt-4 text-base leading-7" style={{ color: "var(--mid)" }}>
            These terms govern your use of BIA&apos;s website and services. Please
            read them, along with our{" "}
            <a href="/privacy" className="underline" style={{ color: "var(--cardinal)" }}>Privacy Policy</a>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-9">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="font-display text-xl">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-3 text-base leading-7" style={{ color: "var(--black)" }}>
                  {para}
                </p>
              ))}
            </div>
          ))}
          <div>
            <h2 className="font-display text-xl">9. Contact</h2>
            <p className="mt-3 text-base leading-7" style={{ color: "var(--black)" }}>
              Questions about these terms? Email{" "}
              <a href={`mailto:${SITE.email}`} className="underline" style={{ color: "var(--cardinal)" }}>
                {SITE.email}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
