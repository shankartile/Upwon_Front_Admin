// src/lib/listField.ts

/**
 * One editable list of short strings - the rows, the rule they are checked
 * against, and the checks themselves.
 *
 * Shared by every ordered list of short strings in the CMS: the enquiry form's
 * three choice lists and the Insider feature section's checklist, which are
 * edited through one component (components/forms/ChoiceListEditor) and
 * validated through one rule, so the message an admin reads does not depend on
 * which page they are editing. Each rule mirrors a textList / requiredTextList
 * call in a server validator; the server stays the authority.
 */

/**
 * One row of a list editor, with a stable key so removing or reordering a row
 * never re-keys the rest (React would otherwise carry the focus and the cursor
 * position onto whichever row took its place).
 */
export interface ListRow {
  key: number;
  text: string;
}

let nextRowKey = 0;

export const listRow = (text: string): ListRow => ({ key: ++nextRowKey, text });

/** The rows to open an editor with: the stored list, or one empty row. */
export const toListRows = (values: readonly string[]): ListRow[] =>
  values.length > 0 ? values.map(listRow) : [listRow('')];

/** What actually saves: trimmed, with the empty rows an editor leaves behind dropped. */
export const fromListRows = (rows: readonly ListRow[]): string[] =>
  rows.map((row) => row.text.trim()).filter(Boolean);

/** Swaps a row with its neighbour, or returns the list unchanged at the ends. */
export function moveRow<T>(rows: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return [...rows];
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** One list's limits, mirroring the server's textList / requiredTextList call. */
export interface ListRule {
  /** Singular, for the messages: 'business type', 'bullet'. */
  label: string;
  max: number;
  maxLength: number;
  /**
   * How many entries the list needs. Defaults to 1, which is
   * `requiredTextList`; 0 is a plain `textList`, where the server is happy with
   * an empty list (the Insider feature section's bullets).
   */
  min?: number;
  /**
   * How a row is named when one of them is the problem. Defaults to 'Entry',
   * which is what a choice list's rows are called on screen.
   */
  entryLabel?: string;
  /**
   * Whether two rows may read the same. Defaults to false - see below for why
   * a list of choices is stricter than the server.
   */
  allowDuplicates?: boolean;
}

/**
 * One editable list of short strings, checked the way the server checks it.
 *
 * Blank rows are dropped before the "at least one" check, exactly as the
 * server's textList does, so a trailing empty row is never the thing that
 * blocks Save.
 *
 * Duplicates are refused by default, which the server deliberately does not do:
 * it keeps them, because in prose a repeated line can be meant. In a list of
 * choices it cannot be - each option is its own chip and its own value in the
 * visitor's form state, so two identical ones could not be told apart, and the
 * site drops the second (lib/contactPage.js, toOptions). Caught while
 * authoring, the editor and the live page always show the same count. A list
 * that is prose rather than choices (the feature section's checklist) passes
 * `allowDuplicates` and matches the server exactly.
 *
 * @returns null when valid, otherwise the message to show under the list.
 */
export function checkList(rule: ListRule, rows: readonly ListRow[]): string | null {
  const entries = fromListRows(rows);

  if (entries.length < (rule.min ?? 1)) return `Add at least one ${rule.label}.`;
  if (entries.length > rule.max) {
    return `At most ${rule.max} ${rule.label}s (currently ${entries.length}).`;
  }

  return badListRow(rule, rows)?.message ?? null;
}

/**
 * The first row a list editor should mark, and why.
 *
 * Split out of `checkList` so the message under the list and the orange border
 * on the row it is about come from one pass: a row named in a message the
 * admin cannot see highlighted is the gap this closes. Row positions are used
 * throughout, not entry positions, so the number in the message matches the row
 * on screen even with a blank row above it.
 *
 * @returns null when every row is fine on its own - a list that is simply too
 * long or too short has no single row to blame.
 */
export function badListRow(
  rule: ListRule,
  rows: readonly ListRow[],
): { index: number; message: string } | null {
  const entryLabel = rule.entryLabel ?? 'Entry';

  const tooLong = rows.findIndex((row) => row.text.trim().length > rule.maxLength);
  if (tooLong !== -1) {
    return {
      index: tooLong,
      message: `${entryLabel} ${tooLong + 1} must be ${rule.maxLength} characters or fewer.`,
    };
  }

  if (rule.allowDuplicates) return null;

  // Compared case-insensitively: 'Other' and 'other' read as the same choice
  // to a visitor, whichever way they were typed.
  const seen = new Map<string, number>();
  for (let index = 0; index < rows.length; index += 1) {
    const text = rows[index].text.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      return {
        index,
        message: `${entryLabel} ${index + 1} repeats ${entryLabel.toLowerCase()} ${first + 1}.`,
      };
    }
    seen.set(key, index);
  }

  return null;
}
