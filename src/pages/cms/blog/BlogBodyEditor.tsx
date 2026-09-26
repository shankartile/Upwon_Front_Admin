import { useState } from 'react';
import { ArrowDown, ArrowUp, Heading2, List, Pilcrow, Plus, Quote, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { oneOf } from '../../../lib/fieldRules';
import { moveRow } from '../../../lib/listField';
import {
  BLOCK_TEXT_MAX,
  BLOCK_TYPES,
  BLOCK_TYPE_VALUES,
  BODY_MAX_BLOCKS,
  LIST_ITEMS_MAX,
  QUOTE_CITE_MAX,
  blockError,
  emptyBlock,
  retypeBlock,
  toItems,
  type BlockDraft,
} from './blogForm';
import type { BlogBodyBlockType } from '../../../types/blog';

/**
 * A post's body, edited as the list of blocks the site renders - the same
 * shapes data/blog.js has always used: paragraphs, section headings, bullet
 * lists and pull quotes.
 *
 * Structured rather than one big textarea (the Insider story's way) because the
 * site draws each type differently, and a markdown dialect would be one more
 * thing to learn for four shapes. Each block can be retyped, moved and removed
 * in place; retyping keeps what was typed (see retypeBlock).
 *
 * A block's error shows once the block has been left or Save has been pressed -
 * the same rule as every input in the panel - so a freshly added empty block is
 * not red before anything has been typed into it.
 */

const TYPE_ICON: Record<BlogBodyBlockType, typeof Pilcrow> = {
  p: Pilcrow,
  h2: Heading2,
  ul: List,
  quote: Quote,
};

export function BlogBodyEditor({
  blocks,
  onChange,
  submitted,
  disabled,
}: {
  blocks: BlockDraft[];
  onChange: (blocks: BlockDraft[]) => void;
  /** True once Save has been pressed - every block's error shows from then on. */
  submitted: boolean;
  disabled?: boolean;
}) {
  /** Blocks that have been left at least once, by key. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (key: string) => setTouched((current) => ({ ...current, [key]: true }));

  const atMax = blocks.length >= BODY_MAX_BLOCKS;

  const replace = (index: number, block: BlockDraft) =>
    onChange(blocks.map((current, i) => (i === index ? block : current)));

  const add = (type: BlogBodyBlockType) => {
    if (atMax) return;
    onChange([...blocks, emptyBlock(type)]);
  };

  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  const move = (index: number, direction: -1 | 1) => onChange(moveRow(blocks, index, direction));

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-cream-400 p-4 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
          The body is empty. Add a paragraph, a heading, a list or a quote below.
        </p>
      )}

      {blocks.map((block, index) => {
        const problem = blockError(block);
        const shown = submitted || touched[block.key] ? problem : null;
        const Icon = TYPE_ICON[block.type];

        return (
          <div
            key={block.key}
            className={`rounded-xl border p-3 ${
              shown
                ? 'border-orange-300 dark:border-orange-800'
                : 'border-cream-300 dark:border-navy-800'
            }`}
            onBlur={(event) => {
              // Left as a whole, not field by field: moving from the quote to its
              // attribution is still inside the block.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                touch(block.key);
              }
            }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-charcoal-light dark:text-navy-300">
                <Icon className="h-3.5 w-3.5" />
                <span className="tabular-nums">{index + 1}</span>
              </span>
              <div className="w-44">
                <Select
                  value={block.type}
                  disabled={disabled}
                  aria-label={`Block ${index + 1} type`}
                  onChange={(e) =>
                    replace(index, retypeBlock(block, oneOf(BLOCK_TYPE_VALUES, e.target.value, block.type)))
                  }
                >
                  {BLOCK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move block up"
                  title="Move up"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move block down"
                  title="Move down"
                  disabled={disabled || index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove block"
                  title="Remove block"
                  disabled={disabled}
                  onClick={() => remove(index)}
                  className="rounded p-1.5 text-charcoal-light hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <BlockFields
              block={block}
              disabled={disabled}
              invalid={!!shown}
              onChange={(next) => replace(index, next)}
            />

            {shown ? (
              <p className="mt-1.5 text-xs text-orange-700 dark:text-orange-400">{shown}</p>
            ) : (
              <p className="mt-1.5 text-xs text-charcoal-light dark:text-navy-300">
                {blockCounter(block)}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {BLOCK_TYPES.map((type) => (
          <Button
            key={type.value}
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || atMax}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => add(type.value)}
          >
            {type.label}
          </Button>
        ))}
        <span className="text-xs text-charcoal-light dark:text-navy-300">
          {blocks.length}/{BODY_MAX_BLOCKS} blocks
        </span>
      </div>
    </div>
  );
}

/** The counter under a block that has nothing wrong with it. */
function blockCounter(block: BlockDraft): string {
  if (block.type === 'ul') {
    return `One item per line. ${toItems(block.itemsText).length}/${LIST_ITEMS_MAX} items.`;
  }
  return `${block.text.trim().length}/${BLOCK_TEXT_MAX[block.type]}`;
}

/** The inputs one block type has. */
function BlockFields({
  block,
  disabled,
  invalid,
  onChange,
}: {
  block: BlockDraft;
  disabled?: boolean;
  invalid: boolean;
  onChange: (block: BlockDraft) => void;
}) {
  switch (block.type) {
    case 'h2':
      return (
        <Input
          value={block.text}
          disabled={disabled}
          placeholder="The five sources of bakery wastage"
          aria-label="Section heading"
          invalid={invalid}
          aria-invalid={invalid}
          className="font-semibold"
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case 'ul':
      return (
        <Textarea
          rows={5}
          value={block.itemsText}
          disabled={disabled}
          placeholder={'The first bullet.\nThe second bullet.'}
          aria-label="Bullet list items, one per line"
          invalid={invalid}
          aria-invalid={invalid}
          onChange={(e) => onChange({ ...block, itemsText: e.target.value })}
        />
      );
    case 'quote':
      return (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={block.text}
            disabled={disabled}
            placeholder="The pull quote."
            aria-label="Quote"
            invalid={invalid}
            aria-invalid={invalid}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
          <Input
            value={block.cite}
            disabled={disabled}
            placeholder={`Attribution (optional), e.g. Plant head, Pune bakery — up to ${QUOTE_CITE_MAX} characters`}
            aria-label="Quote attribution"
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
          />
        </div>
      );
    default:
      return (
        <Textarea
          rows={4}
          value={block.text}
          disabled={disabled}
          placeholder="A paragraph."
          aria-label="Paragraph"
          invalid={invalid}
          aria-invalid={invalid}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
  }
}
