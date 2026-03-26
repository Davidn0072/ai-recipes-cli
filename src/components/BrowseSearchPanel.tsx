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

function difficultyBadgeClass(difficulty?: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-900 ring-1 ring-amber-500/25';
    case 'hard':
      return 'bg-rose-500/10 text-rose-800 ring-1 ring-rose-500/20';
    default:
      return 'bg-stone-500/10 text-stone-700 ring-1 ring-stone-500/15';
  }
}

function formatDifficultyLabel(d?: string): string {
  if (!d) return '—';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function ingredientPreview(r: RecipeRecord): string | null {
  const ing = (r.ingredients ?? []).filter(Boolean);
  if (!ing.length) return null;
  const text = ing.slice(0, 4).join(' · ');
  return ing.length > 4 ? `${text}…` : text;
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

function RecipeCard({ recipe: r }: { recipe: RecipeRecord }) {
  const ingredientsLine = ingredientPreview(r);
  const hasTime = r.cooking_time != null && r.cooking_time > 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm ring-1 ring-stone-950/[0.04] transition duration-200 hover:border-amber-200/70 hover:shadow-md">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-amber-600 opacity-90 transition group-hover:opacity-100" />
      <div className="pl-3">
        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
          <h3 className="min-w-0 flex-1 font-serif text-lg font-medium leading-snug text-stone-900">
            {r.title || '(Untitled)'}
          </h3>
          {r.difficulty ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyBadgeClass(r.difficulty)}`}
            >
              {formatDifficultyLabel(r.difficulty)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
          {hasTime ? (
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-4 w-4 shrink-0 text-amber-600/80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{r.cooking_time} min</span>
            </span>
          ) : null}
          {hasTime && ingredientsLine ? (
            <span className="hidden text-stone-300 sm:inline" aria-hidden>
              ·
            </span>
          ) : null}
          {ingredientsLine ? (
            <span className="min-w-0 text-stone-500">{ingredientsLine}</span>
          ) : !hasTime ? (
            <span className="text-stone-400 italic">No ingredients listed</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-stone-100 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-5 w-2/3 rounded bg-stone-200/80" />
          <div className="mt-3 h-4 w-full max-w-sm rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
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

  const searchBusy = loading && recipes.length === 0 && !error;

  return (
    <div className="space-y-8">
      <header className="border-b border-stone-200/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/90">
          Your collection
        </p>
        <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-stone-900">
          Browse & search
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
          Every recipe from the server in one place. Search by name, ingredient, or anything in the
          instructions.
        </p>
      </header>

      <div className="relative">
        <label htmlFor="recipe-search" className="sr-only">
          Search recipes
        </label>
        <span
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400"
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
          placeholder="Search recipes…"
          disabled={searchBusy}
          className="w-full rounded-2xl border border-stone-200/90 bg-white py-3.5 pl-12 pr-4 text-stone-900 shadow-sm placeholder:text-stone-400 transition focus:border-amber-400/80 focus:outline-none focus:ring-4 focus:ring-amber-500/15 disabled:opacity-60"
        />
      </div>

      {!searchBusy && recipes.length > 0 && (
        <p className="text-sm text-stone-500">
          Showing{' '}
          <span className="font-medium tabular-nums text-stone-800">{filtered.length}</span>
          {query.trim() ? (
            <>
              {' '}
              of <span className="font-medium tabular-nums text-stone-800">{recipes.length}</span>
            </>
          ) : null}{' '}
          recipe{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      {error && (
        <div
          className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Couldn’t load recipes</p>
          <p className="mt-1 text-red-800/90">{error}</p>
        </div>
      )}

      {searchBusy ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="font-medium text-stone-800">
            {query.trim() ? 'No matches' : 'No recipes yet'}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {query.trim()
              ? `Nothing matches “${query.trim()}”. Try different words.`
              : 'Add your first recipe with “New recipe” in the sidebar.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r._id || r.title}>
              <RecipeCard recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
