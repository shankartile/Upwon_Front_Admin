import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { ChoiceListEditor } from '../../../components/forms/ChoiceListEditor';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { answerSection } from '../../../services/vsSapSectionsService';
import {
  ANSWER_RULES,
  POINTS_RULE,
  answerHeadingError,
  checkList,
  checkText,
  counterFor,
  fromListRows,
  toListRows,
  type AnswerField,
  type AnswerListField,
  type AnswerTextField,
  type ListRow,
} from './vsSapForm';
import { useSectionForm } from '../about/useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from '../about/AboutSectionShell';
import type { ReplaceVsSapAnswerSectionInput, VsSapAnswerSection } from '../../../types/vsSap';

/**
 * Resource Page -> UpWon vs SAP -> Straight Answer tab: "The straight answer"
 * band under the hero on the public /compare/upwon-vs-sap page - its heading,
 * then two cards side by side:
 *
 *   UpWon card  the orange one - a small-caps title ("Why food & FMCG operators
 *               choose UpWon") and the ticked points under it.
 *   SAP card    the white one - its title ("When SAP B1 is the right choice"),
 *               its points, and the italic line that closes it ("For 95% of
 *               Indian food & FMCG manufacturers, UpWon is the better fit.").
 *
 * One singleton row on the server, so this is one form and one Save, over the
 * About area's useSectionForm like every other singleton section tab. The two
 * point lists are part of that row (ordered JSONB lists, like the Contact
 * page's offices), not child resources, so they are edited in place with the
 * shared list editor - add, remove, move up and down - and saved with the rest
 * of the form rather than row by row.
 *
 * The closing line sits in the SAP card here because that is where the site
 * prints it. The tick and cross icons in front of each point are the site's
 * own, fixed per card, so there is nothing to choose for them.
 *
 * The heading takes ONE accent span - the words the site sets in the orange
 * gradient ("**No Spin.**") - marked with double asterisks, the home page's
 * parseHeading convention. A second span is refused here, because the band only
 * ever renders the one.
 */

interface DraftForm {
  eyebrow: string;
  heading: string;
  upwonTitle: string;
  upwonPoints: ListRow[];
  sapTitle: string;
  sapPoints: ListRow[];
  closingLine: string;
}

/**
 * A section that has never been authored opens with one empty row per card,
 * which is what toListRows gives an empty list - an editor with no rows at all
 * would have nothing to type into.
 */
const toDraft = (section: VsSapAnswerSection | null): DraftForm => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  upwonTitle: section?.upwonTitle ?? '',
  upwonPoints: toListRows(section?.upwonPoints ?? []),
  sapTitle: section?.sapTitle ?? '',
  sapPoints: toListRows(section?.sapPoints ?? []),
  closingLine: section?.closingLine ?? '',
});

/** The two cards, described once so their Title and Points fields are laid out alike. */
const CARDS = [
  {
    title: 'UpWon card',
    subtitle: 'The orange card on the left — a ticked point per line.',
    titleField: 'upwonTitle',
    pointsField: 'upwonPoints',
    titlePlaceholder: 'Why food & FMCG operators choose UpWon',
    pointPlaceholder: '5-year implementation becomes 30-45 day go-live',
  },
  {
    title: 'SAP card',
    subtitle: 'The white card on the right — when SAP B1 is still the better fit.',
    titleField: 'sapTitle',
    pointsField: 'sapPoints',
    titlePlaceholder: 'When SAP B1 is the right choice',
    pointPlaceholder: 'Global multi-currency operations across 20+ countries',
  },
] as const satisfies readonly {
  title: string;
  subtitle: string;
  titleField: AnswerTextField;
  pointsField: AnswerListField;
  titlePlaceholder: string;
  pointPlaceholder: string;
}[];

export default function VsSapAnswerSectionPage() {
  const form = useSectionForm<
    VsSapAnswerSection,
    DraftForm,
    ReplaceVsSapAnswerSectionInput,
    AnswerField
  >({
    load: answerSection.get,
    save: answerSection.update,
    toDraft,
    validate: (draft) => ({
      eyebrow: checkText(ANSWER_RULES.eyebrow, draft.eyebrow),
      heading: answerHeadingError(draft.heading),
      upwonTitle: checkText(ANSWER_RULES.upwonTitle, draft.upwonTitle),
      upwonPoints: checkList(POINTS_RULE, draft.upwonPoints),
      sapTitle: checkText(ANSWER_RULES.sapTitle, draft.sapTitle),
      sapPoints: checkList(POINTS_RULE, draft.sapPoints),
      closingLine: checkText(ANSWER_RULES.closingLine, draft.closingLine),
    }),
    toInput: async (draft) => ({
      eyebrow: draft.eyebrow.trim(),
      heading: draft.heading.trim(),
      upwonTitle: draft.upwonTitle.trim(),
      // Empty rows are an editing artefact, not content.
      upwonPoints: fromListRows(draft.upwonPoints),
      sapTitle: draft.sapTitle.trim(),
      sapPoints: fromListRows(draft.sapPoints),
      closingLine: draft.closingLine.trim(),
    }),
    messages: {
      saved: 'Straight answer saved',
      savedDetail: 'The live UpWon vs SAP page now shows this heading and both cards.',
      failed: 'Could not save the straight answer',
    },
  });

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the straight answer"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  const counter = (name: AnswerTextField) => counterFor(draft[name], ANSWER_RULES[name].max);

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This band has not been authored yet, so the site shows its built-in heading and cards.
          Saving this form replaces them.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Heading"
            subtitle="The copy above the two cards on the public /compare/upwon-vs-sap page."
          />
          <CardBody className="space-y-4">
            <Field
              label={ANSWER_RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small label above the heading. ${counter('eyebrow')}`}
            >
              <Input
                value={draft.eyebrow}
                placeholder="The straight answer"
                invalid={!!errorFor('eyebrow')}
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => touch('eyebrow')}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={ANSWER_RULES.heading.label}
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
                placeholder="When UpWon Wins. When SAP Wins. **No Spin.**"
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preview" subtitle="How the heading will render." />
          <CardBody>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              {draft.eyebrow.trim() || 'Eyebrow'}
            </p>
            <p className="mt-2 text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
              <HeadingPreview heading={draft.heading} />
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Side by side on a wide screen, like the two cards on the site; stacked below it. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CARDS.map((card) => (
          <Card key={card.pointsField}>
            <CardHeader title={card.title} subtitle={card.subtitle} />
            <CardBody className="space-y-4">
              <Field
                label={ANSWER_RULES[card.titleField].label}
                required
                error={errorFor(card.titleField)}
                hint={`The small-caps line at the top of the card. ${counter(card.titleField)}`}
              >
                <Input
                  value={draft[card.titleField]}
                  placeholder={card.titlePlaceholder}
                  invalid={!!errorFor(card.titleField)}
                  aria-invalid={!!errorFor(card.titleField)}
                  onBlur={() => touch(card.titleField)}
                  onChange={(e) =>
                    patch({ [card.titleField]: e.target.value } as Partial<DraftForm>)
                  }
                />
              </Field>

              <Field
                label="Points"
                required
                error={errorFor(card.pointsField)}
                hint={`The card's list, in order. Between 1 and ${POINTS_RULE.max}; empty rows are not saved.`}
              >
                <ChoiceListEditor
                  rows={draft[card.pointsField]}
                  onChange={(rows) => patch({ [card.pointsField]: rows } as Partial<DraftForm>)}
                  onBlur={() => touch(card.pointsField)}
                  rule={POINTS_RULE}
                  placeholder={card.pointPlaceholder}
                  disabled={saving}
                  // The row a message names is drawn in orange exactly while that
                  // message is on screen - after the list is left, or Save is pressed.
                  showErrors={Boolean(errorFor(card.pointsField))}
                />
              </Field>

              {card.pointsField === 'sapPoints' && (
                <Field
                  label={ANSWER_RULES.closingLine.label}
                  required
                  error={errorFor('closingLine')}
                  hint={`The italic line under this card's points. ${counter('closingLine')}`}
                >
                  <Input
                    value={draft.closingLine}
                    placeholder="For 95% of Indian food & FMCG manufacturers, UpWon is the better fit."
                    invalid={!!errorFor('closingLine')}
                    aria-invalid={!!errorFor('closingLine')}
                    onBlur={() => touch('closingLine')}
                    onChange={(e) => patch({ closingLine: e.target.value })}
                  />
                </Field>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <SectionSaveBar
        saving={saving}
        blocked={submitted && hasErrors}
        onSave={() => void form.submit()}
      />
    </>
  );
}
