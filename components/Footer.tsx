import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-light">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10 py-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between">
        {/* Logo only */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Panavest"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <span className="sr-only">Panavest</span>
        </Link>

        <p className="text-xs sm:text-sm text-muted">
          © {new Date().getFullYear()} PanAvest. All rights reserved.
        </p>

        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

