import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import {
  journeySection as service,
  recognitionSection as iconService,
} from '../../../services/erpPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateErpJourneyPersonaInput, ErpJourneyPersona } from '../../../types/erpPage';
import { OutcomesCard, PointsCard, orderField } from './PersonaListCards';

/**
 * Create / edit one audience, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Everything the row and its panel need is on this one form: the entry in
 * the list on the left, the headline figure, and the person the proof is
 * attributed to.
 *
 * Its two lists are lists of their own, so they sit in their own cards below -
 * and only once the audience exists, because a row has nowhere to belong
 * until then.
 */

const LIST_PATH = '/cms/products/erp/benefits-section';

const AVATAR_ENTITY_TYPE = 'erp_journey_avatar';

/**
 * Field rules, mirroring the server-side journey validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does.
 */
const RULES = {
  role: { label: 'Role', min: 2, max: 120, required: true },
  context: { label: 'Context', min: 2, max: 200, required: true },
  title: { label: 'Headline', min: 3, max: 200, required: true },
  description: { label: 'Description', min: 3, max: 600, required: true },
  metricText: { label: 'Figure as text', min: 0, max: 40, required: false },
  metricPrefix: { label: 'Prefix', min: 0, max: 16, required: false },
  metricSuffix: { label: 'Suffix', min: 0, max: 16, required: false },
  metricLabel: { label: 'What the figure counts', min: 3, max: 255, required: true },
  authorDesignation: { label: 'Designation', min: 2, max: 160, required: true },
  authorCompany: { label: 'Company', min: 2, max: 160, required: true },
  avatarAlt: { label: 'Portrait alt text', min: 0, max: 255, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors the server's avatarColor check. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Which of the two forms the headline figure takes. */
type MetricMode = 'count' | 'text';

interface Form {
  role: string;
  context: string;
  title: string;
  description: string;
  metricMode: MetricMode;
  metricCountTo: string;
  metricText: string;
  metricPrefix: string;
  metricSuffix: string;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  avatarAlt: string;
  avatarColor: string;
  displayOrder: string;
  status: ContentStatus;
  /** What is already stored. */
  avatarFileId: string | null;
  avatarUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  avatarError: string | null;
}

const EMPTY: Form = {
  role: '',
  context: '',
  title: '',
  description: '',
  metricMode: 'count',
  metricCountTo: '',
  metricText: '',
  metricPrefix: '',
  metricSuffix: '',
  metricLabel: '',
  authorDesignation: '',
  authorCompany: '',
  avatarAlt: '',
  avatarColor: '#1565C0',
  displayOrder: '',
  status: 'ACTIVE',
  avatarFileId: null,
  avatarUrl: null,
  file: null,
  preview: null,
  avatarError: null,
};

const toForm = (persona: ErpJourneyPersona): Form => ({
  role: persona.role,
  context: persona.context,
  title: persona.title,
  description: persona.description,
  metricMode: persona.metricCountTo !== null ? 'count' : 'text',
  metricCountTo: persona.metricCountTo !== null ? String(persona.metricCountTo) : '',
  metricText: persona.metricText ?? '',
  metricPrefix: persona.metricPrefix ?? '',
  metricSuffix: persona.metricSuffix ?? '',
  metricLabel: persona.metricLabel,
  authorDesignation: persona.authorDesignation,
  authorCompany: persona.authorCompany,
  avatarAlt: persona.avatarAlt ?? '',
  avatarColor: persona.avatarColor,
  displayOrder: String(persona.displayOrder),
  status: persona.status,
  avatarFileId: persona.avatarFileId,
  avatarUrl: persona.avatarUrl,
  file: null,
  preview: assetUrl(persona.avatar) ?? null,
  avatarError: null,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

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
  return null;
}

export default function ErpPersonaEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [persona, setPersona] = useState<ErpJourneyPersona | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    let cancelled = false;

    iconService
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        // A failed icon list leaves the picker empty rather than blocking the
        // form; every other field still saves, and stored icons are kept.
      });

    if (isNew) {
      setForm({ ...EMPTY });
      return () => {
        cancelled = true;
      };
    }

    if (!id) return;
    service.personas
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setPersona(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      role: validateField('role', form.role),
      context: validateField('context', form.context),
      title: validateField('title', form.title),
      description: validateField('description', form.description),
      metricText: validateField('metricText', form.metricText),
      metricPrefix: validateField('metricPrefix', form.metricPrefix),
      metricSuffix: validateField('metricSuffix', form.metricSuffix),
      metricLabel: validateField('metricLabel', form.metricLabel),
      authorDesignation: validateField('authorDesignation', form.authorDesignation),
      authorCompany: validateField('authorCompany', form.authorCompany),
      avatarAlt: validateField('avatarAlt', form.avatarAlt),
    };
  }, [form]);

  /**
   * The headline figure has to be one form or the other, and the chosen one has
   * to be filled in. The server enforces the same rule with a CHECK.
   */
  const metricProblem = useMemo(() => {
    if (!form) return null;
    if (form.metricMode === 'count') {
      const value = form.metricCountTo.trim();
      if (!value) return 'The counting figure needs a number to count up to.';
      if (!/^\d+$/.test(value)) return 'The counting figure must be a whole number.';
    } else if (!form.metricText.trim()) {
      return 'The written figure cannot be empty — or switch it to a counting number.';
    }
    return null;
  }, [form]);

  const colorProblem = useMemo(() => {
    if (!form) return null;
    return HEX_COLOR.test(form.avatarColor.trim())
      ? null
      : 'The fallback colour must be a hex value like #1565C0.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(form?.avatarError) ||
    Boolean(metricProblem) ||
    Boolean(colorProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Audience" description="Could not load this audience." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to benefits for everyone
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const pickAvatar = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ avatarError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ avatarError: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ avatarError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('erpAvatar', dimensions);
    if (problem) {
      patch({ avatarError: problem });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, avatarError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let avatarFileId = form.avatarFileId;
      if (form.file) {
        avatarFileId = (await fileService.upload(form.file, AVATAR_ENTITY_TYPE)).id;
      }

      /*
       * The two metric columns are mutually exclusive, so the unused one is sent
       * as null - the server clears its twin either way, and this keeps a
       * switched form from leaving both set.
       */
      const counting = form.metricMode === 'count';

      const body: CreateErpJourneyPersonaInput = {
        role: form.role.trim(),
        context: form.context.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        metricCountTo: counting ? Number(form.metricCountTo.trim()) : null,
        metricText: counting ? null : form.metricText.trim(),
        metricPrefix: form.metricPrefix.trim() || null,
        metricSuffix: form.metricSuffix.trim() || null,
        metricLabel: form.metricLabel.trim(),
        authorDesignation: form.authorDesignation.trim(),
        authorCompany: form.authorCompany.trim(),
        avatarFileId,
        avatarUrl: avatarFileId ? null : form.avatarUrl,
        avatarAlt: form.avatarAlt.trim() || null,
        avatarColor: form.avatarColor.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.personas.create(body);
        toast.success('Audience created', 'Add its outcomes and points next.');
        // Straight to its own screen, where the two list cards are available.
        navigate(`${LIST_PATH}/${created.id}`, { replace: true });
        setPersona(created);
        setForm(toForm(created));
      } else {
        await service.personas.update(id!, body);
        toast.success('Audience updated', 'The public ERP page now shows this content.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save audience', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.erpAvatar;

  return (
    <>
      <PageHeader
        eyebrow={
          persona && (
            <ActivePill active={persona.status === 'ACTIVE'}>
              {STATUS_LABELS[persona.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New audience' : 'Edit audience'}
        description="One audience of the benefits list: its row on the left, and the proof panel shown when it is chosen."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="The row"
            subtitle="How this audience reads in the list down the left."
          />
          <CardBody className="space-y-5">
            <FieldGrid>
              <Field
                label={RULES.role.label}
                error={errorFor('role')}
                required
                hint="The page writes the eyebrow as “For the {role} · {context}”."
              >
                <Input
                  value={form.role}
                  maxLength={RULES.role.max}
                  placeholder="CFO"
                  aria-invalid={!!errorFor('role')}
                  onBlur={() => setTouched((t) => ({ ...t, role: true }))}
                  onChange={(e) => patch({ role: e.target.value })}
                />
              </Field>

              <Field label={RULES.context.label} error={errorFor('context')} required>
                <Input
                  value={form.context}
                  maxLength={RULES.context.max}
                  placeholder="Cost, compliance & return"
                  aria-invalid={!!errorFor('context')}
                  onBlur={() => setTouched((t) => ({ ...t, context: true }))}
                  onChange={(e) => patch({ context: e.target.value })}
                />
              </Field>
            </FieldGrid>

            {/* The composed sentence, so the effect of the two fields is visible. */}
            <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-2.5 dark:border-navy-800 dark:bg-navy-950/50">
              <p className="text-xs font-semibold tracking-wide text-orange-600 dark:text-orange-400">
                For the {form.role.trim() || 'Role'} · {form.context.trim() || 'Context'}
              </p>
            </div>

            <Field label={RULES.title.label} error={errorFor('title')} required>
              <Input
                value={form.title}
                maxLength={RULES.title.max}
                placeholder="Live cost and margin visibility"
                aria-invalid={!!errorFor('title')}
                onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.description.label}
              error={errorFor('description')}
              required
              hint="Revealed under the headline when this row is the active one."
            >
              <Textarea
                value={form.description}
                rows={2}
                maxLength={RULES.description.max}
                placeholder="Unclear ROI, statutory risk, and working capital tied up in slow reconciliation."
                aria-invalid={!!errorFor('description')}
                onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label="Display order"
                hint="Lower numbers come first. Leave blank to add at the end."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  placeholder="Auto"
                  onChange={(e) => patch({ displayOrder: e.target.value })}
                />
              </Field>

              <Field
                label="Status"
                hint="Inactive keeps the audience here but removes it from the live list."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Headline figure"
            subtitle="The big number at the top of the proof panel, in one of two forms."
          />
          <CardBody className="space-y-5">
            <Field
              label="Form"
              error={metricProblem ?? undefined}
              hint="A counting number animates up from zero. Written text is printed as typed — use it for ranges."
            >
              <Select
                value={form.metricMode}
                onChange={(e) => patch({ metricMode: e.target.value as MetricMode })}
              >
                <option value="count">A number that counts up</option>
                <option value="text">Text, printed as written</option>
              </Select>
            </Field>

            {form.metricMode === 'count' ? (
              <FieldGrid cols={3}>
                <Field label="Counts up to" required>
                  <Input
                    type="number"
                    min={0}
                    value={form.metricCountTo}
                    placeholder="18"
                    onChange={(e) => patch({ metricCountTo: e.target.value })}
                  />
                </Field>
                <Field label={RULES.metricPrefix.label} error={errorFor('metricPrefix')}>
                  <Input
                    value={form.metricPrefix}
                    maxLength={RULES.metricPrefix.max}
                    placeholder="₹"
                    onChange={(e) => patch({ metricPrefix: e.target.value })}
                  />
                </Field>
                <Field
                  label={RULES.metricSuffix.label}
                  error={errorFor('metricSuffix')}
                  hint="Leading space included if you want one."
                >
                  <Input
                    value={form.metricSuffix}
                    maxLength={RULES.metricSuffix.max}
                    placeholder=" yrs"
                    onChange={(e) => patch({ metricSuffix: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            ) : (
              <Field
                label={RULES.metricText.label}
                error={errorFor('metricText')}
                required
                hint="Typed exactly as it should read — the dash and the sign are yours."
              >
                <Input
                  value={form.metricText}
                  maxLength={RULES.metricText.max}
                  placeholder="8–18%"
                  aria-invalid={!!errorFor('metricText')}
                  onBlur={() => setTouched((t) => ({ ...t, metricText: true }))}
                  onChange={(e) => patch({ metricText: e.target.value })}
                />
              </Field>
            )}

            <Field
              label={RULES.metricLabel.label}
              error={errorFor('metricLabel')}
              required
              hint="The line under the figure."
            >
              <Input
                value={form.metricLabel}
                maxLength={RULES.metricLabel.max}
                placeholder="profitability improvement within 6–12 months"
                aria-invalid={!!errorFor('metricLabel')}
                onBlur={() => setTouched((t) => ({ ...t, metricLabel: true }))}
                onChange={(e) => patch({ metricLabel: e.target.value })}
              />
            </Field>

            {/* The figure as the panel will draw it. */}
            <div className="rounded-xl border border-cream-300 bg-cream-100 p-4 dark:border-navy-800 dark:bg-navy-950/50">
              <p className="text-2xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {form.metricMode === 'count'
                  ? `${form.metricPrefix}${form.metricCountTo.trim() || '0'}${form.metricSuffix}`
                  : form.metricText.trim() || '—'}
              </p>
              <p className="mt-1 text-sm text-charcoal-light dark:text-navy-300">
                {form.metricLabel.trim() || 'What the figure counts'}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Attributed to"
            subtitle="The person under the figures. The page shows a designation and a company, not a name."
          />
          <CardBody>
            <FieldGrid>
              <div className="space-y-4">
                <Field
                  label={RULES.authorDesignation.label}
                  error={errorFor('authorDesignation')}
                  required
                  hint="Also the initials shown when there is no portrait."
                >
                  <Input
                    value={form.authorDesignation}
                    maxLength={RULES.authorDesignation.max}
                    placeholder="Finance Director"
                    aria-invalid={!!errorFor('authorDesignation')}
                    onBlur={() => setTouched((t) => ({ ...t, authorDesignation: true }))}
                    onChange={(e) => patch({ authorDesignation: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.authorCompany.label}
                  error={errorFor('authorCompany')}
                  required
                >
                  <Input
                    value={form.authorCompany}
                    maxLength={RULES.authorCompany.max}
                    placeholder="Kaka Foods"
                    aria-invalid={!!errorFor('authorCompany')}
                    onBlur={() => setTouched((t) => ({ ...t, authorCompany: true }))}
                    onChange={(e) => patch({ authorCompany: e.target.value })}
                  />
                </Field>

                <Field
                  label="Fallback colour"
                  error={colorProblem ?? undefined}
                  hint="Behind the initials when there is no portrait, or it fails to load."
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      aria-label="Fallback colour"
                      value={HEX_COLOR.test(form.avatarColor) ? form.avatarColor : '#1565C0'}
                      onChange={(e) => patch({ avatarColor: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-cream-300 bg-transparent dark:border-navy-800"
                    />
                    <Input
                      value={form.avatarColor}
                      maxLength={32}
                      placeholder="#1565C0"
                      onChange={(e) => patch({ avatarColor: e.target.value })}
                    />
                  </div>
                </Field>
              </div>

              <div className="space-y-4">
                <Field label={spec.label} error={form.avatarError ?? undefined} hint={spec.hint}>
                  <AvatarPicker
                    preview={form.preview}
                    fileName={form.file?.name ?? null}
                    initials={initialsOf(form.authorDesignation)}
                    color={HEX_COLOR.test(form.avatarColor) ? form.avatarColor : '#1565C0'}
                    disabled={saving}
                    onPick={(file) => void pickAvatar(file)}
                    onClear={() => {
                      releaseObjectUrls();
                      patch({
                        file: null,
                        preview: null,
                        avatarFileId: null,
                        avatarUrl: null,
                        avatarError: null,
                      });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.avatarAlt.label}
                  error={errorFor('avatarAlt')}
                  hint="Describes the portrait for anyone who cannot see it."
                >
                  <Input
                    value={form.avatarAlt}
                    maxLength={RULES.avatarAlt.max}
                    placeholder="Finance Director"
                    aria-invalid={!!errorFor('avatarAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, avatarAlt: true }))}
                    onChange={(e) => patch({ avatarAlt: e.target.value })}
                  />
                </Field>
              </div>
            </FieldGrid>
          </CardBody>
        </Card>

        {isNew ? (
          <Card>
            <CardHeader
              title="Measurable outcomes and beyond the numbers"
              subtitle="The two lists in this audience's proof panel."
            />
            <CardBody>
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                Create the audience first — a line needs an audience to belong to.
              </p>
            </CardBody>
          </Card>
        ) : (
          <>
            <OutcomesCard personaId={id!} icons={icons} />
            <PointsCard personaId={id!} />
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {metricProblem ?? colorProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(metricProblem ?? colorProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create audience' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create audience' : 'Update audience'}
        description={
          isNew
            ? 'Are you sure you want to create this audience? It joins the list straight away, and you can add its two lists next.'
            : 'Are you sure you want to update this audience? The public ERP page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** The initials the live panel falls back to, derived the same way. */
function initialsOf(designation: string): string {
  return (
    designation
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—'
  );
}

/** Picks a portrait. Holds the File until save, so cancelling orphans nothing. */
function AvatarPicker({
  preview,
  fileName,
  initials,
  color,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  initials: string;
  color: string;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      {/* A circle, matching the panel: the portrait is never shown square. */}
      <div className="relative h-16 w-16 shrink-0">
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-cream-300 dark:ring-navy-800"
            />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove portrait"
                className="absolute -right-1 -top-1 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          // The initials-on-colour fallback, exactly as the live panel draws it.
          <span
            className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold text-white"
            style={{ background: color }}
          >
            {initials}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? 'Replace portrait' : 'Choose portrait'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'Optional — without one the initials show. PNG, JPG, GIF or WebP.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
