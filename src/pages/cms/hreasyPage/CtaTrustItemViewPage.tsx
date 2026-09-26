import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { ctaSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { HreasyCtaTrustItem } from '../../../types/hreasyPage';

/**
 * One reassurance from the trust strip, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the item as
 * the strip draws it.
 */

const LIST_PATH = '/cms/products/hreasy/cta-section/trust';

/** Shows a stored value, or a muted placeholder when there is none. */
function ReadOnlyField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{label}</p>
      {children ??
        (value ? (
          <p className="break-words text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function HreasyCtaTrustItemViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<HreasyCtaTrustItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.trust
      .getById(id)
      .then((found) => {
        if (!cancelled) setItem(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Reassurance" description="Could not load this reassurance." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!item) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={item.status === 'ACTIVE'}>{STATUS_LABELS[item.status]}</ActivePill>
        }
        title="View reassurance"
        description="Read-only. Use Edit to change this reassurance."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/${item.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The item" subtitle="As the strip draws it." />
          <CardBody>
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-cream-300 px-4 py-3 dark:border-navy-800">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-orange-200 bg-white text-orange-500 dark:border-orange-900/40 dark:bg-navy-950/50">
                <IconGlyph name={item.icon} className="h-4 w-4" />
              </span>
              <p className="text-left text-[12px] font-semibold leading-tight text-charcoal dark:text-cream-100">
                {item.lineOne}
                <br />
                {item.lineTwo}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={item.icon} />
                  {item.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="First line" value={item.lineOne} />
              <ReadOnlyField label="Second line" value={item.lineTwo} />
              <ReadOnlyField label="Status">
                <ActivePill active={item.status === 'ACTIVE'}>
                  {STATUS_LABELS[item.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in strip" value={String(item.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(item.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function ViewSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
