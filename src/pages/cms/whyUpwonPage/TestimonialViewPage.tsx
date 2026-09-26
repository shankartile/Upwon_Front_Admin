import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { testimonialsSection as service } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { WhyUpwonTestimonial } from '../../../types/whyUpwonPage';

/**
 * One testimonial, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the section draws it - the brand plate beside the quote.
 */

const LIST_PATH = '/cms/why-upwon/testimonials-section';

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

export default function WhyUpwonTestimonialViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testimonial, setTestimonial] = useState<WhyUpwonTestimonial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.testimonials
      .getById(id)
      .then((found) => {
        if (!cancelled) setTestimonial(found);
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
        <PageHeader title="Testimonial" description="Could not load this testimonial." />
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

  if (!testimonial) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={testimonial.status === 'ACTIVE'}>
            {STATUS_LABELS[testimonial.status]}
          </ActivePill>
        }
        title="View testimonial"
        description="Read-only. Use Edit to change this testimonial."
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
              onClick={() => navigate(`${LIST_PATH}/testimonials/${testimonial.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle="As the section draws it." />
          <CardBody>
            <div className="grid overflow-hidden rounded-[20px] bg-white shadow-[0_18px_50px_rgba(25,35,55,0.09)] ring-1 ring-navy-950/[0.05] sm:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#eef3fb] via-[#f5f8fd] to-[#e9eff9] px-6 py-8">
                {testimonial.logo ? (
                  <img
                    src={assetUrl(testimonial.logo) ?? undefined}
                    alt={testimonial.brand}
                    className="block h-[64px] w-auto max-w-[150px] object-contain"
                  />
                ) : (
                  <ImageOff className="h-6 w-6 text-charcoal-light" />
                )}
                <p className="text-center text-[11.5px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-navy-500">
                  {testimonial.category}
                  <span className="mt-1 block font-medium normal-case tracking-normal text-navy-400">
                    {testimonial.location}
                  </span>
                </p>
              </div>
              <div className="flex min-w-0 flex-col p-6">
                <p className="text-[16px] font-semibold leading-[1.5] tracking-tight text-navy-950">
                  “{testimonial.quote}”
                </p>
                <p className="mt-5 text-[14.5px] font-bold leading-tight text-navy-950">
                  {testimonial.author}
                </p>
                <p className="mt-0.5 text-[13px] leading-tight text-navy-500">{testimonial.role}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Brand" value={testimonial.brand} />
              <ReadOnlyField label="Author" value={testimonial.author} />
              <ReadOnlyField label="Role / company" value={testimonial.role} />
              <ReadOnlyField label="Category" value={testimonial.category} />
              <ReadOnlyField label="Location" value={testimonial.location} />
              <ReadOnlyField
                label="Logo source"
                value={
                  testimonial.logoFileId ? 'Uploaded to the CMS' : (testimonial.logoUrl ?? null)
                }
              />
              <ReadOnlyField label="Status">
                <ActivePill active={testimonial.status === 'ACTIVE'}>
                  {STATUS_LABELS[testimonial.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position on card"
                value={String(testimonial.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(testimonial.updatedAt).toLocaleString()}
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
