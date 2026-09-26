import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { securitySection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { PosSecurityAssurance } from '../../../types/posPage';

/**
 * One assurance, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the phrase
 * as the row draws it.
 */

const LIST_PATH = '/cms/products/pos/security-section/assurances';

/** The page's accent, which every glyph in the row is drawn in. */
const ACCENT = '#E85A2A';

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

export default function PosSecurityAssuranceViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assurance, setAssurance] = useState<PosSecurityAssurance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.assurances
      .getById(id)
      .then((found) => {
        if (!cancelled) setAssurance(found);
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
        <PageHeader title="Assurance" description="Could not load this assurance." />
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

  if (!assurance) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={assurance.status === 'ACTIVE'}>
            {STATUS_LABELS[assurance.status]}
          </ActivePill>
        }
        title="View assurance"
        description="Read-only. Use Edit to change this assurance."
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
              onClick={() => navigate(`${LIST_PATH}/${assurance.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The phrase" subtitle="As the row draws it." />
          <CardBody>
            <div className="inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-950/50">
              <span className="inline-flex" style={{ color: ACCENT }}>
                <IconGlyph name={assurance.icon} className="h-4 w-4" />
              </span>
              <span className="text-[14px] font-bold text-charcoal dark:text-cream-100">
                {assurance.label}
              </span>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={assurance.icon} />
                  {assurance.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Phrase" value={assurance.label} />
              <ReadOnlyField label="Status">
                <ActivePill active={assurance.status === 'ACTIVE'}>
                  {STATUS_LABELS[assurance.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in row"
                value={String(assurance.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(assurance.updatedAt).toLocaleString()}
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
