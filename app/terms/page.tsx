"use client";

export default function TermsOfService() {
  return (
    <main className="bg-[color:var(--color-bg)]">
      <div className="mx-auto max-w-screen-lg px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-8 rounded-xl border border-[color:var(--color-light)]/40 bg-white p-6 shadow-sm sm:p-10 lg:p-12 transition-shadow duration-200 hover:shadow-md">
          <header className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-wide text-[color:var(--color-muted)]">Terms of Service</p>
            <h1 className="text-3xl font-bold text-[color:var(--color-ink)] sm:text-4xl">
              PanAvest / KDS Learning Terms
            </h1>
            <p className="mx-auto max-w-3xl text-[color:var(--color-ink)]/80">
              These Terms govern your access to and use of the KDS Learning platform (“Service”), provided by PanAvest
              International &amp; Partners. By using the Service you agree to these Terms.
            </p>
          </header>

          <Section title="1. Eligibility & Accounts">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>You must be 18+ and provide accurate registration details.</li>
              <li>Keep your credentials secure; you are responsible for activity on your account.</li>
              <li>We may suspend or terminate accounts for misuse or policy violations.</li>
            </ul>
          </Section>

          <Section title="2. Use of the Service">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>Content is licensed for personal, non-transferable educational use.</li>
              <li>Do not copy, redistribute, or circumvent content protections.</li>
              <li>No reverse engineering, automated scraping, or unauthorized access.</li>
            </ul>
          </Section>

          <Section title="3. Programs, Certificates, and Progress">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>Enrollment, progress, and certificates are tied to your individual account.</li>
              <li>We may verify completion data before issuing certificates or CPD/CPPD credits.</li>
            </ul>
          </Section>

          <Section title="4. Payments and Refunds">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>Payments are processed by approved third-party processors.</li>
              <li>Refunds, if any, follow the course- or product-specific policy at time of purchase.</li>
            </ul>
          </Section>

          <Section title="5. Privacy">
            <p className="text-[color:var(--color-ink)]/80">
              Our <a href="/privacy" className="underline text-[color:var(--color-brand)]">Privacy Policy</a> explains how we
              collect, use, and protect personal data. By using the Service, you agree to that policy.
            </p>
          </Section>

          <Section title="6. Security">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>We use industry-standard measures to secure accounts and content.</li>
              <li>Report suspected unauthorized access to support immediately.</li>
            </ul>
          </Section>

          <Section title="7. Prohibited Conduct">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>Sharing accounts or content downloads; removing DRM or copy protections.</li>
              <li>Uploading malicious code, interfering with Service operation, or abusing support channels.</li>
              <li>Using the Service for unlawful, infringing, or fraudulent activity.</li>
            </ul>
          </Section>

          <Section title="8. Disclaimers">
            <ul className="list-disc space-y-1 pl-5 text-[color:var(--color-ink)]/80">
              <li>The Service is provided “as is” and “as available.”</li>
              <li>We do not guarantee uninterrupted or error-free operation.</li>
              <li>Training outcomes, career results, or certification acceptance are not guaranteed.</li>
            </ul>
          </Section>

          <Section title="9. Limitation of Liability">
            <p className="text-[color:var(--color-ink)]/80">
              To the fullest extent permitted by law, PanAvest and its partners are not liable for indirect, incidental,
              special, or consequential damages, or loss of data or profits, arising from use of the Service.
            </p>
          </Section>

          <Section title="10. Termination">
            <p className="text-[color:var(--color-ink)]/80">
              We may suspend or terminate access for violations of these Terms or misuse of the Service. You may request
              account closure at any time; certain records (e.g., certificates, compliance logs) may be retained where legally required.
            </p>
          </Section>

          <Section title="11. Changes to Terms">
            <p className="text-[color:var(--color-ink)]/80">
              We may update these Terms periodically. Continued use after updates constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p className="text-[color:var(--color-ink)]/80">
              For questions about these Terms, contact support at <a href="mailto:support@panavestkds.com" className="underline text-[color:var(--color-brand)]">support@panavestkds.com</a>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
