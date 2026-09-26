import { useState } from 'react';
import { ArrowDown, ArrowUp, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { moveRow } from '../../../lib/listField';
import {
  FAQS_MAX,
  FAQ_RULES,
  counterFor,
  emptyFaq,
  faqErrors,
  type FaqDraft,
} from './knowledgebaseForm';

/**
 * An article's "Frequently asked" accordion, edited as the list of question /
 * answer pairs the site renders, in order.
 *
 * Laid out like BlogBodyEditor - one bordered row per entry, with move up, move
 * down and remove in its corner, and an add button under the list - because it
 * is the same kind of thing: an ordered list inside one article, saved with it.
 *
 * Optional as a whole: an article with no FAQs simply has no accordion. But an
 * entry, once added, needs both halves - a question without an answer would
 * render as an accordion row that opens onto nothing.
 *
 * An entry's errors show once the entry has been left or Save has been pressed -
 * the same rule as every input in the panel - so a freshly added empty entry is
 * not red before anything has been typed into it.
 */
export function KnowledgebaseFaqsEditor({
  faqs,
  onChange,
  submitted,
  disabled,
}: {
  faqs: FaqDraft[];
  onChange: (faqs: FaqDraft[]) => void;
  /** True once Save has been pressed - every entry's errors show from then on. */
  submitted: boolean;
  disabled?: boolean;
}) {
  /** Entries that have been left at least once, by key. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (key: string) => setTouched((current) => ({ ...current, [key]: true }));

  const atMax = faqs.length >= FAQS_MAX;

  const replace = (index: number, faq: FaqDraft) =>
    onChange(faqs.map((current, i) => (i === index ? faq : current)));

  const add = () => {
    if (atMax) return;
    onChange([...faqs, emptyFaq()]);
  };

  const remove = (index: number) => onChange(faqs.filter((_, i) => i !== index));

  const move = (index: number, direction: -1 | 1) => onChange(moveRow(faqs, index, direction));

  return (
    <div className="space-y-3">
      {faqs.length === 0 && (
        <p className="rounded-xl border border-dashed border-cream-400 p-4 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
          No FAQs — the article page leaves the "Frequently asked" section out. Add one below to
          show it.
        </p>
      )}

      {faqs.map((faq, index) => {
        const problems = faqErrors(faq);
        const show = submitted || touched[faq.key];
        const questionError = show ? problems.question : null;
        const answerError = show ? problems.answer : null;

        return (
          <div
            key={faq.key}
            className={`rounded-xl border p-3 ${
              questionError || answerError
                ? 'border-orange-300 dark:border-orange-800'
                : 'border-cream-300 dark:border-navy-800'
            }`}
            onBlur={(event) => {
              // Left as a whole, not field by field: moving from the question to
              // its answer is still inside the entry.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                touch(faq.key);
              }
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-charcoal-light dark:text-navy-300">
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="tabular-nums">FAQ {index + 1}</span>
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move FAQ up"
                  title="Move up"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move FAQ down"
                  title="Move down"
                  disabled={disabled || index === faqs.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove FAQ"
                  title="Remove FAQ"
                  disabled={disabled}
                  onClick={() => remove(index)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Input
                  value={faq.question}
                  disabled={disabled}
                  placeholder="What does FEFO stand for?"
                  aria-label={`FAQ ${index + 1} question`}
                  invalid={!!questionError}
                  aria-invalid={!!questionError}
                  className="font-semibold"
                  onChange={(e) => replace(index, { ...faq, question: e.target.value })}
                />
                <p
                  className={`mt-1.5 text-xs ${
                    questionError
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-charcoal-light dark:text-navy-300'
                  }`}
                >
                  {questionError ?? `Question. ${counterFor(faq.question, FAQ_RULES.question.max)}`}
                </p>
              </div>
              <div>
                <Textarea
                  rows={3}
                  value={faq.answer}
                  disabled={disabled}
                  placeholder="First Expiry, First Out — the inventory rule that the batch with the earliest expiry date is picked and dispatched first."
                  aria-label={`FAQ ${index + 1} answer`}
                  invalid={!!answerError}
                  aria-invalid={!!answerError}
                  onChange={(e) => replace(index, { ...faq, answer: e.target.value })}
                />
                <p
                  className={`mt-1.5 text-xs ${
                    answerError
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-charcoal-light dark:text-navy-300'
                  }`}
                >
                  {answerError ?? `Answer — shown when the question is opened. ${counterFor(faq.answer, FAQ_RULES.answer.max)}`}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || atMax}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={add}
        >
          Add FAQ
        </Button>
        <span className="text-xs text-charcoal-light dark:text-navy-300">
          {faqs.length}/{FAQS_MAX} FAQs
        </span>
      </div>
    </div>
  );
}
