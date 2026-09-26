import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as service from '../../../services/clientsRosterSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { CLIENTS_ROSTER_LOGO_SPEC } from '../../../lib/clientsImageSpec';
import {
  CLEARED_IMAGE_SLOT,
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  urlImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ClientsRosterLogo, CreateClientsRosterLogoInput } from '../../../types/clientsPage';

/**
 * Create / edit one roster logo, as a full page. `:id` of 'new' means create.
 *
 * The image is an upload or a URL - the seeded logos are the website's own
 * /images/testimonial/*.webp files, kept as URLs until someone uploads a
 * replacement.
 */

const LIST_PATH = '/cms/clients/roster-section';

/** Tags uploads so the public site may serve them (PUBLIC_FILE_ENTITY_TYPES). */
const IMAGE_ENTITY_TYPE = 'clients_roster_logo';

const NAME_MIN = 2;
const NAME_MAX = 120;

interface Form {
  name: string;
  image: ImageSlot;
  displayOrder: string;
  status: ContentStatus;
}

const toForm = (logo: ClientsRosterLogo): Form => ({
  name: logo.name,
  image: storedImageSlot({ fileId: logo.imageFileId, url: logo.imageUrl, image: logo.image }),
  displayOrder: String(logo.displayOrder),
  status: logo.status,
});

function nameError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Brand name is required.';
  if (value.length < NAME_MIN) return `Brand name must be at least ${NAME_MIN} characters.`;
  if (value.length > NAME_MAX) return `Brand name must be ${NAME_MAX} characters or fewer.`;
  return null;
}

/** Blank means "append to the end", which the server does when the field is absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function ClientsRosterLogoEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [logo, setLogo] = useState<ClientsRosterLogo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);

  // Object URLs for picked files, released on unmount so previews do not leak.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    let cancelled = false;
    if (isNew) {
      setForm({ name: '', image: { ...EMPTY_IMAGE_SLOT }, displayOrder: '', status: 'ACTIVE' });
      return;
    }
    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setLogo(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Roster logo" description="Could not load this logo." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the roster
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const nameProblem = nameError(form.name);
  const urlProblem = imageSlotUrlError(form.image);
  const hasImage = Boolean(form.image.file || form.image.fileId || form.image.url.trim());
  const imageProblem =
    form.image.error ?? urlProblem ?? (hasImage ? null : 'A logo needs an image.');
  const hasErrors = Boolean(nameProblem || imageProblem);

  const pickImage = async (file: File) => {
    // Checked before it is accepted; the server re-checks the stored bytes.
    const problem = await fileService.checkImageFile(file, CLIENTS_ROSTER_LOGO_SPEC);
    if (problem) {
      patch({ image: { ...form.image, error: problem } });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ image: pickedImageSlot(file, preview) });
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the form', 'Some fields need attention before saving.');
      return;
    }

    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.image.fileId;
      if (form.image.file) {
        imageFileId = (await fileService.upload(form.image.file, IMAGE_ENTITY_TYPE)).id;
      }
      const imageUrl = imageFileId ? null : form.image.url.trim() || null;

      const body: CreateClientsRosterLogoInput = {
        name: form.name.trim(),
        imageFileId,
        imageUrl,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Logo created');
      } else {
        await service.update(id!, body);
        toast.success('Logo updated', 'The public Clients page now shows this logo.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save logo', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          logo && (
            <ActivePill active={logo.status === 'ACTIVE'}>{STATUS_LABELS[logo.status]}</ActivePill>
          )
        }
        title={isNew ? 'New roster logo' : 'Edit roster logo'}
        description="One logo of the scrolling marquee on the public Clients page (/clients)."
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
        <Card>
          <CardHeader title="Logo" />
          <CardBody className="space-y-4">
            <Field
              label="Brand name"
              required
              error={submitted || nameTouched ? (nameProblem ?? undefined) : undefined}
              hint="Also used as the logo's alt text and hover title."
            >
              <Input
                value={form.name}
                maxLength={NAME_MAX}
                placeholder="Monginis"
                aria-invalid={Boolean((submitted || nameTouched) && nameProblem)}
                onBlur={() => setNameTouched(true)}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field
              label={CLIENTS_ROSTER_LOGO_SPEC.label}
              required
              error={
                form.image.error ??
                (urlTouched || submitted ? (urlProblem ?? undefined) : undefined) ??
                (submitted && !hasImage ? 'A logo needs an image.' : undefined)
              }
              hint={`${CLIENTS_ROSTER_LOGO_SPEC.hint ?? ''} Upload a file, or paste a site path such as /images/testimonial/winni.webp.`}
            >
              <ImageSlotPicker
                spec={CLIENTS_ROSTER_LOGO_SPEC}
                slot={form.image}
                disabled={saving}
                boxClassName="h-24 w-48 [&_img]:!object-contain [&_img]:bg-white [&_img]:p-2"
                onPick={(file) => void pickImage(file)}
                onClear={() => {
                  releaseObjectUrls();
                  patch({ image: { ...CLEARED_IMAGE_SLOT } });
                }}
                onUrlChange={(url) => {
                  releaseObjectUrls();
                  patch({ image: urlImageSlot(url) });
                }}
                onUrlBlur={() => setUrlTouched(true)}
                urlInvalid={Boolean((urlTouched || submitted) && urlProblem)}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Display order"
                hint="Lower numbers come first in the marquee. Leave blank to add at the end."
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
                hint="Inactive keeps the logo here but removes it from the live marquee."
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
            {isNew ? 'Create logo' : 'Save changes'}
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
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
