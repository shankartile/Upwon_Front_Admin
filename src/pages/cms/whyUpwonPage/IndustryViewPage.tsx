import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { industriesSection as service } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { WhyUpwonIndustry } from '../../../types/whyUpwonPage';

/**
 * One industry trust card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the row draws it: a photo, with the name and its arrow under it.
 */

const LIST_PATH = '/cms/why-upwon/industries-section';

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

export default function WhyUpwonIndustryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [industry, setIndustry] = useState<WhyUpwonIndustry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.industries
      .getById(id)
      .then((found) => {
        if (!cancelled) setIndustry(found);
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
        <PageHeader title="Industry" description="Could not load this industry." />
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

  if (!industry) return <ViewSkeleton />;

  const photo = assetUrl(industry.image) ?? undefined;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={industry.status === 'ACTIVE'}>{STATUS_LABELS[industry.status]}</ActivePill>
        }
        title="View industry"
        description="Read-only. Use Edit to change this industry."
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
              onClick={() => navigate(`${LIST_PATH}/industries/${industry.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle="As the row draws it." />
          <CardBody>
            <div className="flex w-[206px] flex-col rounded-[16px] border border-navy-950/[0.06] bg-white p-2.5 shadow-[0_10px_28px_rgba(25,35,55,0.07)]">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  className="block h-[150px] w-full rounded-[12px] object-cover object-center"
                />
              ) : (
                <div className="flex h-[150px] w-full items-center justify-center rounded-[12px] bg-cream-100 text-charcoal-light">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
              <div className="mt-3.5 flex flex-1 items-end justify-between gap-2.5 px-1.5 pb-1.5">
                <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-navy-950">
                  {industry.label}
                </p>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950/[0.05] text-navy-700">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-1 truncate px-1.5 text-[11px] text-charcoal-light">{industry.href}</p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Industry name" value={industry.label} />
              <ReadOnlyField label="Link" value={industry.href} />
              <ReadOnlyField
                label="Image source"
                value={industry.imageFileId ? 'Uploaded to the CMS' : (industry.imageUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={industry.status === 'ACTIVE'}>
                  {STATUS_LABELS[industry.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in row"
                value={String(industry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(industry.updatedAt).toLocaleString()}
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
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
