import { useMemo, useState } from 'react';
import { Sidebar, type SidebarView } from './components/Sidebar';

function BrowseSearchPanel() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const sample = [
      { id: '1', title: 'Tomato basil soup', tags: 'Soup · Vegetarian' },
      { id: '2', title: 'Lemon roast chicken', tags: 'Main · Comfort' },
      { id: '3', title: 'Chocolate olive oil cake', tags: 'Dessert · Baking' },
    ];
    const q = query.trim().toLowerCase();
    if (!q) return sample;
    return sample.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          Browse & search
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          See every recipe or narrow the list with a quick search.
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
          placeholder="Search by title or tag…"
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
        />
      </div>
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-stone-500">
            No recipes match “{query.trim()}”. Try another word.
          </li>
        ) : (
          filtered.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 px-4 py-4 first:rounded-t-xl last:rounded-b-xl hover:bg-stone-50/80"
            >
              <span className="font-medium text-stone-900">{r.title}</span>
              <span className="text-xs text-stone-500">{r.tags}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function NewRecipePanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          New recipe
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Draft a new recipe here. Form fields and saving will connect when you
          wire the API.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-6 py-12 text-center text-sm text-stone-500">
        Recipe form placeholder — title, ingredients, steps.
      </div>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          About
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Kitchen notes is a client for your recipe collection.
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-relaxed text-stone-700">
          Use the sidebar to browse and search recipes, add new ones, or read
          this page. This build is frontend-only; no server calls are made.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<SidebarView>('browse');

  return (
    <div className="flex min-h-screen bg-stone-100 text-stone-900">
      <Sidebar active={view} onSelect={setView} />
      <main className="min-w-0 flex-1 overflow-auto p-8 md:p-10">
        <div className="mx-auto max-w-2xl">
          {view === 'browse' && <BrowseSearchPanel />}
          {view === 'new-recipe' && <NewRecipePanel />}
          {view === 'about' && <AboutPanel />}
        </div>
      </main>
    </div>
  );
}

export default App;
