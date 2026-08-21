import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const STEPS = [
  {
    icon: '👥',
    title: 'Start a group',
    body: 'Create a trip, set the budget range and travel window, then share the six-character invite code.',
  },
  {
    icon: '📍',
    title: 'Suggest destinations',
    body: 'Search real places through Google Places, add a cost estimate, dates and the activities you have in mind.',
  },
  {
    icon: '🗳️',
    title: 'Vote it out',
    body: 'Everyone gets one vote. Switch it any time before the trip is locked — no double voting, ever.',
  },
  {
    icon: '🎉',
    title: 'Lock it in',
    body: 'The organiser finalises the winner, breaks any tie, and the countdown to departure starts ticking.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-ink-50" aria-hidden="true" />
        <div
          className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="chip bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
              Group trips, minus the arguing
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              Plan the trip <span className="text-brand-600">everyone</span> actually agrees on.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              TripLane gives your group one place to pitch destinations, compare costs against a shared budget, vote
              once each, and lock in the winner — with a live countdown to departure.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Go to my trips
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto">
                      Start planning free
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      I have an account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">How it works</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-500">
          Four steps from &ldquo;we should go somewhere&rdquo; to a booked-in date.
        </p>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card flex flex-col p-6 transition hover:shadow-lift">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">
                  {step.icon}
                </span>
                <span className="text-xs font-bold text-ink-300">0{index + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to settle the destination debate?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-300">
            Create a group, share the invite code, and let the votes decide.
          </p>
          <div className="mt-8">
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button size="lg">{isAuthenticated ? 'Open my dashboard' : 'Create your first trip'}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
