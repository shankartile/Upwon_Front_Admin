import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { recognitionSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ErpIndustry, ErpIndustryFeature } from '../../../types/erpPage';

/**
 * One industry, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the
 * industry as content - the selector entry as it appears in the list, the panel
 * with its two images, and the features in the order the panel draws them.
 *
 * Inactive features are shown, marked: they are part of the record even though
 * the live page leaves them out.
 */

const LIST_PATH = '/cms/products/erp/recognition-section';

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
          <p className="whitespace-pre-line text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

function ImagePanel({ src, alt }: { src: string | null; alt: string | null }) {
  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50">
      <img src={assetUrl(src)} alt={alt ?? ''} className="block w-full" />
    </div>
  );
}

export default function ErpIndustryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [industry, setIndustry] = useState<ErpIndustry | null>(null);
  const [features, setFeatures] = useState<ErpIndustryFeature[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([service.industries.getById(id), service.features.list(id)])
      .then(([found, rows]) => {
        if (cancelled) return;
        setIndustry(found);
        setFeatures(rows);
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
              Back to industry recognition
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!industry) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={industry.status === 'ACTIVE'}>
            {STATUS_LABELS[industry.status]}
          </ActivePill>
        }
        title={industry.name}
        description="How this industry reads in the recognition section."
        actions={
          <div className="flex gap-3">
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
              onClick={() => navigate(`${LIST_PATH}/${industry.id}`)}
            >
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Selector entry" subtitle="The row in the list down the left." />
          <CardBody className="space-y-5">
            {/* Laid out the way the live button is: icon, name, then the line. */}
            <div className="flex items-center gap-3 rounded-2xl border border-orange-300 bg-orange-50/70 p-3 dark:border-orange-500/40 dark:bg-orange-500/5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-orange-200 bg-white text-orange-500 dark:border-orange-500/40 dark:bg-navy-900">
                <IconGlyph name={industry.icon} className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-charcoal dark:text-cream-100">
                  {industry.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-charcoal-light dark:text-navy-300">
                  {industry.shortDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Slug" >
                <code className="inline-block rounded bg-cream-100 px-1.5 py-0.5 text-xs text-charcoal-light dark:bg-navy-900 dark:text-navy-300">
                  {industry.slug}
                </code>
              </ReadOnlyField>
              <ReadOnlyField label="Icon" value={industry.icon} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Detail panel" subtitle="The card shown when this industry is chosen." />
          <CardBody className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Panel title" value={industry.erpTitle} />
              <ReadOnlyField label="Panel description" value={industry.erpDescription} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <ImagePanel src={industry.image} alt={industry.imageAlt} />
                <ReadOnlyField label="Photo alt text" value={industry.imageAlt} />
              </div>
              <div className="space-y-3">
                <ImagePanel src={industry.dashboard} alt={industry.dashboardAlt} />
                <ReadOnlyField label="Screenshot alt text" value={industry.dashboardAlt} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Features"
            subtitle={`${features.length} listed, in the order the panel draws them.`}
          />
          <CardBody>
            {features.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                No features on this industry yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {features.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream-300 bg-white text-orange-500 dark:border-navy-800 dark:bg-navy-900">
                      <IconGlyph name={feature.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-charcoal dark:text-cream-100">
                        {feature.title}
                        {feature.status !== 'ACTIVE' && (
                          <ActivePill active={false}>{STATUS_LABELS[feature.status]}</ActivePill>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-charcoal-light dark:text-navy-300">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
