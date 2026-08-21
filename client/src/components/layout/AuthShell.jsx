import { Logo } from './Navbar';

const HIGHLIGHTS = [
  { icon: '📍', title: 'Suggest destinations', body: 'Search real places and pitch them to the group.' },
  { icon: '🗳️', title: 'Vote, once each', body: 'One vote per member, switchable until the trip is locked.' },
  { icon: '⏳', title: 'Watch it count down', body: 'A live countdown once the winning trip is set.' },
];

/** Split layout shared by the sign-in and sign-up screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
      <div className="order-2 hidden lg:order-1 lg:block">
        <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-10 text-white shadow-lift">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative">
            <h2 className="max-w-sm text-3xl font-extrabold leading-tight">
              Six friends, six ideas, one trip everyone agrees on.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100">
              TripLane turns the endless group chat into a shared plan: suggest places, set the budget and dates,
              vote, and lock in the winner.
            </p>
            <ul className="mt-10 space-y-5">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-brand-100">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="order-1 flex flex-col justify-center lg:order-2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>}
        </div>
      </div>
    </div>
  );
}
