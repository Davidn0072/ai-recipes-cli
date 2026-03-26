import { useState } from 'react';
import { BrowseSearchPanel, type RecipeRecord } from './components/BrowseSearchPanel';
import { CreateRecipeModal } from './components/CreateRecipeModal';
import { Sidebar, type SidebarView } from './components/Sidebar';

function AboutPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          About
        </h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600">
          <span className="font-medium text-stone-800">Kitchen notes</span> is a small full-stack app for
          collecting recipes: browse, search by title, create, edit, delete, and optionally draft cooking steps
          with AI—everything stays in sync with your own backend.
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800/90">
          How this project is built
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700">
          <li>
            <span className="font-medium text-stone-900">Frontend</span> — React and TypeScript, bundled with
            Vite and styled with Tailwind CSS. The API base URL comes from environment variables (
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.8rem] text-stone-800">
              VITE_API_URL
            </code>
            ).
          </li>
          <li>
            <span className="font-medium text-stone-900">Backend</span> — Node.js and Express expose a REST API
            for recipes (list, get by id, create, update, delete). Configuration (port, database URL, AI model)
            is read from a{' '}
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.8rem]">.env</code> file on the
            server.
          </li>
          <li>
            <span className="font-medium text-stone-900">Data</span> — MongoDB stores recipe documents via
            Mongoose. The UI loads the list from the API and filters search on the client by recipe title.
          </li>
          <li>
            <span className="font-medium text-stone-900">AI</span> — Optional “generate instructions” calls the
            backend, which uses the Vercel AI SDK against your configured model (e.g. via AI Gateway).
          </li>
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-stone-600">
          Use the sidebar to <span className="font-medium text-stone-800">Browse &amp; search</span> your
          collection or open <span className="font-medium text-stone-800">New recipe</span> to add or edit a
          dish.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800/90">Developer</p>
        <p className="mt-3 text-sm font-medium text-stone-900">David Nahmias</p>
        <p className="mt-2 text-sm">
          <a
            href="mailto:davidn0072@gmail.com"
            className="text-amber-800 underline decoration-amber-200/80 underline-offset-2 transition hover:text-amber-900"
          >
            davidn0072@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<SidebarView>('browse');
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeRecord | null>(null);
  const [recipeListKey, setRecipeListKey] = useState(0);

  const closeRecipeModal = () => {
    setRecipeModalOpen(false);
    setEditingRecipe(null);
  };

  return (
    <div className="flex h-screen min-h-0 bg-stone-100 text-stone-900">
      <Sidebar
        active={view}
        onSelect={setView}
        onNewRecipe={() => {
          setEditingRecipe(null);
          setRecipeModalOpen(true);
        }}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto py-6 pl-6 pr-6 md:py-8 md:pl-8 md:pr-10">
        <div className="w-full max-w-2xl">
          {view === 'browse' && (
            <BrowseSearchPanel
              reloadKey={recipeListKey}
              onEditRecipe={(recipe) => {
                setEditingRecipe(recipe);
                setRecipeModalOpen(true);
              }}
              onRecipeDeleted={() => setRecipeListKey((k) => k + 1)}
            />
          )}
          {view === 'about' && <AboutPanel />}
        </div>
      </main>
      <CreateRecipeModal
        open={recipeModalOpen}
        editingRecipe={editingRecipe}
        onClose={closeRecipeModal}
        onSuccess={() => setRecipeListKey((k) => k + 1)}
      />
    </div>
  );
}

export default App;
