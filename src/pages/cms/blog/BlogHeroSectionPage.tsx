import { ArrowRight } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { heroSection } from '../../../services/blogSectionsService';
import { HERO_RULES, checkText, counterFor, type HeroTextField } from './blogForm';
import { useSectionForm } from '../about/useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from '../about/AboutSectionShell';
import type { BlogHeroSection, ReplaceBlogHeroSectionInput } from '../../../types/blog';

/**
 * Resource Page -> Blog -> Hero Section tab: the hero slide at the top of the
 * public /blog page - the eyebrow, the headline, the line under it and the two
 * buttons' text. Where the buttons go is fixed on the site (/demo and
 * /knowledgebase), so there is nothing else to author for them.
 *
 * One singleton row on the server, so this is one form and Save, over the About
 * area's useSectionForm like every other singleton section tab.
 *
 * No artwork slot: the slide sits on the site's shared hero backdrop, which is
 * the website's own asset rather than this page's - the same backdrop every
 * page without dedicated hero photography uses.
 *
 * The headline is plain text. The site prints it as one line in the slider's
 * own type, so there is no `**accent**` markup to learn here - unlike the Topics
 * Section heading one tab over.
 */

const toDraft = (section: BlogHeroSection | null) => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
  primaryCtaLabel: section?.primaryCtaLabel ?? '',
  secondaryCtaLabel: section?.secondaryCtaLabel ?? '',
});

type DraftForm = ReturnType<typeof toDraft>;

export default function BlogHeroSectionPage() {
  const form = useSectionForm<BlogHeroSection, DraftForm, ReplaceBlogHeroSectionInput, HeroTextField>({
    load: heroSection.get,
    save: heroSection.update,
    toDraft,
    validate: (draft) => ({
      eyebrow: checkText(HERO_RULES.eyebrow, draft.eyebrow),
      heading: checkText(HERO_RULES.heading, draft.heading),
      subtext: checkText(HERO_RULES.subtext, draft.subtext),
      primaryCtaLabel: checkText(HERO_RULES.primaryCtaLabel, draft.primaryCtaLabel),
      secondaryCtaLabel: checkText(HERO_RULES.secondaryCtaLabel, draft.secondaryCtaLabel),
    }),
    toInput: async (draft) => ({
      eyebrow: draft.eyebrow.trim(),
      heading: draft.heading.trim(),
      subtext: draft.subtext.trim(),
      primaryCtaLabel: draft.primaryCtaLabel.trim(),
      secondaryCtaLabel: draft.secondaryCtaLabel.trim(),
    }),
    messages: {
      saved: 'Blog hero saved',
      savedDetail: 'The live /blog page now shows this hero.',
      failed: 'Could not save the blog hero',
    },
  });

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the blog hero"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  const counter = (name: HeroTextField) => counterFor(draft[name], HERO_RULES[name].max);

  /** One text input, wired the same way for every field in the table. */
  const textInput = (name: HeroTextField, placeholder: string) => (
    <Input
      value={draft[name]}
      placeholder={placeholder}
      invalid={!!errorFor(name)}
      aria-invalid={!!errorFor(name)}
      onBlur={() => touch(name)}
      onChange={(e) => patch({ [name]: e.target.value } as Partial<DraftForm>)}
    />
  );

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This hero has not been authored yet, so the site shows its built-in slide. Saving this
          form replaces it.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Copy" subtitle="The hero slide at the top of the public /blog page." />
            <CardBody className="space-y-4">
              <Field
                label={HERO_RULES.eyebrow.label}
                required
                error={errorFor('eyebrow')}
                hint={`The small line above the headline. ${counter('eyebrow')}`}
              >
                {textInput('eyebrow', 'THE UPWON BLOG')}
              </Field>

              <Field
                label={HERO_RULES.heading.label}
                required
                error={errorFor('heading')}
                hint={`The headline. ${counter('heading')}`}
              >
                {textInput('heading', 'Operator Playbooks for Food & FMCG.')}
              </Field>

              <Field
                label={HERO_RULES.subtext.label}
                required
                error={errorFor('subtext')}
                hint={`The line under the headline. ${counter('subtext')}`}
              >
                <Textarea
                  rows={3}
                  value={draft.subtext}
                  placeholder="Two deep-reads a month across six lanes — the operational fixes that move real numbers. No vendor fluff."
                  invalid={!!errorFor('subtext')}
                  aria-invalid={!!errorFor('subtext')}
                  onBlur={() => touch('subtext')}
                  onChange={(e) => patch({ subtext: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Buttons" subtitle="The text of the two buttons under the copy." />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={HERO_RULES.primaryCtaLabel.label}
                  required
                  error={errorFor('primaryCtaLabel')}
                  hint={`The orange button. ${counter('primaryCtaLabel')}`}
                >
                  {textInput('primaryCtaLabel', 'Request a Demo')}
                </Field>
                <Field
                  label={HERO_RULES.secondaryCtaLabel.label}
                  required
                  error={errorFor('secondaryCtaLabel')}
                  hint={`The outlined button beside it. ${counter('secondaryCtaLabel')}`}
                >
                  {textInput('secondaryCtaLabel', 'Browse the Knowledgebase')}
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Preview" subtitle="The slide's copy, roughly as the site sets it." />
          <CardBody>
            <HeroPreview draft={draft} />
          </CardBody>
        </Card>
      </div>

      <SectionSaveBar
        saving={saving}
        blocked={submitted && hasErrors}
        onSave={() => void form.submit()}
      />
    </>
  );
}

/** The slide on a navy panel, standing in for the shared hero backdrop. */
function HeroPreview({ draft }: { draft: DraftForm }) {
  const muted = 'text-white/40';
  return (
    <div className="rounded-2xl bg-navy-900 p-5 text-white">
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${draft.eyebrow.trim() ? 'text-orange-400' : muted}`}
      >
        {draft.eyebrow.trim() || 'Eyebrow'}
      </p>
      <p className={`mt-2 text-lg font-semibold leading-snug ${draft.heading.trim() ? '' : muted}`}>
        {draft.heading.trim() || 'The headline'}
      </p>
      <p className={`mt-2 text-xs leading-relaxed ${draft.subtext.trim() ? 'text-white/80' : muted}`}>
        {draft.subtext.trim() || 'The line under the headline.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-semibold">
          {draft.primaryCtaLabel.trim() || 'Primary'}
          <ArrowRight className="h-3 w-3" />
        </span>
        <span className="inline-flex items-center rounded-full border border-white/40 px-3 py-1.5 text-xs font-semibold">
          {draft.secondaryCtaLabel.trim() || 'Secondary'}
        </span>
      </div>
    </div>
  );
}
