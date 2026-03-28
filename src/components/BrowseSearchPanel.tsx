import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  onEditRecipe: (recipe: RecipeRecord) => void;
  onRecipeDeleted?: () => void;
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

/** First N characters of instructions; if longer, append "...". */
const INSTRUCTION_PREVIEW_MAX_CHARS = 80;

function recipeDescriptionPreview(instructions?: string): string | null {
  if (instructions == null) return null;
  const text = String(instructions).trim();
  if (!text) return null;
  if (text.length <= INSTRUCTION_PREVIEW_MAX_CHARS) return text;
  return `${text.slice(0, INSTRUCTION_PREVIEW_MAX_CHARS)}...`;
}

/** Client-side filter: substring match on recipe title only (case-insensitive). */
function titleMatchesSearch(r: RecipeRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (r.title || '').toLowerCase().includes(needle);
}

function RecipeCard({
  recipe: r,
  onEdit,
  onDelete,
  deletePending,
}: {
  recipe: RecipeRecord;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const ingredientsLine = ingredientPreview(r);
  const descriptionLine = recipeDescriptionPreview(r.instructions);
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

        {hasTime ? (
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone-600">
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
          </div>
        ) : null}

        <div className="mt-3 overflow-hidden rounded-xl border border-stone-200/90 bg-gradient-to-b from-stone-50/70 to-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-stone-950/[0.04]">
          <div className="divide-y divide-stone-100/90">
            <div className="flex gap-3.5 p-3.5 sm:p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-200/50"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M4.125 6.75h.008v.008H4.125V6.75zm0 5.25h.008v.008H4.125v-.008zm0 5.25h.008v.008H4.125v-.008z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-stone-500">
                  Ingredients
                </p>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-stone-800">
                  {ingredientsLine ? (
                    <span className="text-stone-700">{ingredientsLine}</span>
                  ) : (
                    <span className="italic text-stone-400">No ingredients listed</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3.5 p-3.5 sm:p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50/80 text-teal-800 shadow-sm ring-1 ring-teal-200/45"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-stone-500">
                  Instructions
                </p>
                <p className="mt-1.5 break-words text-[0.9375rem] leading-relaxed text-stone-800">
                  {descriptionLine ? (
                    descriptionLine
                  ) : (
                    <span className="italic text-stone-400">No instructions</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition hover:border-amber-300/80 hover:bg-amber-50/50 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Edit ${r.title || 'recipe'}`}
            title="Edit recipe"
            disabled={deletePending}
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/90 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
            aria-label={`Delete ${r.title || 'recipe'}`}
            title={r._id ? 'Delete recipe from database' : 'Cannot delete without an id'}
            disabled={deletePending || !r._id}
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {deletePending ? 'Deleting…' : 'Delete'}
          </button>
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

export function BrowseSearchPanel({ reloadKey, onEditRecipe, onRecipeDeleted }: BrowseSearchPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [slowLoadHint, setSlowLoadHint] = useState(false);

  useEffect(() => {
    setDeleteError(null);
  }, [reloadKey]);

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
              instructions:
                typeof o.instructions === 'string'
                  ? o.instructions
                  : o.instructions != null
                    ? String(o.instructions)
                    : undefined,
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
    return recipes.filter((r) => titleMatchesSearch(r, query));
  }, [recipes, query]);

  const searchBusy = loading && recipes.length === 0 && !error;

  useEffect(() => {
    if (!searchBusy) {
      setSlowLoadHint(false);
      return;
    }
    setSlowLoadHint(false);
    const id = window.setTimeout(() => setSlowLoadHint(true), 2500);
    return () => window.clearTimeout(id);
  }, [searchBusy]);

  async function handleDeleteRecipe(recipe: RecipeRecord) {
    if (!recipe._id) return;
    const label = recipe.title?.trim() || 'Untitled';
    if (
      !window.confirm(`Delete “${label}”? This removes it from the database and cannot be undone.`)
    ) {
      return;
    }
    setDeleteError(null);
    setDeletingId(recipe._id);
    try {
      const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(recipe._id)}`, {
        method: 'DELETE',
      });
      const text = await res.text();
      if (!res.ok) {
        setDeleteError(text || `Delete failed (${res.status})`);
        return;
      }
      onRecipeDeleted?.();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Network error while deleting');
    } finally {
      setDeletingId(null);
    }
  }

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
          Every recipe from the server in one place. Search matches the recipe title only. The filter is stored
          in the URL as <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.8rem]">?q=…</code> so
          you can refresh or share a link.
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
          onChange={(e) => {
            const v = e.target.value;
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                if (v) next.set('q', v);
                else next.delete('q');
                return next;
              },
              { replace: true }
            );
          }}
          placeholder="Search by title…"
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

      {deleteError && (
        <div
          className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Couldn’t delete recipe</p>
          <p className="mt-1 text-red-800/90">{deleteError}</p>
        </div>
      )}

      {searchBusy ? (
        <div className="space-y-4" aria-busy="true">
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-stone-800 shadow-sm ring-1 ring-amber-900/5"
          >
            <p className="font-medium text-stone-900">Loading your recipes…</p>
            <p className="mt-1.5 leading-relaxed text-stone-600">
              The first request after idle can take a few seconds while the server wakes up.
            </p>
            {slowLoadHint ? (
              <p className="mt-2 leading-relaxed text-stone-600">Still connecting… thanks for waiting.</p>
            ) : null}
          </div>
          <ListSkeleton />
        </div>
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
              ? `No recipe title contains “${query.trim()}”. Try another title search.`
              : 'Add your first recipe with “New recipe” in the sidebar.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r._id || r.title}>
              <RecipeCard
                recipe={r}
                onEdit={() => onEditRecipe(r)}
                onDelete={() => handleDeleteRecipe(r)}
                deletePending={deletingId === r._id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
