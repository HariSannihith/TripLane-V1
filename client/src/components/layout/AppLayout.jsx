import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:px-6">
          <p>TripLane — plan group trips without the group chat chaos.</p>
          <p>Built with the MERN stack.</p>
        </div>
      </footer>
    </div>
  );
}
