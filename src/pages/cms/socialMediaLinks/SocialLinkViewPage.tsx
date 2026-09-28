import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { IconGlyph } from '../../../components/forms/IconPicker';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
  webHref,
} from '../../../components/common/RecordView';
import { editRequestState } from '../../../hooks/useEditRequest';
import * as socialLinksService from '../../../services/socialLinksService';
import { platformFor } from './socialMediaLinksForm';
import { SOCIAL_ICON_EXTRAS } from './socialIcons';

/**
 * Social Media Links -> Social Links: one icon button of the footer's social
 * row, read-only - the eye action on the list (SocialLinksPage) opens it.
 *
 * Shows the button as the footer draws it and the profile it opens. A link is
 * edited in the dialog on its list rather than on a page of its own, so Edit
 * goes back to the list and opens that dialog on this link (see
 * hooks/useEditRequest).
 */

const LIST_PATH = '/cms/social-media-links/social-links';

export default function SocialLinkViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { record: link, error } = useRecord(id, socialLinksService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Social link"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to social links"
      />
    );
  }
  if (!link) return <ViewSkeleton />;

  const platform = platformFor(link);
  // The server only stores absolute http(s) URLs here; re-checked all the same,
  // because the value lands in an href.
  const href = webHref(link.url);

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={link.status} />}
        title="View social link"
        description="Read-only. Use Edit to change this footer link."
        backTo={LIST_PATH}
        onEdit={() => navigate(LIST_PATH, { state: editRequestState(link.id) })}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Link" subtitle="One icon button in the site footer's social row." />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Platform" value={platform} />
            <ReadOnlyField label="Icon">
              <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                <IconGlyph name={link.icon} className="h-5 w-5" extras={SOCIAL_ICON_EXTRAS} />
                {link.icon}
              </span>
            </ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Profile URL" hint="Opens in a new tab on the site.">
                <p className="break-all text-sm">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-700 underline underline-offset-2 hover:text-orange-600 dark:text-cream-100 dark:hover:text-orange-400"
                    >
                      {link.url}
                    </a>
                  ) : (
                    <span className="text-charcoal dark:text-cream-100">{link.url}</span>
                  )}
                </p>
              </ReadOnlyField>
            </div>
            <ReadOnlyField
              label="Button label"
              value={link.label}
              hint="The button's tooltip and screen-reader name, set from the icon."
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the footer draws this button." />
            <CardBody>
              <div className="rounded-xl bg-navy-900 p-4">
                <span
                  className="grid h-9 w-9 place-items-center rounded-lg border border-navy-700 text-cream-100"
                  title={platform}
                >
                  <IconGlyph name={link.icon} className="h-4 w-4" extras={SOCIAL_ICON_EXTRAS} />
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={link.status} />
              </ReadOnlyField>
              <ReadOnlyField label="Position in the row" value={String(link.displayOrder + 1)} />
              <RecordDates createdAt={link.createdAt} updatedAt={link.updatedAt} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
