import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png"; // <- use existing file

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-light">
      <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10 py-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src={logo}
            alt="Panavest"
            className="h-10 w-auto md:h-12"
            sizes="(max-width: 640px) 40px, 48px"
          />
          <span className="sr-only">Panavest</span>
        </Link>
        <p className="text-xs sm:text-sm text-muted">© {new Date().getFullYear()} PanAvest. All rights reserved.</p>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
