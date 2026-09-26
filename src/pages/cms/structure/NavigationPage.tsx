import { useMemo, useState } from 'react';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import { checkText, counterFor, linkError, type TextRule } from '../../../lib/fieldRules';

interface NavLink { id: string; label: string; href: string }

const TOP: NavLink[] = [
  { id: 'n1', label: 'Platform', href: '/platform' },
  { id: 'n2', label: 'Industries', href: '/industries' },
  { id: 'n3', label: 'Pricing', href: '/pricing' },
  { id: 'n4', label: 'Resources', href: '/resources' },
];
const FOOT: NavLink[] = [
  { id: 'f1', label: 'About', href: '/about' },
  { id: 'f2', label: 'Careers', href: '/careers' },
  { id: 'f3', label: 'Contact', href: '/contact' },
  { id: 'f4', label: 'Legal', href: '/legal' },
];

/** The panel's own rules - navigation has no server counterpart. */
const LABEL_RULE: TextRule = { label: 'Label', min: 1, max: 40, required: true };
const HREF_MAX = 500;
/** What the header bar can hold before it wraps onto a second line. */
const LINKS_MAX = 8;

interface RowErrors { label: string | null; href: string | null }

/**
 * One link set, checked row by row.
 *
 * Duplicates are refused on both halves: two items with the same label are
 * indistinguishable in the bar, and two pointing at the same path are one item
 * rendered twice.
 */
function linkSetErrors(links: NavLink[]): RowErrors[] {
  const labelsSeen = new Map<string, number>();
  const hrefsSeen = new Map<string, number>();

  return links.map((link, index) => {
    const label = link.label.trim();
    const href = link.href.trim();

    let labelError = checkText(LABEL_RULE, label);
    if (!labelError && label) {
      const key = label.toLowerCase();
      const first = labelsSeen.get(key);
      if (first !== undefined) labelError = `Same label as link ${first + 1}.`;
      else labelsSeen.set(key, index);
    }

    let hrefError = linkError(href, { label: 'URL', required: true, max: HREF_MAX });
    if (!hrefError && href) {
      const key = href.toLowerCase();
      const first = hrefsSeen.get(key);
      if (first !== undefined) hrefError = `Same address as link ${first + 1}.`;
      else hrefsSeen.set(key, index);
    }

    return { label: labelError, href: hrefError };
  });
}

const setHasErrors = (rows: RowErrors[], links: NavLink[]): boolean =>
  links.length > LINKS_MAX || rows.some((r) => r.label || r.href);

function LinkEditor({
  links, setLinks, errors, submitted, onTouch, touched, setKey,
}: {
  links: NavLink[];
  setLinks: (l: NavLink[]) => void;
  errors: RowErrors[];
  submitted: boolean;
  touched: Record<string, boolean>;
  onTouch: (key: string) => void;
  setKey: string;
}) {
  const update = (i: number, p: Partial<NavLink>) => setLinks(links.map((l, idx) => (idx === i ? { ...l, ...p } : l)));
  /*
   * Blur state is keyed by the link's own id, not by its position: links are
   * removed with a filter and reordered in place, so an index-keyed flag would
   * stay behind and end up describing whichever row took that slot.
   */
  const errorFor = (i: number, field: keyof RowErrors): string | undefined =>
    submitted || touched[`${setKey}.${links[i]?.id}.${field}`]
      ? (errors[i]?.[field] ?? undefined)
      : undefined;

  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={l.id} className="grid grid-cols-1 md:grid-cols-[20px,1fr,1fr,40px] gap-2 items-start">
          <GripVertical className="w-4 h-4 text-charcoal-light mt-7 cursor-grab" />
          <Field label="Label" required error={errorFor(i, 'label')} hint={counterFor(l.label, LABEL_RULE.max)}>
            <Input
              value={l.label}
              invalid={!!errorFor(i, 'label')}
              aria-invalid={!!errorFor(i, 'label')}
              onBlur={() => onTouch(`${setKey}.${l.id}.label`)}
              onChange={(e) => update(i, { label: e.target.value })}
            />
          </Field>
          <Field label="URL" required error={errorFor(i, 'href')} hint="A site path such as /pricing, or a full https:// address.">
            <Input
              value={l.href}
              invalid={!!errorFor(i, 'href')}
              aria-invalid={!!errorFor(i, 'href')}
              onBlur={() => onTouch(`${setKey}.${l.id}.href`)}
              onChange={(e) => update(i, { href: e.target.value })}
            />
          </Field>
          <Button variant="ghost" size="icon" className="mt-6" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        leftIcon={<Plus className="w-4 h-4" />}
        disabled={links.length >= LINKS_MAX}
        onClick={() => setLinks([...links, { id: `n${Date.now()}`, label: '', href: '/' }])}
      >
        Add link
      </Button>
      <p className="text-xs text-charcoal-light dark:text-navy-300">Up to {LINKS_MAX} links in this set.</p>
    </div>
  );
}

export default function NavigationPage() {
  const [top, setTop] = useState(TOP);
  const [foot, setFoot] = useState(FOOT);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const topErrors = useMemo(() => linkSetErrors(top), [top]);
  const footErrors = useMemo(() => linkSetErrors(foot), [foot]);
  const hasErrors = setHasErrors(topErrors, top) || setHasErrors(footErrors, foot);

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader
        title="Navigation"
        description="Top navigation and footer link sets."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top nav" />
          <CardBody>
            <LinkEditor
              links={top} setLinks={setTop} errors={topErrors}
              submitted={submitted} touched={touched} onTouch={touch} setKey="top"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Footer" />
          <CardBody>
            <LinkEditor
              links={foot} setLinks={setFoot} errors={footErrors}
              submitted={submitted} touched={touched} onTouch={touch} setKey="foot"
            />
          </CardBody>
        </Card>
      </div>
      {submitted && hasErrors && (
        <p className="mt-4 text-xs text-orange-700 dark:text-orange-400">
          Fix the highlighted fields above to continue.
        </p>
      )}
    </>
  );
}
