import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import {
  ContentStatusPill,
  ImagePreview,
  ReadOnlyField,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import { assetUrl } from '../../../lib/assetUrl';
import { HOME_HERO_SECTION, type HeroSectionConfig } from './heroSectionConfig';

/**
 * One hero slide, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the slide
 * as content - the heading rendered the way the site renders it, the images at
 * the shape they will actually be used - so it is useful to look at even for
 * someone who does have permission to edit.
 *
 * Serves every hero carousel through `config` (see heroSectionConfig.ts), the
 * way the slide list and the slide form do: the home page one by default, the
 * Insider, Blog, Free Audit, Knowledgebase and UpWon vs SAP ones from their
 * own …/hero-section/:id/view routes. The config decides where Back and Edit
 * go, which API the slide is read from, whether there is an eyebrow to show,
 * and which heading grammar the preview uses.
 */

/** The same box shapes as the picker on the edit page, so the two screens agree. */
const PREVIEW_BOX = {
  desktop: 'h-28 w-48',
  mobile: 'h-40 w-[6.6rem]',
} as const;

export default function HeroSlideViewPage({
  config = HOME_HERO_SECTION,
}: {
  config?: HeroSectionConfig;
}) {
  const { id } = useParams<{ id: string }>();
  const { api, basePath, imageSpecs } = config;
  const { record: slide, error } = useRecord(id, api.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Hero slide"
        description="Could not load this slide."
        message={error}
        backTo={basePath}
        backLabel="Back to hero section"
      />
    );
  }

  if (!slide) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={slide.status} />}
        title="View hero slide"
        description="Read-only. Use Edit to change this slide."
        backTo={basePath}
        editTo={`${basePath}/${slide.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Copy" subtitle="The text of this slide." />
          <CardBody className="space-y-5">
            {/* A carousel without an eyebrow (the Insider hero) has no such field to show. */}
            {config.eyebrow && <ReadOnlyField label="Eyebrow" value={slide.eyebrow} />}
            <ReadOnlyField label="Heading" value={slide.heading} />
            <ReadOnlyField label="Subtext" value={slide.subtext} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the headline renders on the site." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadingPreview heading={slide.heading} markup={config.headingMarkup} />
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={slide.status} />
              </ReadOnlyField>
              {typeof slide.displayOrder === 'number' && (
                <ReadOnlyField
                  label="Position in carousel"
                  value={String(slide.displayOrder + 1)}
                />
              )}
              <ReadOnlyField
                label="Last updated"
                value={new Date(slide.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Backgrounds"
            subtitle="With none set, the slide uses the site’s built-in hero background."
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ImagePreview
                label={imageSpecs.desktop.label}
                src={assetUrl(slide.image) ?? null}
                boxClassName={PREVIEW_BOX.desktop}
              />
              <ImagePreview
                label={imageSpecs.mobile.label}
                src={assetUrl(slide.mobileImage) ?? null}
                boxClassName={PREVIEW_BOX.mobile}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
