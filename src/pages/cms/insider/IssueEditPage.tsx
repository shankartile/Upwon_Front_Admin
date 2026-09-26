import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImageOff, Plus, Save, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Tabs } from '../../../components/ui/Tabs';
import { Skeleton } from '../../../components/ui/Skeleton';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as issuesService from '../../../services/insiderIssuesService';
import * as storiesService from '../../../services/insiderStoriesService';
import { errorMessage } from '../../../lib/http';
import type {
  ContentStatus,
  InsiderIssue,
  InsiderIssueDetail,
  InsiderStory,
} from '../../../types/insiderPage';
import { serverFieldErrors } from '../../../lib/formErrors';
import { checkText, SLUG_MIN, toContentStatus, toSlug } from './insiderForm';

/**
 * Create / edit one Insider news item, at /cms/insider/news/:id
 * ('new' = create), backed by the live API (services/insiderIssuesService -
 * the backend still calls the record an issue; the admin reads "news").
 *
 * Two tabs: the news item's own fields, and its stories - listed, reordered,
 * published and deleted here, and written on their own page (StoryEditPage).
 * `?tab=stories` opens the second, so the story form can return to it.
 */

const LIST_PATH = '/cms/insider/news';

/** MAX_INSIDER_STORIES_PER_ISSUE on the server. Shown as a hint before the 409. */
const MAX_STORIES = 12;

/**
 * Field rules, mirroring the server-side issue validator
 * (modules/insider-page/validators/issues.validator.ts): label 2-120.
 *
 * The number printed beside the label on the site is not authored here: the
 * server assigns the next free one when a news item is created, and never
 * changes it afterwards.
 */
const RULES = {
  label: { label: 'Label', min: 2, max: 120, required: true },
} as const;

type Tab = 'details' | 'stories';

type FieldName = 'label';

interface DraftForm {
  label: string;
  status: ContentStatus;
  /** Create only - an existing issue takes the flag through the header action. */
  isCurrent: boolean;
}

/**
 * A new news item starts hidden, unlike a new hero slide: it goes on the site as
 * a story grid, and a live one with no stories yet is an empty page.
 */
const EMPTY_FORM: DraftForm = {
  label: '',
  status: 'INACTIVE',
  isCurrent: false,
};

const toForm = (issue: InsiderIssue): DraftForm => ({
  label: issue.label,
  status: issue.status,
  isCurrent: issue.isCurrent,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<FieldName, boolean>>;

type Pending =
  | { kind: 'current' }
  | { kind: 'delete-story'; story: InsiderStory }
  | { kind: 'story-status'; story: InsiderStory; next: ContentStatus };

/**
 * The label's check. The slug is not edited here: the server makes a new news
 * item's URL from its label ('March 2026' -> /newsletter/march-2026) and never
 * changes an existing one, so old links keep working. A new label whose URL
 * another news item already has is caught here rather than by the server's 409.
 *
 * Passing the length rule is not enough on create: the server refuses a label
 * it cannot derive a slug from ('A.' -> 'a', a label in a non-Latin script ->
 * ''), and answers on the `slug` field, which this form does not render. So
 * the derived slug is checked too, and reported on the label.
 */
function issueLabelError(raw: string, isNew: boolean, others: InsiderIssue[]): string | null {
  const problem = checkText(RULES.label, raw);
  if (problem || !isNew) return problem;
  const slug = toSlug(raw);
  if (slug.length < SLUG_MIN) {
    return `Label needs at least ${SLUG_MIN} letters or numbers — the news item's web address (/newsletter/…) is made from it.`;
  }
  const taken = others.find((issue) => issue.slug === slug);
  return taken ? `${taken.label} already uses /newsletter/${slug}. Use a different label.` : null;
}

export default function IssueEditPage() {
  const { id = 'new' } = useParams<{ id: string }>();
  // Keyed by the id: React Router keeps this route's element mounted when only
  // the id changes (issue -> 'new' from the dashboard, 'new' -> the created
  // issue), and every piece of state below belongs to one issue.
  return <IssueEditor key={id} id={id} />;
}

function IssueEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'stories' ? 'stories' : 'details';

  const [issue, setIssue] = useState<InsiderIssueDetail | null>(null);
  const [stories, setStories] = useState<InsiderStory[]>([]);
  // Every other issue - for the uniqueness hints, and a new issue's number.
  const [others, setOthers] = useState<InsiderIssue[]>([]);
  const [form, setForm] = useState<DraftForm | null>(isNew ? { ...EMPTY_FORM } : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending | null>(null);

  /**
   * Takes any single-issue response as the new state - every one of them
   * carries the issue and its stories. `resetForm` is false after a story or
   * current-issue action, so an unsaved edit on the Details tab survives it.
   */
  const applyIssue = useCallback((found: InsiderIssueDetail, resetForm: boolean) => {
    setIssue(found);
    setStories(found.stories);
    if (!resetForm) return;
    setForm(toForm(found));
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Best-effort: the list only feeds hints, and the server re-checks both.
    issuesService
      .list()
      .then((all) => {
        if (cancelled) return;
        setOthers(all.filter((other) => other.id !== id));
      })
      .catch(() => undefined);

    if (!isNew) {
      issuesService
        .getById(id)
        .then((found) => {
          if (!cancelled) applyIssue(found, true);
        })
        .catch((error) => {
          if (!cancelled) setLoadError(errorMessage(error));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, isNew, applyIssue]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!form) return { label: null };
    return {
      label: issueLabelError(form.label, isNew, others),
    };
  }, [form, isNew, others]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="News item" description="Could not load this news item." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to news
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <Skeleton className="h-96 rounded-2xl" />;

  /**
   * A server error shows until its field changes; a local one once the field is
   * left. A slug failure belongs to the label - the slug is derived from it and
   * has no input of its own - so it is shown there rather than nowhere.
   */
  const errorFor = (name: FieldName): string | undefined =>
    serverErrors[name] ??
    (name === 'label' ? serverErrors.slug : undefined) ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      // The slug rides on the label, so editing the label clears it too.
      if ('label' in changes) delete next.slug;
      return next;
    });
  };

  const setTab = (next: Tab) =>
    setParams(next === 'stories' ? { tab: 'stories' } : {}, { replace: true });

  const storyPath = (storyId: string) => `${LIST_PATH}/${id}/stories/${storyId}`;

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const body = {
        label: form.label.trim(),
        status: form.status,
      };

      if (isNew) {
        const created = await issuesService.create({
          ...body,
          isCurrent: form.isCurrent,
        });
        toast.success('News item created', 'Add its stories next.');
        // Straight to its Stories tab - the next thing a new news item needs.
        navigate(`${LIST_PATH}/${created.id}?tab=stories`, { replace: true });
      } else {
        const updated = await issuesService.update(id, body);
        applyIssue(updated, true);
        toast.success(
          'News item saved',
          updated.status === 'ACTIVE'
            ? 'The live Insider page now shows this news item.'
            : 'This news item is hidden on the live Insider page.',
        );
      }
    } catch (error) {
      setServerErrors(
        serverFieldErrors(error, {
          SLUG_TAKEN: 'label',
          /*
           * Only two admins creating a current news item at the same instant
           * reach this (insider_issues_single_current_idx). It belongs to the
           * switch that asked for it, which is on screen exactly when the
           * conflict is possible - the flag is only ever sent on create.
           */
          CURRENT_ISSUE_CONFLICT: 'isCurrent',
        }),
      );
      toast.error('Could not save news item', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const reloadIssue = async () => {
    try {
      applyIssue(await issuesService.getById(id), false);
    } catch (error) {
      toast.error('Could not refresh this news item', errorMessage(error));
    }
  };

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'current') {
        applyIssue(await issuesService.setCurrent(id), false);
        // The previous holder lost the flag; the hints read it from here.
        setOthers((all) => all.map((other) => ({ ...other, isCurrent: false })));
        toast.success('Current news item changed', `/newsletter now opens on ${issue?.label}.`);
      } else if (pending.kind === 'delete-story') {
        await storiesService.remove(id, pending.story.id);
        toast.success('Story deleted');
        await reloadIssue();
      } else {
        await storiesService.setStatus(id, pending.story.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Story activated' : 'Story deactivated');
        await reloadIssue();
      }
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  /**
   * Sends the whole id list in its new order, like the hero slide list - and,
   * like it, moves the row on click and puts it back if the server refuses.
   */
  const moveStory = async (storyId: string, direction: -1 | 1) => {
    const index = stories.findIndex((s) => s.id === storyId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= stories.length) return;

    const next = [...stories];
    [next[index], next[target]] = [next[target], next[index]];
    setStories(next);
    setReordering(true);
    try {
      setStories(await storiesService.reorder(id, next.map((s) => s.id)));
    } catch (error) {
      toast.error('Could not reorder', errorMessage(error));
      await reloadIssue();
    } finally {
      setReordering(false);
    }
  };

  const liveStories = stories.filter((s) => s.status === 'ACTIVE').length;
  const atLimit = stories.length >= MAX_STORIES;
  const previousCurrent = others.find((other) => other.isCurrent);

  return (
    <>
      <PageHeader
        eyebrow={
          issue && (
            <div className="flex items-center gap-2">
              <Badge tone={issue.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                {issue.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
              {issue.isCurrent && <Badge tone="gold">Current</Badge>}
            </div>
          )
        }
        title={isNew ? 'New news item' : (issue?.label ?? 'Edit news item')}
        description={
          issue
            ? `No. ${issue.issueNumber} · /newsletter/${issue.slug}`
            : 'A new monthly news item of the Operations Insider.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              disabled={saving}
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            {issue && !issue.isCurrent && (
              <Button
                variant="secondary"
                leftIcon={<Star className="h-4 w-4" />}
                onClick={() => setPending({ kind: 'current' })}
              >
                Set as current
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardBody className="pt-3">
          <Tabs<Tab>
            tabs={[
              { id: 'details', label: 'Details' },
              { id: 'stories', label: 'Stories', count: isNew ? undefined : stories.length },
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="pt-5 space-y-4">
            {tab === 'details' && (
              <>
                <FieldGrid>
                  <Field
                    label={RULES.label.label}
                    required
                    error={errorFor('label')}
                    hint={
                      isNew
                        ? `The news item's name on the site, e.g. March 2026. Its URL is made from it: /newsletter/${toSlug(form.label) || '…'}. ${form.label.trim().length}/${RULES.label.max}`
                        : `The news item's name on the site, e.g. March 2026. ${form.label.trim().length}/${RULES.label.max}`
                    }
                  >
                    <Input
                      value={form.label}
                      placeholder="April 2026"
                      invalid={!!errorFor('label')}
                      aria-invalid={!!errorFor('label')}
                      onBlur={() => touch('label')}
                      onChange={(e) => patch({ label: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Status"
                    hint={
                      isNew
                        ? 'New news items start inactive, so their stories can be added before anyone sees them.'
                        : 'Inactive takes the news item and all its stories off the site, but keeps them here.'
                    }
                  >
                    <Select
                      value={form.status}
                      onChange={(e) => patch({ status: toContentStatus(e.target.value, form.status) })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </Select>
                  </Field>
                </FieldGrid>
                {isNew && (
                  <Field
                    label="Current"
                    error={serverErrors.isCurrent}
                    hint={
                      previousCurrent
                        ? `/newsletter opens on the current news item, now ${previousCurrent.label}. Only one can be current.`
                        : '/newsletter opens on the current news item. Only one can be current.'
                    }
                  >
                    <Switch
                      checked={form.isCurrent}
                      onChange={(isCurrent) => patch({ isCurrent })}
                      label="Set as current"
                      disabled={saving}
                    />
                  </Field>
                )}
              </>
            )}

            {tab === 'stories' && (
              <div className="space-y-3">
                {isNew ? (
                  <p className="text-sm text-charcoal-light dark:text-navy-300">
                    Save the news item first, then add its stories.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-charcoal-light dark:text-navy-300">
                        {liveStories} of {stories.length} stor{stories.length === 1 ? 'y' : 'ies'}{' '}
                        active, in the order the news item's grid shows them.
                      </p>
                      <Button
                        variant="secondary"
                        leftIcon={<Plus className="w-4 h-4" />}
                        disabled={atLimit}
                        title={
                          atLimit ? `A news item holds at most ${MAX_STORIES} stories` : undefined
                        }
                        onClick={() => navigate(storyPath('new'))}
                      >
                        Add story
                      </Button>
                    </div>
                    {issue?.status === 'INACTIVE' && stories.length > 0 && (
                      <p className="text-xs text-gold-700 dark:text-gold-400">
                        This news item is inactive, so none of its stories are on the site until it
                        is activated.
                      </p>
                    )}
                    {stories.length === 0 && (
                      <p className="text-sm text-charcoal-light dark:text-navy-300">No stories yet.</p>
                    )}
                    <ul className="divide-y hairline">
                      {stories.map((s, index) => (
                        <li key={s.id} className="flex items-center gap-3 py-2">
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="w-5 tabular-nums text-sm text-charcoal-light dark:text-navy-300">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              aria-label="Move up"
                              title="Move up"
                              disabled={reordering || index === 0}
                              onClick={() => void moveStory(s.id, -1)}
                              className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Move down"
                              title="Move down"
                              disabled={reordering || index === stories.length - 1}
                              onClick={() => void moveStory(s.id, 1)}
                              className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {s.image ? (
                            <img
                              src={s.image}
                              alt=""
                              className="h-10 w-16 shrink-0 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                            />
                          ) : (
                            <span
                              className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                              title="No image"
                            >
                              <ImageOff className="h-4 w-4" />
                            </span>
                          )}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => navigate(storyPath(s.id))}
                          >
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                              {s.eyebrow}
                            </p>
                            <p className="truncate text-sm font-medium text-charcoal dark:text-cream-100">
                              {s.title}
                            </p>
                            <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                              {`/${s.slug}`}
                            </p>
                          </button>
                          <Badge tone={s.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                            {s.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                          <RowActions
                            onEdit={() => navigate(storyPath(s.id))}
                            onDelete={() => setPending({ kind: 'delete-story', story: s })}
                            toggle={{
                              checked: s.status === 'ACTIVE',
                              onChange: (checked) =>
                                setPending({
                                  kind: 'story-status',
                                  story: s,
                                  next: checked ? 'ACTIVE' : 'INACTIVE',
                                }),
                              // One state, one pair of words: the badge beside
                              // each story reads Active / Inactive, so the
                              // control that changes it does too.
                              label: s.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/*
        Save belongs to the Details tab - the Stories tab acts row by row. Sticky
        to the bottom of the viewport, like the other Insider forms.
      */}
      {tab === 'details' && (
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
              {isNew ? 'Create news item' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'current'
            ? 'Set as current'
            : pending?.kind === 'delete-story'
              ? 'Delete story'
              : pending?.next === 'ACTIVE'
                ? 'Activate story'
                : 'Deactivate story'
        }
        description={pendingDescription(pending, issue, previousCurrent)}
        confirmLabel={pending?.kind === 'delete-story' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete-story' ? 'danger' : 'primary'}
      />
    </>
  );
}

function pendingDescription(
  p: Pending | null,
  issue: InsiderIssue | null,
  previousCurrent: InsiderIssue | undefined,
): string {
  if (!p || !issue) return '';

  if (p.kind === 'current') {
    const opens = `/newsletter will open on "${issue.label}"${previousCurrent ? ` instead of "${previousCurrent.label}"` : ''}.`;
    return issue.status === 'ACTIVE'
      ? opens
      : `${opens} It is inactive, so until it is activated the page opens on the newest active news item.`;
  }

  if (p.kind === 'delete-story') {
    return `"${p.story.title}" will be permanently removed from this news item.`;
  }

  if (p.next === 'ACTIVE') {
    return issue.status === 'ACTIVE'
      ? 'This story will start appearing in the news item on the live Insider page.'
      : 'This story will be live as soon as its news item is activated.';
  }
  return 'This story will be removed from the live news item but kept here.';
}
