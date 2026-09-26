import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  badListRow,
  fromListRows,
  listRow,
  moveRow,
  type ListRow,
  type ListRule,
} from '../../lib/listField';

/**
 * An ordered list of short strings, edited in place: add, remove, reorder.
 *
 * Every such list in the CMS is edited the same way, which is deliberate - the
 * enquiry form's three choice lists and the Insider feature section's checklist
 * all render this. The position shown beside each row is its index in the list,
 * not a stored number: moving a row renumbers it, and nothing is saved about
 * the order but the order itself.
 *
 * Empty rows are an editing artefact and are dropped on save (see
 * `fromListRows`), so an admin can leave one behind without it becoming a blank
 * chip on the live page.
 *
 * The rule the page validates with is passed in whole, so the numbers the
 * editor shows while typing - the counter inside each row, the disabled Add
 * button at `max` - are the same ones `checkList` blocks Save on, and the row
 * its message names is the row drawn in orange.
 *
 * A row has a counter rather than a `maxLength`: the browser truncates a paste
 * at the attribute's cap silently, so an admin pasting a long entry would lose
 * the tail with nothing said. Over the cap the counter goes past its max and
 * `checkList` names the row.
 */
export function ChoiceListEditor({
  rows,
  onChange,
  onBlur,
  rule,
  placeholder,
  disabled,
  showErrors = false,
}: {
  rows: ListRow[];
  onChange: (rows: ListRow[]) => void;
  onBlur: () => void;
  rule: ListRule;
  placeholder: string;
  disabled?: boolean;
  /**
   * Whether the list has been left or Save pressed. Without it a stored list
   * that predates a rule - two entries that differ only in case, say - paints
   * a row orange the instant the page opens, with no message beside it, which
   * reads as a rendering fault rather than as feedback.
   */
  showErrors?: boolean;
}) {
  // Entries, not rows: an empty row is an editing artefact that `fromListRows`
  // drops before the body is sent, and `checkList` counts the same way. Counting
  // raw rows greyed out Add while the list was still one short of the cap.
  const atMax = fromListRows(rows).length >= rule.max;
  const bad = showErrors ? badListRow(rule, rows) : null;

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-1.5">
          <span className="w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Input
              value={row.text}
              placeholder={placeholder}
              disabled={disabled}
              invalid={bad?.index === index}
              aria-invalid={bad?.index === index}
              aria-label={`${rule.label} ${index + 1}`}
              onBlur={onBlur}
              onChange={(e) =>
                onChange(
                  rows.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)),
                )
              }
              rightSlot={
                <span className="shrink-0 pl-2 text-[11px] tabular-nums text-charcoal-light dark:text-navy-300">
                  {row.text.trim().length}/{rule.maxLength}
                </span>
              }
            />
          </div>
          <button
            type="button"
            aria-label="Move up"
            title="Move up"
            disabled={disabled || index === 0}
            onClick={() => onChange(moveRow(rows, index, -1))}
            className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            title="Move down"
            disabled={disabled || index === rows.length - 1}
            onClick={() => onChange(moveRow(rows, index, 1))}
            className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${rule.label} ${index + 1}`}
            title="Remove"
            disabled={disabled}
            onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            className="rounded p-1 text-orange-700 hover:bg-orange-50 disabled:opacity-30 dark:text-orange-300 dark:hover:bg-orange-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
        disabled={disabled || atMax}
        title={atMax ? `At most ${rule.max} ${rule.label}s` : undefined}
        onClick={() => onChange([...rows, listRow('')])}
      >
        Add {rule.label}
      </Button>
    </div>
  );
}
