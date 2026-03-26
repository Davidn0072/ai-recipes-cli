import { useEffect, useId, useState } from 'react';
import { API_BASE } from '../api';

type CreateRecipeModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type FormState = {
  title: string;
  ingredientsText: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cooking_time: number;
};

const emptyForm = (): FormState => ({
  title: '',
  ingredientsText: '',
  instructions: '',
  difficulty: 'easy',
  cooking_time: 0,
});

function parseIngredients(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateRecipeModal({ open, onClose, onCreated }: CreateRecipeModalProps) {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = form.title.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    const ingredients = parseIngredients(form.ingredientsText);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          ingredients,
          instructions: form.instructions.trim(),
          difficulty: form.difficulty,
          cooking_time: Number.isFinite(form.cooking_time) ? form.cooking_time : 0,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || `Request failed (${res.status})`);
        return;
      }
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-stone-900/50" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-xl font-medium text-stone-900">
            New recipe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="recipe-title" className="block text-sm font-medium text-stone-700">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              id="recipe-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              autoComplete="off"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="recipe-ingredients" className="block text-sm font-medium text-stone-700">
              Ingredients
            </label>
            <p className="mt-0.5 text-xs text-stone-500">One ingredient per line</p>
            <textarea
              id="recipe-ingredients"
              value={form.ingredientsText}
              onChange={(e) => setForm((f) => ({ ...f, ingredientsText: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="recipe-instructions" className="block text-sm font-medium text-stone-700">
              Instructions
            </label>
            <textarea
              id="recipe-instructions"
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipe-difficulty" className="block text-sm font-medium text-stone-700">
                Difficulty
              </label>
              <select
                id="recipe-difficulty"
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    difficulty: e.target.value as FormState['difficulty'],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                disabled={submitting}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label htmlFor="recipe-time" className="block text-sm font-medium text-stone-700">
                Cooking time (minutes)
              </label>
              <input
                id="recipe-time"
                type="number"
                min={0}
                step={1}
                value={form.cooking_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cooking_time: Number(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                disabled={submitting}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
