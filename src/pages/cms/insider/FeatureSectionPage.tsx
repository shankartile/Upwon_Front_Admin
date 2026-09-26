import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Switch } from '../../../components/ui/Switch';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ChoiceListEditor } from '../../../components/forms/ChoiceListEditor';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as featureSectionService from '../../../services/insiderFeatureSectionService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { hasBalancedAccentMarkers } from '../../../lib/heading';
import { INSIDER_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import {
  checkList,
  fromListRows,
  toListRows,
  type ListRow,
  type ListRule,
} from '../../../lib/listField';
import type {
  InsiderFeatureSection,
  UpdateInsiderFeatureSectionInput,
} from '../../../types/insiderPage';

/**
 * Insider -> Feature Section tab: the long-form feature block under the story
 * grid on the public Insider page - an image with a badge, a heading, a
 * paragraph, a checklist and one button.
 *
 * There is exactly one of it (a singleton row on the server), so this is one
 * form and Save: no list, no create, no delete. Hiding the section is the
 * visibility switch, not a delete - the copy stays here for next time.
 */

/**
 * The entity type feature uploads are tagged with - what makes them publicly
 * servable. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the server.
 */
const FEATURE_ENTITY_TYPE = 'insider_feature';

const IMAGE_SPEC = INSIDER_IMAGE_SPECS.feature;

/**
 * Field rules, mirroring the server-side feature section validator
 * (modules/insider-page/validators/feature-section.validator.ts). One table so
 * the checks and the counters under the inputs read the same numbers.
 */
const RULES = {
  badge: { label: 'Badge', min: 1, max: 40, required: false },
  eyebrow: { label: 'Eyebrow', min: 2, max: 80, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  body: { label: 'Body', min: 3, max: 2000, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/**
 * The checklist's rule, mirroring the validator's
 * `v.textList('bullets', { max: BULLETS_MAX, maxLength: BULLET_MAX })`.
 *
 * `textList`, not `requiredTextList`: a feature block with no checklist is
 * legal, so there is no minimum. And unlike the enquiry form's choice lists
 * these are prose - the server keeps a repeated line, so this does too.
 */
const BULLETS_RULE: ListRule = {
  label: 'bullet',
  entryLabel: 'Bullet',
  min: 0,
  max: 8,
  maxLength: 200,
  allowDuplicates: true,
};

/**
 * The server's two field names for the image - it is stored as an uploaded file
 * id OR an authored URL - so a 422 naming either one is shown under the picker.
 */
const IMAGE_FIELDS = ['imageUrl', 'imageFileId'];

interface DraftForm {
  live: boolean;
  badge: string;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: ListRow[];
  image: ImageSlot;
}

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName | 'bullets', boolean>>;

/** A section that has never been authored opens empty - and live, like a new slide. */
const emptyForm = (): DraftForm => ({
  live: true,
  badge: '',
  eyebrow: '',
  heading: '',
  body: '',
  bullets: toListRows([]),
  image: { ...EMPTY_IMAGE_SLOT },
});

const toForm = (section: InsiderFeatureSection): DraftForm => ({
  live: section.status === 'ACTIVE',
  badge: section.badge ?? '',
  eyebrow: section.eyebrow,
  heading: section.heading,
  body: section.body,
  bullets: toListRows(section.bullets),
  image: storedImageSlot({
    fileId: section.imageFileId,
    url: section.imageUrl,
    image: section.image,
  }),
});

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'heading' && !hasBalancedAccentMarkers(value)) {
    return 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
  }
  return null;
}

export default function FeatureSectionPage() {
  const toast = useToast();

  const [section, setSection] = useState<InsiderFeatureSection | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  // A failed save's field errors, so a 422 the client could not foresee - an
  // upload the server will not serve publicly, a stored URL it refuses - lands
  // under the input it belongs to instead of only in a toast.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Object URLs for picked files are revoked on replace and on unmount, so a
  // long editing session does not pin every image it previewed in memory.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const found = await featureSectionService.get();
      setSection(found);
      setForm(found ? toForm(found) : emptyForm());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    const none: Record<TextFieldName, string | null> = {
      badge: null,
      eyebrow: null,
      heading: null,
      body: null,
    };
    if (!form) return none;

    const result = { ...none };
    (Object.keys(RULES) as TextFieldName[]).forEach((name) => {
      result[name] = validateField(name, form[name]);
    });

    return result;
  }, [form]);

  const bulletsError = useMemo(
    () => (form ? checkList(BULLETS_RULE, form.bullets) : null),
    [form],
  );

  /**
   * The stored image URL, for a section seeded with a remote one. This form
   * never offers a URL input, so it can only ever be a value the API gave us -
   * but it is sent back on every save, so it is checked rather than assumed,
   * exactly as the story form checks its own.
   */
  const imageUrlError = form ? imageSlotUrlError(form.image) : null;

  /*
   * A refused pick (`image.error`) is deliberately not counted: the file never
   * enters the slot, so the form still holds what it held before and is still
   * valid. Counting it would strand every other edit behind a file the admin
   * has already decided against. The message stays under the picker. A stored
   * URL is different - that value IS in the slot and would be saved - so
   * imageUrlError does block Save.
   */
  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(bulletsError) || Boolean(imageUrlError);

  if (loadError) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
        <p className="font-medium text-orange-800 dark:text-orange-300">
          Could not load the feature section
        </p>
        <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !form) return <FormSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field
   * has been left, or once Save was pressed.
   */
  const errorFor = (name: TextFieldName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const shown = (name: keyof Touched, error: string | null): string | undefined =>
    serverErrors[name] ?? (submitted || touched[name] ? (error ?? undefined) : undefined);

  /**
   * The image's error, whichever half of its pair the server named.
   *
   * The refusal left behind by a pick the form turned down comes last: it is
   * about a file that never entered the slot, so a 422 about what is actually
   * stored must not sit behind it.
   */
  const imageError: string | undefined =
    imageUrlError ??
    IMAGE_FIELDS.map((field) => serverErrors[field]).find(Boolean) ??
    form.image.error ??
    undefined;

  const touch = (name: keyof Touched) => setTouched((t) => ({ ...t, [name]: true }));

  /** A field the admin has just edited no longer carries the last save's error. */
  const clearServerErrors = (fields: string[]) =>
    setServerErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    clearServerErrors(Object.keys(changes));
  };

  const setBullets = (bullets: ListRow[]) => {
    setForm((current) => (current ? { ...current, bullets } : current));
    clearServerErrors(['bullets']);
  };

  const setImage = (image: ImageSlot) => {
    setForm((current) => (current ? { ...current, image } : current));
    clearServerErrors(IMAGE_FIELDS);
  };

  const pickImage = async (file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped
    // image is refused now rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, IMAGE_SPEC);
    if (problem) {
      setForm((current) =>
        current ? { ...current, image: { ...current.image, error: problem } } : current,
      );
      return;
    }

    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    setImage(pickedImageSlot(file, preview));
  };

  const save = async () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not
    // carry; left in place it would shadow what the server says about the
    // image that IS stored.
    setForm((current) =>
      current ? { ...current, image: { ...current.image, error: null } } : current,
    );
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // Uploaded here rather than on selection, so abandoning the form never
      // leaves an orphaned file behind.
      const imageFileId = form.image.file
        ? (await fileService.upload(form.image.file, FEATURE_ENTITY_TYPE)).id
        : form.image.fileId;

      // A full replace: every field is sent, blanks as null. The slot holds a
      // URL or a file, never both, so the image pair can never conflict.
      const body: UpdateInsiderFeatureSectionInput = {
        badge: form.badge.trim() || null,
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        body: form.body.trim(),
        // Empty rows are an editing artefact, not content.
        bullets: fromListRows(form.bullets),
        // Upload only: the form no longer edits URLs, but a section seeded with
        // one keeps it until an upload (or the X) replaces it.
        imageUrl: form.image.url.trim() || null,
        imageFileId,
        status: form.live ? 'ACTIVE' : 'INACTIVE',
      };

      const saved = await featureSectionService.update(body);
      releaseObjectUrls();
      setSection(saved);
      setForm(toForm(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      toast.success(
        'Feature section saved',
        saved.status === 'ACTIVE'
          ? 'The live Insider page now shows this content.'
          : 'The section is hidden on the live Insider page.',
      );
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save the feature section', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: TextFieldName) => `${form[name].trim().length}/${RULES[name].max}`;

  return (
    <>
      {!section && (
        <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
          This section has not been authored yet, so the site shows its built-in copy. Saving
          this form replaces it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Copy" subtitle="The text of the feature block." />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field
                label={RULES.eyebrow.label}
                required
                error={errorFor('eyebrow')}
                hint={`The small line above the heading. ${counter('eyebrow')}`}
              >
                <Input
                  value={form.eyebrow}
                  placeholder="IN-DEPTH FEATURE"
                  invalid={!!errorFor('eyebrow')}
                  aria-invalid={!!errorFor('eyebrow')}
                  onBlur={() => touch('eyebrow')}
                  onChange={(e) => patch({ eyebrow: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.badge.label}
                error={errorFor('badge')}
                hint={`Optional pill on the image, shown only when there is one. ${counter('badge')}`}
              >
                <Input
                  value={form.badge}
                  placeholder="Long-form"
                  invalid={!!errorFor('badge')}
                  aria-invalid={!!errorFor('badge')}
                  onBlur={() => touch('badge')}
                  onChange={(e) => patch({ badge: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight, and press Enter for a line break. {counter('heading')}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                placeholder="Inside How Monginis Runs 200+ Outlets on **One Platform.**"
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.body.label}
              required
              error={errorFor('body')}
              hint={`The paragraph under the heading. ${counter('body')}`}
            >
              <Textarea
                rows={5}
                value={form.body}
                invalid={!!errorFor('body')}
                aria-invalid={!!errorFor('body')}
                onBlur={() => touch('body')}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </Field>

            <Field
              label="Bullets"
              error={shown('bullets', bulletsError)}
              hint={`The checklist under the paragraph, in order. Up to ${BULLETS_RULE.max}; empty rows are not saved.`}
            >
              <ChoiceListEditor
                rows={form.bullets}
                onChange={setBullets}
                onBlur={() => touch('bullets')}
                rule={BULLETS_RULE}
                placeholder="One point, one line"
                disabled={saving}
                showErrors={submitted || Boolean(touched.bullets)}
              />
            </Field>
          </CardBody>
        </Card>

        {/* The preview and the visibility switch follow the form on a wide
            screen, and drop below it on a narrow one. */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Visibility"
              action={
                <Badge tone={section?.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                  {section ? (section.status === 'ACTIVE' ? 'Active' : 'Inactive') : 'Not saved'}
                </Badge>
              }
            />
            <CardBody className="space-y-2">
              <Switch
                checked={form.live}
                onChange={(live) => patch({ live })}
                label="Show on the Insider page"
                disabled={saving}
              />
              <p className="text-xs text-charcoal-light dark:text-navy-300">
                Inactive removes the block from the live page but keeps its content here. Takes
                effect when you save.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" subtitle="How the heading will render." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadingPreview heading={form.heading} />
              </p>
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Image"
            subtitle="Optional. Without an image the copy stands alone, centred, and the badge (which sits on the image) is not shown."
          />
          <CardBody className="space-y-4">
            <Field label={IMAGE_SPEC.label} error={imageError} hint={IMAGE_SPEC.hint}>
              <ImageSlotPicker
                spec={IMAGE_SPEC}
                slot={form.image}
                boxClassName="h-36 w-48"
                onPick={(file) => void pickImage(file)}
                onClear={() => setImage({ ...EMPTY_IMAGE_SLOT })}
                disabled={saving}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/*
        Sticky to the bottom of the viewport, like the hero slide form, so the
        form never has to be scrolled to reach Save.
      */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-2">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
