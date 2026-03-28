import { useEffect, useId, useRef, useState } from 'react';
import { API_BASE } from '../api';
import type { RecipeRecord } from './BrowseSearchPanel';

type CreateRecipeModalProps = {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this recipe (PATCH). When null, creates a new one (POST). */
  editingRecipe: RecipeRecord | null;
  onSuccess?: () => void;
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

/** Sample data so an empty “New recipe” form is easier to start from */
const EXAMPLE_FORM: FormState = {
  title: 'Quick tomato pasta',
  ingredientsText: 'spaghetti\nolive oil\ngarlic\ncanned tomatoes\nfresh basil',
  instructions:
    '1. Cook spaghetti until al dente; reserve a cup of pasta water.\n2. Sauté sliced garlic in olive oil until fragrant.\n3. Add tomatoes, simmer 10 min; season with salt and pepper.\n4. Toss pasta with sauce, adding pasta water as needed. Top with basil.',
  difficulty: 'easy',
  cooking_time: 25,
};

function normalizeDifficulty(d?: string): FormState['difficulty'] {
  const x = d?.toLowerCase();
  if (x === 'easy' || x === 'medium' || x === 'hard') return x;
  return 'easy';
}

const AI_SHORT_COST_NOTE =
  'Note: The recipe is intentionally short to reduce AI usage costs.';

function isShortDueToCostYes(v: unknown): boolean {
  if (v === true) return true;
  return typeof v === 'string' && v.trim().toLowerCase() === 'yes';
}

function appendShortDueToCostNote(instructions: string, append: boolean): string {
  if (!append) return instructions;
  const trimmed = instructions.trimEnd();
  if (trimmed.endsWith(AI_SHORT_COST_NOTE)) return instructions;
  if (!trimmed) return AI_SHORT_COST_NOTE;
  return `${trimmed}\n\n${AI_SHORT_COST_NOTE}`;
}

function recipeToForm(r: RecipeRecord): FormState {
  return {
    title: r.title,
    ingredientsText: (r.ingredients ?? []).join('\n'),
    instructions: r.instructions ?? '',
    difficulty: normalizeDifficulty(r.difficulty),
    cooking_time: r.cooking_time ?? 0,
  };
}

function parseIngredients(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateRecipeModal({ open, onClose, editingRecipe, onSuccess }: CreateRecipeModalProps) {
  const titleId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editingRecipe?._id);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingRecipe) {
      setForm(recipeToForm(editingRecipe));
    } else {
      setForm(emptyForm());
    }
  }, [open, editingRecipe]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || isEdit) return;
    const id = window.setTimeout(() => titleInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, isEdit]);

  if (!open) return null;

  const ingredientsForAi = parseIngredients(form.ingredientsText);
  const canUseAi = form.title.trim().length > 0 && ingredientsForAi.length > 0;

  const handleGetAiInstructions = async () => {
    const title = form.title.trim();
    if (!title) {
      setError('Add a title before requesting AI instructions.');
      return;
    }
    const ingredients = parseIngredients(form.ingredientsText);
    if (ingredients.length === 0) {
      setError('Add at least one ingredient before requesting AI instructions.');
      return;
    }
    setError(null);
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recipes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ingredients }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message: unknown }).message)
            : `Request failed (${res.status})`;
        setError(msg);
        return;
      }
      const o = data as Record<string, unknown>;
      const recipeText = typeof o.recipe === 'string' ? o.recipe : '';
      const diffRaw = typeof o.difficulty === 'string' ? o.difficulty : 'easy';
      const timeRaw = o.cooking_time;
      const cookingNum =
        typeof timeRaw === 'number' && Number.isFinite(timeRaw)
          ? timeRaw
          : parseInt(String(timeRaw ?? '0'), 10) || 0;

      const shortDue = isShortDueToCostYes(o.short_due_to_cost);

      setForm((f) => {
        const mergedInstructions = recipeText.trim() || f.instructions;
        return {
          ...f,
          instructions: appendShortDueToCostNote(mergedInstructions, shortDue),
          difficulty: normalizeDifficulty(diffRaw),
          cooking_time: cookingNum >= 0 ? cookingNum : f.cooking_time,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const title = form.title.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (isEdit && !editingRecipe?._id) {
      setError('Cannot update: missing recipe id.');
      return;
    }
    const ingredients = parseIngredients(form.ingredientsText);
    const payload = {
      title,
      ingredients,
      instructions: form.instructions.trim(),
      difficulty: form.difficulty,
      cooking_time: Number.isFinite(form.cooking_time) ? form.cooking_time : 0,
    };
    setSubmitting(true);
    try {
      const recipeId = editingRecipe?._id ?? '';
      const url = isEdit
        ? `${API_BASE}/recipes/${encodeURIComponent(recipeId)}`
        : `${API_BASE}/recipes`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || `Request failed (${res.status})`);
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 sm:py-10"
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
        className="relative z-10 max-h-[calc(100dvh-40px)] w-full max-w-[824px] -translate-y-[20px] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl sm:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-xl font-medium text-stone-900">
            {isEdit ? 'Edit recipe' : 'New recipe'}
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

        <div className="mt-1 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setForm(EXAMPLE_FORM);
            }}
            disabled={submitting || aiLoading}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-50"
          >
            Fill with example
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setForm(emptyForm());
            }}
            disabled={submitting || aiLoading}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50"
          >
            Clear form
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <div>
            <label htmlFor="recipe-title" className="block text-sm font-medium text-stone-700">
              Title <span className="text-red-600">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="recipe-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Lemon-roast chicken"
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              autoComplete="off"
              disabled={submitting || aiLoading}
            />
          </div>

          <div>
            <label htmlFor="recipe-ingredients" className="block text-sm font-medium text-stone-700">
              Ingredients
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              One ingredient per line (optional for save; required for AI)
            </p>
            <textarea
              id="recipe-ingredients"
              value={form.ingredientsText}
              onChange={(e) => setForm((f) => ({ ...f, ingredientsText: e.target.value }))}
              rows={3}
              placeholder={'e.g.\nchicken thighs\nlemon\ngarlic\nolive oil'}
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              disabled={submitting || aiLoading}
            />
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-600">
              Optional: generate cooking steps from the title and ingredients above.
            </p>
            <button
              type="button"
              onClick={handleGetAiInstructions}
              disabled={submitting || aiLoading || !canUseAi}
              title={
                canUseAi
                  ? 'Generate cooking steps with AI'
                  : 'Add a title and at least one ingredient first'
              }
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:pointer-events-none disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
          </div>

          <div>
            <label htmlFor="recipe-instructions" className="block text-sm font-medium text-stone-700">
              Instructions
            </label>
            <p className="mt-0.5 text-xs text-stone-500">How to cook it, or use Generate with AI above</p>
            <textarea
              id="recipe-instructions"
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              rows={3}
              placeholder="e.g. Heat oven to 400°F. Season chicken, roast 35 min until golden… (optional)"
              className="mt-1 w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm leading-relaxed text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              disabled={submitting || aiLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                disabled={submitting || aiLoading}
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
                disabled={submitting || aiLoading}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <div className="mt-[15px] flex justify-end gap-2 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              disabled={submitting || aiLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              disabled={submitting || aiLoading}
            >
              {submitting ? 'Saving…' : isEdit ? 'Update recipe' : 'Save recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
