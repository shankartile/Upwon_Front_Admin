import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { LinkedValue } from '../../../components/common/RecordDetail';
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
import * as contactLinesService from '../../../services/socialContactLinesService';
import { mailtoHref, telHref } from '../../../lib/contactLinks';
import { CONTACT_KIND_META, contactHrefFor, kindLabel } from './socialMediaLinksForm';
import { SOCIAL_ICON_EXTRAS } from './socialIcons';
import type { SocialContactLine } from '../../../types/socialMediaLinks';

/**
 * Social Media Links -> Contact Details: one footer contact line, read-only -
 * the eye action on the list (ContactLinesPage) opens it.
 *
 * Shows the line as the footer prints it - its icon beside the value - and
 * what the site links it to, which depends on its kind. A line is edited in
 * the dialog on its list rather than on a page of its own, so Edit goes back
 * to the list and opens that dialog on this line (see hooks/useEditRequest).
 */

const LIST_PATH = '/cms/social-media-links/contact-lines';

export default function ContactLineViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { record: line, error } = useRecord(id, contactLinesService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Contact line"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to contact details"
      />
    );
  }
  if (!line) return <ViewSkeleton />;

  const meta = CONTACT_KIND_META[line.kind];

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={line.status} />}
        title="View contact line"
        description="Read-only. Use Edit to change this footer line."
        backTo={LIST_PATH}
        onEdit={() => navigate(LIST_PATH, { state: editRequestState(line.id) })}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Line" subtitle="One line of the contact list in the site's footer." />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Kind" value={kindLabel(line.kind)} />
            <ReadOnlyField label="Icon">
              <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                <span className="text-orange-500">
                  <IconGlyph name={line.icon} className="h-5 w-5" extras={SOCIAL_ICON_EXTRAS} />
                </span>
                {line.icon}
              </span>
            </ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label={meta?.valueLabel ?? 'Value'} value={line.value} />
            </div>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Links to" hint={meta?.linkNote}>
                <LinkTarget line={line} />
              </ReadOnlyField>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the footer prints this line." />
            <CardBody>
              <div className="flex items-start gap-3 rounded-xl bg-navy-900 p-4 text-sm text-cream-100">
                <span className="mt-0.5 shrink-0 text-orange-400">
                  <IconGlyph name={line.icon} className="h-4 w-4" extras={SOCIAL_ICON_EXTRAS} />
                </span>
                <span className="min-w-0 break-words">{line.value}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={line.status} />
              </ReadOnlyField>
              <ReadOnlyField label="Position in the footer" value={String(line.displayOrder + 1)} />
              <RecordDates createdAt={line.createdAt} updatedAt={line.updatedAt} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * What the site makes of the value, as a link where one can be built safely.
 *
 * The href is shown the way the site builds it (contactHrefFor), but only
 * made clickable after it has been re-checked - mailto: and tel: through
 * lib/contactLinks, a website as an http(s) URL - so a stored value that no
 * longer passes reads as text rather than as a link that goes somewhere odd.
 */
function LinkTarget({ line }: { line: SocialContactLine }) {
  const href = contactHrefFor(line.kind, line.value);
  if (!href) {
    return <p className="text-sm text-charcoal-light dark:text-navy-300">Not a link - printed as text.</p>;
  }

  if (line.kind === 'WEBSITE') {
    const safe = webHref(href);
    return (
      <p className="break-all text-sm">
        {safe ? (
          <a
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-700 underline underline-offset-2 hover:text-orange-600 dark:text-cream-100 dark:hover:text-orange-400"
          >
            {href}
          </a>
        ) : (
          <span className="text-charcoal dark:text-cream-100">{href}</span>
        )}
      </p>
    );
  }

  const checked = line.kind === 'EMAIL' ? mailtoHref(line.value) : telHref(line.value);
  return (
    <p className="break-all text-sm text-charcoal dark:text-cream-100">
      <LinkedValue href={checked}>{href}</LinkedValue>
    </p>
  );
}
