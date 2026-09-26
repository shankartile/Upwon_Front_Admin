import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Partner Program tab - the public /partners page's hero, and the people who
 * applied through the form on it.
 *
 * A tab strip like CareerPageLayout, and for the same reason: the backend has one
 * controller/service/repository set per resource under modules/partner-program,
 * so this screen is a strip over those. Exactly two tabs, because exactly two
 * things on that page are not static: the rest of /partners - the three
 * partnership models, the economics block, the FAQ - is artwork in the website's
 * own code and is deliberately not admin-driven, so it has no tab here.
 *
 * Partner Program Applications leads, and is what /cms/partner-program opens on,
 * for the reason the Contact and Career inboxes do: it is the tab with something
 * new in it most days, while the hero behind it changes rarely. The same
 * trade-off applies - opening this area shows real people's names, phone numbers
 * and addresses straight away - which is why the server gates it behind its own
 * partner_applications.read permission rather than the one that lets somebody
 * reword a heading.
 *
 * Both tabs are singleton screens: the hero is one form and Save, and an
 * application opens a detail card rather than a page. So there is nothing to
 * edit outside this layout, and no route matching
 * /cms/partner-program/applications/:id.
 */

const SECTIONS = [
  { id: 'applications', label: 'Partner Program Applications' },
  { id: 'hero-section', label: 'Hero Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function PartnerProgramLayout() {
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
        title="Partner Program"
        description="The hero of the public Channel Partner Program page (/partners), and the applications it collects."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/partner-program/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
