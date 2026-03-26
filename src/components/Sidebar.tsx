export type SidebarView = 'browse' | 'new-recipe' | 'about';

type SidebarProps = {
  active: SidebarView;
  onSelect: (view: SidebarView) => void;
};

const navItems: { id: SidebarView; label: string; description: string }[] = [
  {
    id: 'browse',
    label: 'Browse & search',
    description: 'See all recipes and filter by name',
  },
  {
    id: 'new-recipe',
    label: 'New recipe',
    description: 'Add a recipe to your collection',
  },
  {
    id: 'about',
    label: 'About',
    description: 'App info and credits',
  },
];

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r border-stone-800/80 bg-stone-950 text-stone-100"
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
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group rounded-lg px-3 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/40'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-stone-50'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="block font-medium">{item.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  isActive ? 'text-amber-200/80' : 'text-stone-500 group-hover:text-stone-400'
                }`}
              >
                {item.description}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
