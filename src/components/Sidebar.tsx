import { Link, useLocation } from 'react-router-dom';

function navButtonClass(isActive: boolean): string {
  return `group rounded-lg px-3 py-3 text-left transition-colors ${
    isActive
      ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/40'
      : 'text-stone-300 hover:bg-stone-900 hover:text-stone-50'
  }`;
}

function navDescriptionClass(isActive: boolean): string {
  return `mt-0.5 block text-xs ${
    isActive ? 'text-amber-200/80' : 'text-stone-500 group-hover:text-stone-400'
  }`;
}

export function Sidebar() {
  const { pathname } = useLocation();
  const browseActive = pathname === '/' || /^\/recipes\/[^/]+\/edit$/.test(pathname);
  const newActive = pathname === '/recipes/new';
  const aboutActive = pathname === '/about';

  return (
    <aside
      className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-stone-800/80 bg-stone-950 text-stone-100"
      aria-label="Main navigation"
    >
      <div className="border-b border-stone-800/80 px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/90">
          Recipe box
        </p>
        <h1 className="mt-1 font-serif text-xl font-medium text-stone-50">
          Kitchen notes
        </h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <Link
          to="/"
          className={navButtonClass(browseActive)}
          aria-current={browseActive ? 'page' : undefined}
        >
          <span className="block font-medium">Browse &amp; search</span>
          <span className={navDescriptionClass(browseActive)}>
            See all recipes and filter by name
          </span>
        </Link>
        <Link
          to="/recipes/new"
          className={navButtonClass(newActive)}
          aria-current={newActive ? 'page' : undefined}
        >
          <span className="block font-medium">New recipe</span>
          <span className={navDescriptionClass(newActive)}>
            Add a recipe in a new window
          </span>
        </Link>
        <Link
          to="/about"
          className={navButtonClass(aboutActive)}
          aria-current={aboutActive ? 'page' : undefined}
        >
          <span className="block font-medium">About</span>
          <span className={navDescriptionClass(aboutActive)}>App info and credits</span>
        </Link>
      </nav>
    </aside>
  );
}
