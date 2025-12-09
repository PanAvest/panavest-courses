// app/privacy/page.tsx

export default function PrivacyPolicy() {
  return (
    <main className="bg-[color:var(--color-bg)]">
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="rounded-3xl bg-white border border-[color:var(--color-light)] shadow-sm p-6 sm:p-10 lg:p-12 space-y-8">
          <header className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-wide text-[color:var(--color-muted)]">Privacy Policy</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[color:var(--color-ink)]">KDS Learning Privacy Policy</h1>
            <p className="text-[color:var(--color-ink)]/80 max-w-3xl mx-auto">
              KDS Learning (“the App”) is a digital platform provided by PanAvest International &amp; Partners that enables
              learners to access their purchased knowledge programs, secure e-books, assessments, certificates, and related
              educational resources. By using KDS Learning, you agree to the practices described in this Privacy Policy.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">1. Information We Collect</h2>
            <p className="text-[color:var(--color-ink)]/80">
              We collect only the information necessary to operate the platform and provide you with access to your purchased knowledge programs.
            </p>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">A. Information You Provide Directly</h3>
              <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-ink)]/80">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Professional or organizational details (optional)</li>
                <li>Support requests or feedback</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">B. Information Collected Automatically</h3>
              <p className="text-[color:var(--color-ink)]/80">When you use the App or website, we may collect:</p>
              <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-ink)]/80">
                <li>Device information (model, OS version, unique IDs)</li>
                <li>IP address and country</li>
                <li>App activity (e.g., chapters viewed, assessments taken)</li>
                <li>Crash logs and diagnostic reports</li>
                <li>Login timestamps</li>
                <li>App version installed</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">C. Program &amp; Assessment Records</h3>
              <p className="text-[color:var(--color-ink)]/80">To allow smooth learning progress, we store:</p>
              <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-ink)]/80">
                <li>Knowledge program enrollment</li>
                <li>Reading progress</li>
                <li>Assessment attempts and results</li>
                <li>Certificate issuance records</li>
                <li>CPPD/CPD points earned</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">D. No Sensitive Data</h3>
              <p className="text-[color:var(--color-ink)]/80">
                KDS Learning does not collect financial information, payment card numbers, health data, biometric data, or government IDs.
                All payments are securely processed on our website via approved payment processors. The mobile app does not handle or store financial information.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">2. How We Use Your Information</h2>
            <p className="text-[color:var(--color-ink)]/80">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1 text-[color:var(--color-ink)]/80">
              <li>Authenticate your account and provide secure access</li>
              <li>Unlock knowledge programs you have purchased</li>
              <li>Sync progress across devices</li>
              <li>Deliver secure e-book content</li>
              <li>Maintain your CPPD progress and certificates</li>
              <li>Improve App performance and user experience</li>
              <li>Provide customer support</li>
              <li>Ensure platform security and prevent misuse</li>
            </ul>
            <p className="text-[color:var(--color-ink)]/80">We do not sell or rent your data to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">3. How We Share Information</h2>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">A. Service Providers</h3>
              <p className="text-[color:var(--color-ink)]/80">
                We use trusted third-party services such as Supabase (authentication, database, secure file hosting) plus cloud hosting and analytics tools.
                These providers are contractually required to protect your information.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">B. Legal Requirements</h3>
              <p className="text-[color:var(--color-ink)]/80">We may disclose data if required to comply with applicable law, court orders, or government regulations.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-[color:var(--color-ink)]">C. No Third-Party Marketing</h3>
              <p className="text-[color:var(--color-ink)]/80">Your information is never shared for advertising or marketing purposes.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">4. Data Security</h2>
            <p className="text-[color:var(--color-ink)]/80">
              KDS Learning uses industry-standard security measures including encrypted HTTPS connections, encrypted password storage, access controls,
              secure content delivery with anti-copy protections, and regular security and infrastructure audits. While no system is 100% secure,
              we take every reasonable step to protect your information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">5. Data Retention</h2>
            <p className="text-[color:var(--color-ink)]/80">
              We retain your information for as long as your account is active or as needed for certification records, CPPD developmental tracking,
              and compliance with legal or institutional requirements. You may request account deletion at any time (see Section 9).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">6. Children’s Privacy</h2>
            <p className="text-[color:var(--color-ink)]/80">
              KDS Learning is intended for professional adult learners (18+). We do not knowingly collect personal data from individuals under 18.
              If such data is detected, it will be deleted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">7. User Rights</h2>
            <p className="text-[color:var(--color-ink)]/80">
              Depending on your location, you may have the right to access, update, correct, delete, or request a copy of your stored data,
              and to withdraw consent for specific processing activities. To exercise these rights, contact us at{" "}
              <a href="mailto:support@panavestkds.com" className="text-[color:var(--color-brand)] underline">
                support@panavestkds.com
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">8. International Data Transfers</h2>
            <p className="text-[color:var(--color-ink)]/80">
              Our servers and service providers may operate in different countries. By using KDS Learning, you consent to the transfer of your data to regions where our infrastructure
              is hosted, subject to secure and lawful data protection practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">9. Account Deletion</h2>
            <p className="text-[color:var(--color-ink)]/80">
              You may request account deletion by contacting{" "}
              <a href="mailto:support@panavestkds.com" className="text-[color:var(--color-brand)] underline">
                support@panavestkds.com
              </a>. Once deleted, your learning records, certificates, and CPPD progress will no longer be recoverable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">10. Changes to This Privacy Policy</h2>
            <p className="text-[color:var(--color-ink)]/80">
              We may update this Privacy Policy occasionally. When changes are made, we will update the Effective Date. Continued use of the App means you accept the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">11. Contact Us</h2>
            <p className="text-[color:var(--color-ink)]/80">
              For questions, support, or privacy concerns, contact:
            </p>
            <div className="space-y-1 text-[color:var(--color-ink)]/80">
              <div>PanAvest International &amp; Partners</div>
              <div>
                <a href="mailto:social@panavest.com" className="text-[color:var(--color-brand)] underline">
                  social@panavest.com
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
