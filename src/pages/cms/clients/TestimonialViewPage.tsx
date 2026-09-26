import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as service from '../../../services/clientsTestimonialsSectionService';
import { errorMessage } from '../../../lib/http';
import { siteAssetUrl } from '../../../lib/contentUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ClientsTestimonial } from '../../../types/clientsPage';
import { TestimonialCardPreview } from './TestimonialEditPage';

/** One testimonial, read-only. */

const LIST_PATH = '/cms/clients/testimonials-section';

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

export default function ClientsTestimonialViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ClientsTestimonial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (!cancelled) setRow(found);
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
              Back to testimonials
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!row) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
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
              onClick={() => navigate(`${LIST_PATH}/${row.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Card" subtitle="Roughly as the marquee draws it." />
          <CardBody>
            <div className="max-w-md">
              <TestimonialCardPreview
                quote={row.quote}
                author={row.author}
                company={row.company}
                rating={row.rating}
                avatar={siteAssetUrl(row.avatar)}
                fallbackColor={row.fallbackColor}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Status">
              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>
            </ReadOnlyField>
            <ReadOnlyField label="Rating" value={`${row.rating} of 5`} />
            <ReadOnlyField label="Position" value={String(row.displayOrder + 1)} />
            <ReadOnlyField
              label="Photo source"
              value={row.avatarFileId ? 'Uploaded through the panel' : row.avatarUrl}
            />
            <ReadOnlyField label="Initials colour">
              <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-cream-300"
                  style={{ backgroundColor: row.fallbackColor }}
                />
                {row.fallbackColor}
              </span>
            </ReadOnlyField>
            <ReadOnlyField label="Last updated" value={new Date(row.updatedAt).toLocaleString()} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
