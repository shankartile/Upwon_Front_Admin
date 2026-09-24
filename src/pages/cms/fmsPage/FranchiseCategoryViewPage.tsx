import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { franchiseSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsFranchiseCategory, FmsFranchiseEntry } from '../../../types/fmsPage';

/**
 * One franchise category, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the panel as
 * the page draws it - the photo under its wash, the flow, and the strip.
 *
 * Inactive rows are shown here, greyed, where the live panel drops them: this
 * screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/fms/franchise-section';

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

/** A colour with its swatch, the way the edit form shows it. */
function Swatch({ hex }: { hex: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
      <span
        className="h-4 w-4 rounded-full border border-cream-300 dark:border-navy-800"
        style={{ background: hex }}
      />
      {hex}
    </span>
  );
}

export default function FmsFranchiseCategoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<FmsFranchiseCategory | null>(null);
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
        <PageHeader title="Franchise category" description="Could not load this category." />
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

  const accent = category.accentColor;
  const tint = `${accent}1F`;
  const photo = assetUrl(category.image);
  const icon = assetUrl(category.icon);

  const dim = (entry: FmsFranchiseEntry) => (entry.status === 'ACTIVE' ? '' : 'opacity-50');

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={category.status === 'ACTIVE'}>
            {STATUS_LABELS[category.status]}
          </ActivePill>
        }
        title="View franchise category"
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
        <div className="space-y-6">
          <Card>
            <CardHeader title="The tab" subtitle="Selected, as the row draws it." />
            <CardBody>
              <div className="flex w-44 flex-col items-center rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
                <span
                  className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl p-2"
                  style={{ background: accent }}
                >
                  {icon ? (
                    // brightness-0 invert, as the live tab draws the selected one.
                    <img
                      src={icon}
                      alt=""
                      className="max-h-full max-w-full object-contain brightness-0 invert"
                    />
                  ) : (
                    <ImageOff className="h-5 w-5 text-white" />
                  )}
                </span>
                <span className="mt-3 text-[15px] font-bold leading-tight" style={{ color: accent }}>
                  {category.name}
                </span>
                <span className="mt-1 text-[14px] text-charcoal-light">{category.tagline}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The panel" subtitle="The photo under its colour wash." />
            <CardBody>
              <div
                className="relative flex min-h-[220px] overflow-hidden rounded-3xl bg-cover bg-center"
                style={photo ? { backgroundImage: `url('${photo}')` } : { background: '#eee' }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${category.surfaceColor} 0%, ${category.surfaceColor} 34%, ${category.surfaceColor}cc 50%, transparent 82%)`,
                  }}
                />
                <div className="relative z-10 flex max-w-[60%] flex-col p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal-light">
                    Selected Category
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-charcoal">{category.name}</h3>
                  <p className="mt-1 text-sm font-bold" style={{ color: accent }}>
                    {category.tagline}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-charcoal">
                    {category.description}
                  </p>
                  <span
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: accent }}
                  >
                    {category.exploreLabel}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="How it works for you"
              subtitle={`${category.steps.length} steps, in order.`}
            />
            <CardBody>
              {category.steps.length === 0 ? (
                <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                  No steps yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-6">
                  {category.steps.map((step, index) => (
                    <div key={step.id} className={`w-32 text-center ${dim(step)}`}>
                      <span
                        className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
                        style={{ background: tint, color: accent }}
                      >
                        <IconGlyph name={step.icon} className="h-5 w-5" />
                      </span>
                      <p className="mt-2 text-[14px] font-bold text-charcoal-light dark:text-navy-300">
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[14px] font-bold text-charcoal dark:text-cream-100">
                        {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-snug text-charcoal-light dark:text-navy-300">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Benefits strip"
              subtitle={`${category.benefits.length} claims, on the category’s tint.`}
            />
            <CardBody>
              {category.benefits.length === 0 ? (
                <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                  No benefits yet.
                </p>
              ) : (
                <div
                  className="grid gap-3 rounded-2xl p-4 sm:grid-cols-3"
                  style={{ background: tint }}
                >
                  {category.benefits.map((benefit) => (
                    <div
                      key={benefit.id}
                      className={`flex items-start gap-2.5 ${dim(benefit)}`}
                    >
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white"
                        style={{ color: accent }}
                      >
                        <IconGlyph name={benefit.icon} />
                      </span>
                      <div>
                        <p className="text-[14px] font-bold text-charcoal">{benefit.title}</p>
                        <p className="mt-0.5 text-[14px] leading-snug text-charcoal-light">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Category name" value={category.name} />
              <ReadOnlyField label="Slug" value={category.slug} />
              <ReadOnlyField label="Tagline" value={category.tagline} />
              <ReadOnlyField label="Link" value={`${category.exploreLabel} → ${category.exploreHref}`} />
              <ReadOnlyField label="Accent">
                <Swatch hex={category.accentColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Panel ground">
                <Swatch hex={category.surfaceColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Tab icon source">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {category.iconFileId ? 'Uploaded' : 'Linked URL'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Panel photo source">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {category.imageFileId ? 'Uploaded' : 'Linked URL'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={category.status === 'ACTIVE'}>
                  {STATUS_LABELS[category.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in tab row"
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
        <Skeleton className="h-[40rem] rounded-2xl" />
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    </>
  );
}
