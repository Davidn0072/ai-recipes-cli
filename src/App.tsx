import { useState } from 'react';
import { BrowseSearchPanel } from './components/BrowseSearchPanel';
import { CreateRecipeModal } from './components/CreateRecipeModal';
import { Sidebar, type SidebarView } from './components/Sidebar';

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
          Use the sidebar to browse recipes from the API, add new ones, or read
          this page.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<SidebarView>('browse');
  const [createRecipeOpen, setCreateRecipeOpen] = useState(false);
  const [recipeListKey, setRecipeListKey] = useState(0);

  return (
    <div className="flex h-screen min-h-0 bg-stone-100 text-stone-900">
      <Sidebar
        active={view}
        onSelect={setView}
        onNewRecipe={() => setCreateRecipeOpen(true)}
      />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto py-6 pl-6 pr-6 md:py-8 md:pl-8 md:pr-10">
        <div className="w-full max-w-2xl">
          {view === 'browse' && <BrowseSearchPanel reloadKey={recipeListKey} />}
          {view === 'about' && <AboutPanel />}
        </div>
      </main>
      <CreateRecipeModal
        open={createRecipeOpen}
        onClose={() => setCreateRecipeOpen(false)}
        onCreated={() => setRecipeListKey((k) => k + 1)}
      />
    </div>
  );
}

export default App;
