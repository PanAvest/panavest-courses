import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-white border-b border-light">
      {/* Fixed row height; no vertical padding so the logo can fill it */}
      <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10 h-16 md:h-20 flex items-center justify-between">
        {/* Logo only, fills the row height */}
        <Link href="/" className="flex items-center">
  <Image
    src="/logo.png?v=2"         // cache-bust just in case
    alt="Panavest"
    width={256}                 // intrinsic (any big number)
    height={256}
    className="block h-12 md:h-15 w-auto"  // <-- fills row height, keeps aspect
    priority
  />
</Link>


        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Categories</Link>
          <Link href="/about" className="text-sm text-muted hover:text-ink">About</Link>
          <Link
            href="/auth/sign-up"
            className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}
