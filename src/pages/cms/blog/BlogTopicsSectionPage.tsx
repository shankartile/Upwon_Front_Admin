import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { topicsSection } from '../../../services/blogSectionsService';
import { TOPICS_RULES, checkHeading, checkText, counterFor, type TopicsField } from './blogForm';
import { useSectionForm } from '../about/useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from '../about/AboutSectionShell';
import type { BlogTopicsSection, ReplaceBlogTopicsSectionInput } from '../../../types/blog';

/**
 * Resource Page -> Blog -> Topics Section tab: the intro above the category
 * chips on the public /blog page - "INSIGHTS BY TOPIC / Pick the Lane **You
 * Operate In.** / Each category publishes ...".
 *
 * One singleton row on the server, so this is one form and Save, over the About
 * area's useSectionForm like every other singleton section tab. The chips under
 * it are the Categories tab's.
 *
 * The heading takes ONE accent span - the words the site sets in the orange
 * gradient - marked with double asterisks, the home page's parseHeading
 * convention. A second span is refused here, because the section intro only
 * ever renders the one.
 */

const toDraft = (section: BlogTopicsSection | null) => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
});

type DraftForm = ReturnType<typeof toDraft>;

/** checkHeading, plus the one-span rule: at most one opening and one closing `**`. */
function topicsHeadingError(raw: string): string | null {
  const problem = checkHeading(TOPICS_RULES.heading, raw);
  if (problem) return problem;
  const markers = raw.split('**').length - 1;
  return markers > 2 ? 'Only one **accent** span is allowed in this heading.' : null;
}

export default function BlogTopicsSectionPage() {
  const form = useSectionForm<BlogTopicsSection, DraftForm, ReplaceBlogTopicsSectionInput, TopicsField>(
    {
      load: topicsSection.get,
      save: topicsSection.update,
      toDraft,
      validate: (draft) => ({
        eyebrow: checkText(TOPICS_RULES.eyebrow, draft.eyebrow),
        heading: topicsHeadingError(draft.heading),
        subtext: checkText(TOPICS_RULES.subtext, draft.subtext),
      }),
      toInput: async (draft) => ({
        eyebrow: draft.eyebrow.trim(),
        heading: draft.heading.trim(),
        subtext: draft.subtext.trim(),
      }),
      messages: {
        saved: 'Topics intro saved',
        savedDetail: 'The live /blog page now shows this intro above the category chips.',
        failed: 'Could not save the topics intro',
      },
    },
  );

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the topics intro"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  const counter = (name: TopicsField) => counterFor(draft[name], TOPICS_RULES[name].max);

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This intro has not been authored yet, so the site shows its built-in copy. Saving this
          form replaces it.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Copy"
            subtitle="The intro above the category chips on the public /blog page."
          />
          <CardBody className="space-y-4">
            <Field
              label={TOPICS_RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small label above the heading. ${counter('eyebrow')}`}
            >
              <Input
                value={draft.eyebrow}
                placeholder="Insights by Topic"
                invalid={!!errorFor('eyebrow')}
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => touch('eyebrow')}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={TOPICS_RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap the accented words in <code>**double asterisks**</code> for the orange
                  highlight — one span at most. {counter('heading')}
                </>
              }
            >
              <Input
                value={draft.heading}
                placeholder="Pick the Lane **You Operate In.**"
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={TOPICS_RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The line under the heading. ${counter('subtext')}`}
            >
              <Textarea
                rows={3}
                value={draft.subtext}
                placeholder="Each category publishes operator playbooks built from real deployments."
                invalid={!!errorFor('subtext')}
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => touch('subtext')}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preview" subtitle="How the intro will render." />
          <CardBody>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              {draft.eyebrow.trim() || 'Eyebrow'}
            </p>
            <p className="mt-2 text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
              <HeadingPreview heading={draft.heading} />
            </p>
            <p className="mt-2 text-xs leading-relaxed text-charcoal-light dark:text-navy-300">
              {draft.subtext.trim() || 'The line under the heading.'}
            </p>
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
