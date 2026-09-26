import { useState } from 'react';
import type { Seo } from '../../types';
import { Field, FieldGrid } from './Field';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';
import { absoluteUrlError, checkText, counterFor, type TextRule } from '../../lib/fieldRules';

/**
 * The SEO block shared by the page, industry and case-study editors and by
 * Settings → SEO Defaults.
 *
 * None of those screens has a server counterpart, so the numbers below are the
 * ones the search engines themselves truncate at rather than a mirror of a
 * validator: a title over 60 characters and a description over 160 are cut off
 * in the result. The counters were already printed here; what was missing was
 * anything that acted on them, which is why `seoErrors` is exported - each
 * screen folds it into its own Save check so a too-long title blocks Save the
 * same way its own fields do.
 *
 * The "OG image URL" box that used to sit beside the canonical URL is gone.
 * Images in this panel are uploaded, never pasted as a URL, and a text box
 * feeding a public <meta property="og:image"> is exactly the pattern that rule
 * exists to prevent. The `ogImage` value itself is untouched on the record.
 */

const RULES: Record<'title' | 'description', TextRule> = {
  title: { label: 'SEO title', min: 0, max: 60, required: false },
  description: { label: 'Meta description', min: 0, max: 160, required: false },
};

const CANONICAL_MAX = 2048;

export type SeoFieldName = 'title' | 'description' | 'canonical';

/** Every SEO field's error, for the parent screen's own Save check. */
export function seoErrors(value: Seo): Record<SeoFieldName, string | null> {
  return {
    title: checkText(RULES.title, value.title),
    description: checkText(RULES.description, value.description),
    canonical: absoluteUrlError(value.canonical ?? '', {
      label: 'Canonical URL',
      max: CANONICAL_MAX,
    }),
  };
}

export const hasSeoErrors = (value: Seo): boolean =>
  Object.values(seoErrors(value)).some(Boolean);

export function SeoFields({
  value,
  onChange,
  submitted = false,
}: {
  value: Seo;
  onChange: (next: Seo) => void;
  /** True once the parent's Save has been pressed, so errors show then too. */
  submitted?: boolean;
}) {
  const [touched, setTouched] = useState<Partial<Record<SeoFieldName, boolean>>>({});
  const errors = seoErrors(value);

  const patch = (p: Partial<Seo>) => onChange({ ...value, ...p });
  const touch = (name: SeoFieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: SeoFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  return (
    <div className="space-y-4">
      <Field
        label={RULES.title.label}
        error={errorFor('title')}
        hint={counterFor(value.title, RULES.title.max)}
      >
        <Input
          value={value.title}
          invalid={!!errorFor('title')}
          aria-invalid={!!errorFor('title')}
          onBlur={() => touch('title')}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Page title for search engines"
        />
      </Field>
      <Field
        label={RULES.description.label}
        error={errorFor('description')}
        hint={counterFor(value.description, RULES.description.max)}
      >
        <Textarea
          value={value.description}
          rows={3}
          invalid={!!errorFor('description')}
          aria-invalid={!!errorFor('description')}
          onBlur={() => touch('description')}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <FieldGrid>
        <Field
          label="Canonical URL"
          error={errorFor('canonical')}
          hint="Optional. The full address this page should be indexed under."
        >
          <Input
            value={value.canonical ?? ''}
            invalid={!!errorFor('canonical')}
            aria-invalid={!!errorFor('canonical')}
            onBlur={() => touch('canonical')}
            onChange={(e) => patch({ canonical: e.target.value })}
            placeholder="https://upwon.com/..."
          />
        </Field>
      </FieldGrid>
      <Switch checked={!!value.noindex} onChange={(v) => patch({ noindex: v })} label="Hide from search engines (noindex)" />
    </div>
  );
}
