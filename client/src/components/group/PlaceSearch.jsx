import { useEffect, useRef, useState } from 'react';
import { placesApi } from '../../api/endpoints';
import { parseApiError } from '../../api/client';
import Spinner from '../ui/Spinner';

const DEBOUNCE_MS = 350;

/**
 * Type-ahead over the server's Google Places proxy. The request is debounced and
 * every in-flight search is cancelled when a newer keystroke arrives, so results
 * can never land out of order.
 */
export default function PlaceSearch({ onSelect, selected }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = await placesApi.search(trimmed, { signal: controller.signal });
        setResults(data.results);
        setSource(data.source);
        setError('');
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(parseApiError(err, 'Place search is unavailable.').message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div>
      <label className="label" htmlFor="place-search">
        Search a destination
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true">
          🔍
        </span>
        <input
          id="place-search"
          type="search"
          className="field pl-9"
          placeholder="Kyoto, Lisbon, Banff…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner className="h-4 w-4" label="Searching places" />
          </span>
        )}
      </div>

      {source === 'fallback' && results.length > 0 && (
        <p className="mt-1.5 text-xs text-amber-700">
          Showing built-in destinations — add a GOOGLE_PLACES_API_KEY for live Google results.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto scroll-slim" role="listbox">
          {results.map((place) => {
            const isSelected = selected?.placeId === place.placeId;
            return (
              <li key={place.placeId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(place)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/50'
                  }`}
                >
                  <span className="mt-0.5 text-lg" aria-hidden="true">
                    📍
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{place.name}</span>
                    <span className="block truncate text-xs text-ink-500">{place.address}</span>
                    {place.summary && <span className="mt-0.5 block line-clamp-2 text-xs text-ink-400">{place.summary}</span>}
                  </span>
                  {place.rating != null && (
                    <span className="shrink-0 text-xs font-semibold text-amber-600">★ {place.rating.toFixed(1)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 text-sm text-ink-500">No places matched “{query.trim()}”. Try a different search.</p>
      )}
    </div>
  );
}
