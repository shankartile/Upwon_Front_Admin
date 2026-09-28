import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { coverageSection as service } from '../../../services/spicesAgroPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SpicesAgroCoverageCategory } from '../../../types/spicesAgroPage';

/**
 * One industry coverage tile, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile as
 * the grid draws it: a round photo with the name under it.
 */

const LIST_PATH = '/cms/industries/spices-agro/coverage-section';

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

export default function SpicesAgroCoverageCategoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<SpicesAgroCoverageCategory | null>(null);
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
        <PageHeader title="Customer category" description="Could not load this category." />
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

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={category.status === 'ACTIVE'}>{STATUS_LABELS[category.status]}</ActivePill>
        }
        title="View customer category"
        description="Read-only. Use Edit to change this category."
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
          <CardHeader title="The tile" subtitle="As the grid draws it." />
          <CardBody>
            <div className="flex w-48 flex-col items-center rounded-2xl border border-cream-300 bg-white p-4 text-center dark:border-navy-800">
              {category.image ? (
                <>
                  <img
                    src={assetUrl(category.image) ?? undefined}
                    alt={category.label}
                    className="aspect-square w-full max-w-[132px] rounded-full object-cover"
                  />
                  <p className="mt-4 text-[13px] font-semibold leading-snug text-charcoal">
                    {category.label}
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <ImageOff className="mx-auto h-6 w-6 text-charcoal-light dark:text-navy-300" />
                  <p className="mt-2 text-sm italic text-charcoal-light dark:text-navy-300">
                    The photo this category pointed at is gone, so it is left out of the grid.
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Category name" value={category.label} />
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
                label="Position in grid"
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
