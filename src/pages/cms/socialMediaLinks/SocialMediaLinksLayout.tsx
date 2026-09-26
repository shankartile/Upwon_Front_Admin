import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Social Media Links area - the two runs of links in the public site's
 * footer, under its brand block.
 *
 * A tab strip like PartnerProgramLayout and AboutPageLayout, and for the same
 * reason: the backend has one controller/service/repository set per resource
 * under modules/social-media-links, so this screen is a strip over those.
 *
 * Exactly two tabs, because exactly two things in the footer are admin-driven:
 *
 *   Contact Details  the address / email / phone / website lines, each with its
 *                    icon, each linked by its kind.
 *   Social Links     the square icon buttons under them (LinkedIn, Twitter ...).
 *
 * The rest of the footer - the brand block, the parent-company line, the link
 * columns and the copyright - stays in the website's own code.
 *
 * Contact Details leads, and is what /cms/social-media-links opens on: it is the
 * list that is seeded with what the footer already shows, while Social Links
 * starts empty. There is no inbox here, so nothing argues for another order.
 *
 * Both tabs manage their list in a Modal on the same screen, so nothing lives
 * outside this layout and there is no route matching
 * /cms/social-media-links/contact-lines/:id.
 */

const SECTIONS = [
  { id: 'contact-lines', label: 'Contact Details' },
  { id: 'social-links', label: 'Social Links' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SocialMediaLinksLayout() {
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
        title="Social Media Links"
        description="The contact details and social icons in the public site's footer, on every page."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/social-media-links/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
