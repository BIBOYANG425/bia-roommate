import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy — BIA Course Helper",
  description:
    "Privacy policy for the BIA Course Helper Chrome extension: what it reads, what it stores locally, what it sends to BIA servers, and how we handle your data.",
  robots: { index: true, follow: true },
};

function BackArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MONO = "'Menlo','SF Mono','Courier New',monospace";
const EFFECTIVE_DATE = "April 16, 2026";
const LAST_UPDATED = "April 16, 2026";
const CONTACT_EMAIL = "uscbia@usc.edu";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] tracking-[4px] mb-3 font-bold text-[#3fb950]"
      style={{ fontFamily: MONO }}
    >
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] md:text-[26px] font-bold text-[#e6edf3] mb-5 leading-tight">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[15px] leading-[1.75] text-[#c9d1d9] space-y-4">
      {children}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* ─── Top Nav Bar ─── */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#8b949e] hover:text-white transition-colors text-sm py-3"
          >
            <BackArrow />
            <Image
              src="/logo.png"
              alt="BIA"
              width={20}
              height={16}
              style={{ height: "auto" }}
            />
            <span className="font-medium">BIA</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-[#484f58]">
            <span
              className="hidden sm:inline"
              style={{ fontFamily: MONO }}
            >
              privacy-policy.md
            </span>
            <span
              className="bg-[#1c2128] border border-[#30363d] rounded px-2 py-0.5 text-[#3fb950] text-[11px]"
              style={{ fontFamily: MONO }}
            >
              published
            </span>
          </div>
        </div>
      </nav>

      <main>
        <article
          className="max-w-[720px] mx-auto"
          style={{ fontFamily: MONO }}
        >
          {/* ─── Title Block ─── */}
          <header className="px-6 pt-14 pb-10 border-b border-[#30363d]">
            <p className="text-[11px] tracking-[4px] mb-3 font-bold text-[#3fb950]">
              {"// PRIVACY POLICY"}
            </p>
            <h1 className="text-[32px] md:text-[40px] font-bold text-[#e6edf3] leading-[1.15] mb-6">
              BIA Course Helper — Privacy Policy
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#8b949e]">
              <span>Effective: {EFFECTIVE_DATE}</span>
              <span>Last updated: {LAST_UPDATED}</span>
            </div>
          </header>

          {/* ─── 1. Single Purpose ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 01 · SINGLE PURPOSE"}</SectionLabel>
            <SectionHeading>What the extension does</SectionHeading>
            <Prose>
              <p>
                BIA Course Helper is a browser extension built by the Bridging
                Internationals Association (BIA) at USC. It has one purpose:
                help USC students plan their schedules by showing
                RateMyProfessors (RMP) ratings, counting open seats,
                highlighting schedule conflicts, and recommending courses on
                USC registration pages.
              </p>
              <p>
                Everything described below is in service of that single
                purpose. We do not use the extension to do anything else.
              </p>
            </Prose>
          </section>

          {/* ─── 2. Website Content Accessed ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 02 · WEBSITE CONTENT"}</SectionLabel>
            <SectionHeading>What the extension reads</SectionHeading>
            <Prose>
              <p>
                When you open a USC registration page — specifically{" "}
                <code className="bg-[#1c2128] border border-[#30363d] rounded px-1.5 py-0.5 text-[13px] text-[#e3b341]">
                  webreg.usc.edu
                </code>{" "}
                or{" "}
                <code className="bg-[#1c2128] border border-[#30363d] rounded px-1.5 py-0.5 text-[13px] text-[#e3b341]">
                  classes.usc.edu
                </code>{" "}
                — the extension reads visible course information that is
                already displayed on that page. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Course codes, titles, and descriptions.</li>
                <li>Instructor names.</li>
                <li>Section numbers, meeting times, days, and locations.</li>
                <li>Seat counts and enrollment status.</li>
              </ul>
              <p>
                The extension does not read content from any other website. It
                does not access your email, your browsing history, or tabs
                outside the two USC domains listed above.
              </p>
            </Prose>
          </section>

          {/* ─── 3. Local Storage ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 03 · LOCAL STORAGE"}</SectionLabel>
            <SectionHeading>What is stored on your device</SectionHeading>
            <Prose>
              <p>
                The extension uses Chrome&apos;s{" "}
                <code className="bg-[#1c2128] border border-[#30363d] rounded px-1.5 py-0.5 text-[13px] text-[#e3b341]">
                  storage
                </code>{" "}
                permission to save two kinds of information locally in your
                browser:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-[#e6edf3]">Your settings</strong> —
                  for example, which features you&apos;ve enabled and which
                  semester you&apos;re planning for.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">Caches</strong> — copies of
                  professor ratings and course details we&apos;ve already
                  fetched, so the extension loads faster and avoids repeat
                  network requests.
                </li>
              </ul>
              <p>
                This data stays on your device. Uninstalling the extension
                removes it.
              </p>
            </Prose>
          </section>

          {/* ─── 4. Data Sent to BIA ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 04 · DATA SENT TO BIA SERVERS"}</SectionLabel>
            <SectionHeading>
              What gets sent to bia-roommate.vercel.app
            </SectionHeading>
            <Prose>
              <p>
                Some features require looking up information that is not on the
                USC page itself. For those, the extension sends small, specific
                requests to our server at{" "}
                <code className="bg-[#1c2128] border border-[#30363d] rounded px-1.5 py-0.5 text-[13px] text-[#e3b341]">
                  bia-roommate.vercel.app
                </code>
                :
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong className="text-[#e6edf3]">Professor names</strong>{" "}
                  are sent to our RMP endpoints (
                  <code className="text-[13px] text-[#8b949e]">
                    /api/rmp/search
                  </code>
                  ,{" "}
                  <code className="text-[13px] text-[#8b949e]">
                    /api/rmp/batch
                  </code>
                  ) so we can return ratings for display.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">
                    Course codes and semester identifiers
                  </strong>{" "}
                  (for example,{" "}
                  <code className="text-[13px] text-[#8b949e]">
                    CSCI-201, 20263
                  </code>
                  ) are sent to our course endpoints (
                  <code className="text-[13px] text-[#8b949e]">
                    /api/courses/{"{DEPT}"}/{"{NUMBER}"}
                  </code>
                  ,{" "}
                  <code className="text-[13px] text-[#8b949e]">
                    /api/courses/ge
                  </code>
                  ) so we can return course details and GE category listings.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">Interest text</strong>{" "}
                  that you type into the recommendation feature is sent to{" "}
                  <code className="text-[13px] text-[#8b949e]">
                    /api/courses/recommend
                  </code>{" "}
                  so we can return suggested courses.
                </li>
              </ul>
              <p>
                We send only what is needed for the feature you are using. We
                do not send your USC ID, name, password, or any account
                credentials.
              </p>
            </Prose>
          </section>

          {/* ─── 5. What We Don't Do ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 05 · WHAT WE DON'T DO"}</SectionLabel>
            <SectionHeading>No sale, no ads, no tracking</SectionHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-2">
                <li>We do not sell your data.</li>
                <li>
                  We do not share your data with third parties for advertising
                  or marketing.
                </li>
                <li>
                  We do not build advertising profiles or track you across
                  websites.
                </li>
                <li>
                  We do not transfer your data outside of what the extension&apos;s
                  stated purpose requires.
                </li>
              </ul>
              <p>
                Our use of any information we receive matches the extension&apos;s
                single purpose stated above.
              </p>
            </Prose>
          </section>

          {/* ─── 6. Server Logs ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 06 · SERVER LOGS"}</SectionLabel>
            <SectionHeading>Standard operational logs</SectionHeading>
            <Prose>
              <p>
                Our server is hosted on Vercel. Like most web hosts, Vercel
                records standard request metadata when the extension talks to
                our API. That metadata can include your IP address, the
                timestamp of the request, the endpoint called, and your
                browser&apos;s user-agent string.
              </p>
              <p>
                We use these logs only to keep the service running and to
                protect against abuse (for example, rate-limiting). We do not
                use them for advertising, profiling, or resale.
              </p>
            </Prose>
          </section>

          {/* ─── 7. Data Retention ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 07 · DATA RETENTION"}</SectionLabel>
            <SectionHeading>How long data is kept</SectionHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-[#e6edf3]">Local caches</strong>{" "}
                  expire on a short TTL and are cleared when you uninstall the
                  extension.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">Server logs</strong> are
                  retained per Vercel&apos;s standard retention window for
                  operational and security purposes.
                </li>
                <li>
                  We do not maintain a separate user database for the
                  extension.
                </li>
              </ul>
            </Prose>
          </section>

          {/* ─── 8. Your Choices ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 08 · YOUR CHOICES"}</SectionLabel>
            <SectionHeading>Controlling your data</SectionHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-[#e6edf3]">Uninstall</strong> — remove
                  the extension to stop all data access and clear locally
                  stored settings and caches.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">Disable features</strong>{" "}
                  — turn off individual features in the extension&apos;s popup
                  to stop the network requests they make.
                </li>
                <li>
                  <strong className="text-[#e6edf3]">Contact us</strong> — if
                  you&apos;d like us to review or delete server-side logs
                  associated with your IP, email us at the address below.
                </li>
              </ul>
            </Prose>
          </section>

          {/* ─── 9. Children's Privacy ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 09 · CHILDREN'S PRIVACY"}</SectionLabel>
            <SectionHeading>Intended audience</SectionHeading>
            <Prose>
              <p>
                The extension is intended for USC students and is not directed
                to children under 13. We do not knowingly collect information
                from children under 13.
              </p>
            </Prose>
          </section>

          {/* ─── 10. Changes ─── */}
          <section className="px-6 py-10 border-b border-[#30363d]">
            <SectionLabel>{"// 10 · CHANGES"}</SectionLabel>
            <SectionHeading>Updates to this policy</SectionHeading>
            <Prose>
              <p>
                If we change how the extension handles data, we will update
                this page and change the &ldquo;Last updated&rdquo; date at the
                top. Continued use of the extension after an update means you
                accept the revised policy.
              </p>
            </Prose>
          </section>

          {/* ─── 11. Contact ─── */}
          <section className="px-6 py-12">
            <SectionLabel>{"// 11 · CONTACT"}</SectionLabel>
            <SectionHeading>Get in touch</SectionHeading>
            <Prose>
              <p>
                Questions, concerns, or requests about this policy? Email us:
              </p>
              <p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[#58a6ff] hover:text-[#79c0ff] underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-[13px] text-[#8b949e] pt-4">
                Bridging Internationals Association (BIA) · University of
                Southern California
              </p>
            </Prose>
          </section>

          {/* ─── Footer spacer ─── */}
          <div className="px-6 py-10 border-t border-[#30363d]">
            <p
              className="text-[11px] text-[#484f58] text-center"
              style={{ fontFamily: MONO }}
            >
              {"// END OF POLICY · BIA @ USC · EST. 2024"}
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
