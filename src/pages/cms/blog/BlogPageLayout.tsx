import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Resource Page -> Blog area - the public /blog page, band by band, and the
 * posts it lists.
 *
 * A tab strip like AboutPageLayout and SocialMediaLinksLayout, and for the same
 * reason: the backend has one controller/service/repository set per resource
 * under modules/blog, so this screen is a strip over those.
 *
 * Four tabs, in the order the bands are read down the page:
 *
 *   Hero Section    the hero carousel at the top - its slides, each an eyebrow,
 *                   heading, subtext and a desktop + mobile image.
 *   Topics Section  the "Insights by Topic" intro above the filter chips.
 *   Categories      the filter chips themselves, each with its icon, in order.
 *   Posts           the articles - the LATEST card is simply the newest one.
 *
 * Hero Section leads, and is what /cms/resources/blog opens on: there is no
 * inbox here to argue for another order. A post is written on a page of its own
 * (/cms/resources/blog/posts/new and /:id) rather than in a dialog, because a
 * body of up to eighty blocks does not fit in one - so the post editor sits
 * outside this layout, with its own header and a way back to the Posts tab. A
 * hero slide's form (/cms/resources/blog/hero-section/new and /:id) does too.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'topics-section', label: 'Topics Section' },
  { id: 'categories', label: 'Categories' },
  { id: 'posts', label: 'Posts' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function BlogPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active tab, so a deep link and a tab click
  // agree without a second piece of state to keep in sync. Matched as a whole
  // segment rather than a suffix, so a trailing slash still resolves to the tab
  // whose body is on screen.
  const segment = pathname.split('/').filter(Boolean).pop();
  const active = (SECTIONS.find((s) => s.id === segment)?.id ?? SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Blog"
        description="The public /blog page — its hero, the topic intro, the category chips and every post."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/resources/blog/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
