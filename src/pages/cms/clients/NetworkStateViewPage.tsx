import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as service from '../../../services/clientsNetworkSectionService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ClientsNetworkState } from '../../../types/clientsPage';

/** One network state, read-only. */

const LIST_PATH = '/cms/clients/network-section';

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

export default function ClientsNetworkStateViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ClientsNetworkState | null>(null);
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
        <PageHeader title="Network state" description="Could not load this state." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the network
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
        title="View network state"
        description="Read-only. Use Edit to change this state."
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
          <CardHeader title="Card" subtitle="Roughly as the Clients page draws it." />
          <CardBody className="space-y-6">
            {/* The state card, on the band's dark background. */}
            <div className="max-w-sm rounded-2xl bg-navy-950 p-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
                    <MapPin className="h-4 w-4 text-orange-400" />
                    {row.state}
                  </p>
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-300">
                    {row.cities.length}
                  </span>
                </div>
                <p className="mt-3 text-sm text-navy-200">
                  {row.cities.map((c) => c.name).join(' · ')}
                </p>
              </div>
            </div>

            <table className="w-full max-w-lg text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-charcoal-light dark:text-navy-300">
                <tr>
                  <th className="py-1.5 font-medium">City</th>
                  <th className="py-1.5 font-medium">Latitude</th>
                  <th className="py-1.5 font-medium">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {row.cities.map((city) => (
                  <tr key={city.name} className="border-t hairline">
                    <td className="py-1.5 text-charcoal dark:text-cream-100">{city.name}</td>
                    <td className="py-1.5 tabular-nums text-charcoal-light dark:text-navy-300">
                      {city.lat}
                    </td>
                    <td className="py-1.5 tabular-nums text-charcoal-light dark:text-navy-300">
                      {city.lng}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Zone" value={row.zone} />
            <ReadOnlyField label="Status">
              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>
            </ReadOnlyField>
            <ReadOnlyField label="Position" value={String(row.displayOrder + 1)} />
            <ReadOnlyField label="Last updated" value={new Date(row.updatedAt).toLocaleString()} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
