import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../api';

export type RecipeRecord = {
  _id: string;
  title: string;
  ingredients?: string[];
  instructions?: string;
  difficulty?: string;
  cooking_time?: number;
};

type BrowseSearchPanelProps = {
  reloadKey: number;
};

function formatSubtitle(r: RecipeRecord): string {
  const parts: string[] = [];
  if (r.difficulty) {
    parts.push(r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1));
  }
  if (r.cooking_time != null && r.cooking_time > 0) {
    parts.push(`${r.cooking_time} min`);
  }
  const ing = (r.ingredients ?? []).filter(Boolean);
  if (ing.length) {
    parts.push(ing.slice(0, 3).join(', ') + (ing.length > 3 ? '…' : ''));
  }
  return parts.join(' · ');
}

function matchesQuery(r: RecipeRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const blob = [
    r.title,
    ...(r.ingredients ?? []),
    r.instructions ?? '',
    r.difficulty ?? '',
    String(r.cooking_time ?? ''),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(needle);
}

export function BrowseSearchPanel({ reloadKey }: BrowseSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/recipes`);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Failed to load (${res.status})`);
        }
        const data: unknown = await res.json();
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setRecipes([]);
          return;
        }
        setRecipes(
          data.map((row) => {
            const o = row as Record<string, unknown>;
            const id = o._id != null ? String(o._id) : '';
            return {
              _id: id,
              title: typeof o.title === 'string' ? o.title : '',
              ingredients: Array.isArray(o.ingredients)
                ? o.ingredients.filter((x): x is string => typeof x === 'string')
                : [],
              instructions: typeof o.instructions === 'string' ? o.instructions : undefined,
              difficulty: typeof o.difficulty === 'string' ? o.difficulty : undefined,
              cooking_time: typeof o.cooking_time === 'number' ? o.cooking_time : undefined,
            };
          })
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load recipes');
          setRecipes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => matchesQuery(r, query));
  }, [recipes, query]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          Browse & search
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Recipes from your server. Filter by typing in the box below.
        </p>
      </div>
      <div className="relative">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <span
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, ingredients, instructions…"
          disabled={loading && recipes.length === 0 && !error}
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:opacity-60"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading && recipes.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-stone-500">Loading recipes…</li>
        ) : filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-stone-500">
            {query.trim()
              ? `No recipes match “${query.trim()}”. Try another word.`
              : 'No recipes yet. Use “New recipe” in the sidebar to add one.'}
          </li>
        ) : (
          filtered.map((r) => {
            const sub = formatSubtitle(r);
            return (
              <li
                key={r._id || r.title}
                className="flex flex-col gap-0.5 px-4 py-4 first:rounded-t-xl last:rounded-b-xl hover:bg-stone-50/80"
              >
                <span className="font-medium text-stone-900">{r.title || '(Untitled)'}</span>
                {sub ? <span className="text-xs text-stone-500">{sub}</span> : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
