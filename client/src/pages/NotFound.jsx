import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="text-5xl" aria-hidden="true">🧭</span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-900">Off the map</h1>
      <p className="mt-3 text-sm text-ink-500">
        We could not find that page. It may have been removed, or the link might be wrong.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button size="lg">Back to my trips</Button>
      </Link>
    </div>
  );
}
