import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { coverageSection as service } from '../../../services/qsrFranchisePageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { QsrFranchiseCoverageCategory } from '../../../types/qsrFranchisePage';

/**
 * One industry coverage format, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the row draws it: a photo, the icon on its edge, and the name under it.
 */

const LIST_PATH = '/cms/industries/qsr-franchise/coverage-section';

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

export default function QsrFranchiseCoverageCategoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<QsrFranchiseCoverageCategory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.categories
      .getById(id)
      .then((found) => {
        if (!cancelled) setCategory(found);
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
        <PageHeader title="Business format" description="Could not load this format." />
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

  if (!category) return <ViewSkeleton />;

  const photo = assetUrl(category.image) ?? undefined;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={category.status === 'ACTIVE'}>{STATUS_LABELS[category.status]}</ActivePill>
        }
        title="View business format"
        description="Read-only. Use Edit to change this format."
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
              onClick={() => navigate(`${LIST_PATH}/categories/${category.id}`)}
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
              <div className="relative">
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
                <span className="absolute -bottom-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[#fff2e9] text-orange-500 shadow-[0_8px_20px_rgba(25,35,55,0.12)]">
                  <IconGlyph name={category.icon} className="h-5 w-5" />
                </span>
              </div>
              <p className="px-2 pb-2 pt-9 text-center text-[13px] font-semibold leading-snug text-navy-950">
                {category.label}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Format name" value={category.label} />
              <ReadOnlyField label="Icon" value={category.icon} />
              <ReadOnlyField
                label="Image source"
                value={category.imageFileId ? 'Uploaded to the CMS' : (category.imageUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={category.status === 'ACTIVE'}>
                  {STATUS_LABELS[category.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in row"
                value={String(category.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(category.updatedAt).toLocaleString()}
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
