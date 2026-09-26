import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Insider tab - the monthly Operations Insider, which the public site
 * serves at /newsletter (the URL keeps its old name for SEO; the admin area
 * was renamed from "Newsletter").
 *
 * Laid out like HomePageLayout, for the same reason: the backend has one
 * controller/service/repository set per section under modules/insider-page,
 * so this screen is a tab strip over those sections. Adding a section is one
 * entry in SECTIONS plus its route.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'news', label: 'News' },
  { id: 'feature-section', label: 'Feature Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function InsiderPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync. Matched as a
  // whole segment rather than a suffix: React Router renders the section for
  // '/cms/insider/news/' too, and a suffix test would miss the trailing slash
  // and underline the first tab while the second one's body is on screen.
  const segment = pathname.split('/').filter(Boolean).pop();
  const active = (SECTIONS.find((s) => s.id === segment)?.id ?? SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Insider"
        description="Content for the public Operations Insider page (/newsletter), section by section."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/insider/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
