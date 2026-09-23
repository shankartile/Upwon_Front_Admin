import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Home Page tab.
 *
 * The marketing home page is authored section by section, and the backend is
 * laid out the same way - one controller/service/repository set per section
 * under modules/home-page. So this screen is a tab strip over those sections
 * rather than one long form: adding the next section is one entry in SECTIONS
 * plus its route, and nothing here changes.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'trust-section', label: 'Trust Section' },
  { id: 'industries-section', label: 'Industries Section' },
  { id: 'values-section', label: 'Values Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function HomePageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.endsWith(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Home Page"
        description="Content for the public marketing home page, section by section."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/home-page/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
