import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as service from '../../../services/clientsNetworkSectionService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  NETWORK_ZONES,
  type ClientsNetworkState,
  type CreateClientsNetworkStateInput,
  type NetworkZone,
} from '../../../types/clientsPage';

/**
 * Create / edit one state of the operational network map. `:id` of 'new'
 * means create.
 *
 * Each city is a name and a real latitude / longitude - the site projects
 * those onto its India outline, so there are no pixel positions to author.
 */

const LIST_PATH = '/cms/clients/network-section';

/** Mirrors the server-side network validator. */
const STATE_MAX = 80;
const CITY_NAME_MAX = 80;
const MAX_CITIES = 12;
const LAT_RANGE = [6, 37.5] as const;
const LNG_RANGE = [68, 97.5] as const;

/** Coordinates are edited as text, so a half-typed '19.' is not lost. */
interface CityRow {
  name: string;
  lat: string;
  lng: string;
}

interface Form {
  state: string;
  zone: NetworkZone;
  cities: CityRow[];
  displayOrder: string;
  status: ContentStatus;
}

const BLANK_CITY: CityRow = { name: '', lat: '', lng: '' };

const toForm = (row: ClientsNetworkState): Form => ({
  state: row.state,
  zone: row.zone,
  cities: row.cities.map((c) => ({ name: c.name, lat: String(c.lat), lng: String(c.lng) })),
  displayOrder: String(row.displayOrder),
  status: row.status,
});

function coordinateError(raw: string, [min, max]: readonly [number, number], label: string) {
  const value = raw.trim();
  if (!value) return `${label} is required.`;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${label} must be a number.`;
  if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`;
  return undefined;
}

function cityErrors(city: CityRow, duplicate: boolean) {
  const name = city.name.trim();
  return {
    name: !name
      ? 'City name is required.'
      : name.length > CITY_NAME_MAX
        ? `At most ${CITY_NAME_MAX} characters.`
        : duplicate
          ? 'This city is listed twice.'
          : undefined,
    lat: coordinateError(city.lat, LAT_RANGE, 'Latitude'),
    lng: coordinateError(city.lng, LNG_RANGE, 'Longitude'),
  };
}

/** Blank means "append to the end", which the server does when the field is absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function ClientsNetworkStateEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [row, setRow] = useState<ClientsNetworkState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isNew) {
      setForm({
        state: '',
        zone: 'West',
        cities: [{ ...BLANK_CITY }],
        displayOrder: '',
        status: 'ACTIVE',
      });
      return;
    }
    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setRow(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return { state: undefined, cities: [] as ReturnType<typeof cityErrors>[] };
    const stateName = form.state.trim();
    const seen = new Set<string>();
    return {
      state: !stateName
        ? 'State name is required.'
        : stateName.length < 2
          ? 'State name must be at least 2 characters.'
          : stateName.length > STATE_MAX
            ? `State name must be ${STATE_MAX} characters or fewer.`
            : undefined,
      cities: form.cities.map((city) => {
        const key = city.name.trim().toLowerCase();
        const duplicate = Boolean(key) && seen.has(key);
        seen.add(key);
        return cityErrors(city, duplicate);
      }),
    };
  }, [form]);

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

  if (!form) return <EditSkeleton />;

  const hasErrors =
    Boolean(errors.state) ||
    form.cities.length === 0 ||
    errors.cities.some((e) => e.name || e.lat || e.lng);

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchCity = (index: number, changes: Partial<CityRow>) =>
    patch({ cities: form.cities.map((c, i) => (i === index ? { ...c, ...changes } : c)) });

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the form', 'Some fields need attention before saving.');
      return;
    }

    setSaving(true);
    try {
      const body: CreateClientsNetworkStateInput = {
        state: form.state.trim(),
        zone: form.zone,
        cities: form.cities.map((c) => ({
          name: c.name.trim(),
          lat: Number(c.lat),
          lng: Number(c.lng),
        })),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('State created');
      } else {
        await service.update(id!, body);
        toast.success('State updated', 'The public Clients page map now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save state', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          row && (
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
          )
        }
        title={isNew ? 'New network state' : 'Edit network state'}
        description="One state card of the operational network map on the public Clients page (/clients)."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="State" />
            <CardBody>
              <FieldGrid>
                <Field
                  label="State name"
                  required
                  error={submitted ? errors.state : undefined}
                  hint="The card title, e.g. Maharashtra."
                >
                  <Input
                    value={form.state}
                    maxLength={STATE_MAX}
                    placeholder="Maharashtra"
                    onChange={(e) => patch({ state: e.target.value })}
                  />
                </Field>
                <Field label="Zone" required hint="Counted into the Zones stat.">
                  <Select
                    value={form.zone}
                    onChange={(e) => patch({ zone: e.target.value as NetworkZone })}
                  >
                    {NETWORK_ZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Cities"
              subtitle={`Up to ${MAX_CITIES}. Each becomes a pin on the map. Find the latitude and longitude on Google Maps: right-click the city and the first line is "lat, lng".`}
            />
            <CardBody className="space-y-3">
              {form.cities.map((city, index) => {
                const cityError = submitted ? errors.cities[index] : undefined;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-[2fr,1fr,1fr,auto] items-start gap-3"
                  >
                    <Field label={index === 0 ? 'City' : undefined} error={cityError?.name}>
                      <Input
                        value={city.name}
                        maxLength={CITY_NAME_MAX}
                        placeholder="Mumbai"
                        onChange={(e) => patchCity(index, { name: e.target.value })}
                      />
                    </Field>
                    <Field label={index === 0 ? 'Latitude' : undefined} error={cityError?.lat}>
                      <Input
                        inputMode="decimal"
                        value={city.lat}
                        placeholder="19.07"
                        onChange={(e) => patchCity(index, { lat: e.target.value })}
                      />
                    </Field>
                    <Field label={index === 0 ? 'Longitude' : undefined} error={cityError?.lng}>
                      <Input
                        inputMode="decimal"
                        value={city.lng}
                        placeholder="72.87"
                        onChange={(e) => patchCity(index, { lng: e.target.value })}
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      className={index === 0 ? 'mt-6' : undefined}
                      aria-label="Remove this city"
                      disabled={form.cities.length === 1}
                      onClick={() =>
                        patch({ cities: form.cities.filter((_, i) => i !== index) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                disabled={form.cities.length >= MAX_CITIES}
                onClick={() => patch({ cities: [...form.cities, { ...BLANK_CITY }] })}
              >
                Add city
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Display order"
                hint="Lower numbers come first. The first city of the first state is the hub the map's lines fan out from."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  placeholder="Auto"
                  onChange={(e) => patch({ displayOrder: e.target.value })}
                />
              </Field>
              <Field
                label="Status"
                hint="Inactive keeps the state here but removes it and its pins from the live map."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Button
            variant="orange"
            className="w-full"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={() => void save()}
          >
            {isNew ? 'Create state' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
