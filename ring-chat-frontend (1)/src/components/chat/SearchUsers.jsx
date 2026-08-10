import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { userService } from '../../services/userService';

export default function SearchUsers({ onSelectUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await userService.search(trimmed);
        setResults(data.users || data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username"
          className="h-10 w-full rounded-xl border border-line bg-surface-sunken pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:bg-surface-card focus:outline-none focus:shadow-ring"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface-card shadow-soft">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Spinner size={18} />
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              No people found for "{query}".
            </p>
          )}
          {!loading &&
            results.map((user) => (
              <button
                key={user._id || user.id}
                onClick={() => onSelectUser(user)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-sunken"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" status={user.status} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-muted">@{user.username}</p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
