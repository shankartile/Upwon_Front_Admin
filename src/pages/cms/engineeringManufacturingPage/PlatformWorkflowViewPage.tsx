import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { platformSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { EngineeringPlatformWorkflow } from '../../../types/engineeringManufacturingPage';

/**
 * One connected workflow, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the row as
 * the live list draws it.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/platform-section';

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

function Swatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
      <span
        className="h-4 w-4 rounded-full border border-cream-300 dark:border-navy-800"
        style={{ background: color }}
      />
      {color}
    </span>
  );
}

export default function EngineeringPlatformWorkflowViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<EngineeringPlatformWorkflow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.workflows
      .getById(id)
      .then((found) => {
        if (!cancelled) setWorkflow(found);
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
        <PageHeader title="Workflow" description="Could not load this workflow." />
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

  if (!workflow) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={workflow.status === 'ACTIVE'}>
            {STATUS_LABELS[workflow.status]}
          </ActivePill>
        }
        title="View workflow"
        description="Read-only. Use Edit to change this workflow."
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
              onClick={() => navigate(`${LIST_PATH}/workflows/${workflow.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The row" subtitle="As the live list draws it." />
          <CardBody>
            <div className="flex max-w-sm items-center gap-3 rounded-[10px] border border-cream-300 bg-white px-3 py-2.5 dark:border-navy-800 dark:bg-navy-950/50">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                style={{ background: workflow.tintColor, color: workflow.accentColor }}
              >
                <IconGlyph name={workflow.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-[12.5px] font-medium leading-snug text-charcoal dark:text-cream-100">
                {workflow.label}
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
                  <IconGlyph name={workflow.icon} />
                  {workflow.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Icon colour">
                <Swatch color={workflow.accentColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Background colour">
                <Swatch color={workflow.tintColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={workflow.status === 'ACTIVE'}>
                  {STATUS_LABELS[workflow.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in list"
                value={String(workflow.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(workflow.updatedAt).toLocaleString()}
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
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
