const BASE_PATH = import.meta.env.BASE_URL ?? "/";

export default function Navbar() {
  return (
    <header className="fixed top-6 left-1/2 z-50 -translate-x-1/2 w-full max-w-2xl px-4">
      <nav className="flex items-center justify-between gap-8 rounded-full border border-white/10 bg-glass px-8 py-4 shadow-[0_0_30px_rgba(0,255,128,0.15)] backdrop-blur-xl">
        {/* Logo + Title */}
        <a
          href={`${BASE_PATH}`}
          className="flex items-center gap-2 transition hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,255,128,0.6)] font-medium"
          aria-label="GridCast Home"
        >
          <span
            className="text-2xl drop-shadow-[0_0_8px_rgba(0,255,128,0.4)]"
            role="img"
            aria-label="Lightning"
          >
            ⚡
          </span>
          <span className="text-xl font-bold tracking-tight text-white">
            GridCast
          </span>
        </a>

        {/* Nav links */}
        <ul className="flex items-center gap-6 text-sm text-white/70">
          <li>
            <a
              href={`${BASE_PATH}dashboard`}
              className="transition hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,255,128,0.6)] font-medium"
            >
              Dashboard
            </a>
          </li>
          <li>
            <a
              href="#datacenters"
              className="transition hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,255,128,0.6)] font-medium"
            >
              More Info
            </a>
          </li>

          <li>
            <a
              href="/dsc-106-final-proj/contact"
              className="transition hover:text-neon hover:drop-shadow-[0_0_8px_rgba(0,255,128,0.6)] font-medium"
            >
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
