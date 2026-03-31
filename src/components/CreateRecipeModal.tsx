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

/** Sparkles icon — common visual cue for AI-assisted actions */
function AiSparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
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
              placeholder="e.g. Cake, Omelette, Salad, Pasta, Lemon-roast chicken"
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
              placeholder={
                'e.g.\nMilk, eggs, margarine, chocolate\nchicken thighs\nlemon\ngarlic\nolive oil'
              }
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              disabled={submitting || aiLoading}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-violet-100/40 px-4 py-3 shadow-md shadow-violet-900/10 ring-1 ring-violet-900/[0.07] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start gap-2">
                <AiSparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                <p className="text-sm font-semibold tracking-tight text-violet-950">
                  Get AI-written instructions
                </p>
              </div>
              <p className="pl-7 text-xs leading-relaxed text-stone-600">
                Uses your title and ingredients; <span className="font-medium text-stone-800">AI generates</span>{' '}
                step-by-step cooking steps in the{' '}
                <span className="font-medium text-stone-800">Instructions</span> field below. Optional.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetAiInstructions}
              disabled={submitting || aiLoading || !canUseAi}
              aria-busy={aiLoading}
              aria-label={
                canUseAi
                  ? 'Generate cooking instructions with AI from title and ingredients into the Instructions field'
                  : 'Add a title and at least one ingredient to generate instructions with AI'
              }
              title={
                canUseAi
                  ? 'AI writes step-by-step instructions into Instructions (uses title + ingredients)'
                  : 'Add a title and at least one ingredient first'
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                  Generating…
                </>
              ) : (
                <>
                  <AiSparklesIcon className="h-5 w-5 shrink-0" />
                  <span
                    className="rounded-md bg-white/20 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tabular-nums tracking-wide text-white"
                    aria-hidden
                  >
                    AI
                  </span>
                  Generate with AI
                </>
              )}
            </button>
          </div>

          <div>
            <label htmlFor="recipe-instructions" className="block text-sm font-medium text-stone-700">
              Instructions
            </label>
            <p className="mt-0.5 text-xs text-stone-500">
              How to cook it — type your own steps, or use{' '}
              <span className="font-medium text-stone-700">Generate with AI</span> above so{' '}
              <span className="font-medium text-stone-700">AI writes</span> the steps into this field.
            </p>
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
