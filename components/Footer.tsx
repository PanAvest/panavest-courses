import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/40 transition"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-[color:var(--color-bg)] border-t border-light">
      {/* Full width, modest side padding */}
      <div className="w-full px-4 md:px-6 py-10">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <Image src={logo} alt="Panavest" className="h-12 w-auto" sizes="48px" unoptimized />
            <p className="text-sm text-muted max-w-sm">
              PanAvest delivers certified CPD (CPPD) knowledge and practical learning
              pathways for modern professionals across leadership, analytics, project
              management and supply chain.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Programs</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link href="/courses/leadership-development" className="hover:text-ink">Leadership Development</Link></li>
              <li><Link href="/courses/data-analysis-python" className="hover:text-ink">Data Analysis with Python</Link></li>
              <li><Link href="/courses/project-management-essentials" className="hover:text-ink">Project Management</Link></li>
              <li><Link href="/courses/intro-marketing" className="hover:text-ink">Marketing Fundamentals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Why PanAvest</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>CPD (CPPD) certified knowledge</li>
              <li>Hands-on assessments & certificates</li>
              <li>Industry-relevant projects</li>
              <li>Flexible learning</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Connect</h4>
            <div className="mt-3 flex items-center gap-3">
              {/* Replace links with your official handles when ready */}
              <SocialLink href="https://x.com/PanAvest_Int" label="X">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Zm-2.08 16.2h1.64L7.9 4.71H6.2l9.964 14.49Z"/></svg>
              </SocialLink>
              <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.75-2.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"/></svg>
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.64h.05A4.17 4.17 0 0 1 18.7 9c3.3 0 3.9 2.17 3.9 5v7h-4v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.29V21h-4z"/></svg>
              </SocialLink>
              <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3V9.25c0-.87.24-1.47 1.5-1.47h1V5.09C15.7 5.06 14.9 5 14 5a3.6 3.6 0 0 0-3.86 3.95V11H7v3h3v7h3.5Z"/></svg>
              </SocialLink>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-muted">
          PanAvest Supply Chain Compendium is the only one of its kind in the world, credited by the National Council for Curriculum and Assessment (NaCCA).
        </div>

        <div className="mt-4 text-xs text-muted">© {new Date().getFullYear()} PanAvest. All rights reserved.</div>
      </div>
    </footer>
  );
}
