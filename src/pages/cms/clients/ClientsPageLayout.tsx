import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Clients tab - the public Clients & Case Studies page (/clients).
 *
 * Laid out like InsiderPageLayout: the backend has one controller/service/
 * repository set per section under modules/clients-page, so this screen is a
 * tab strip over those sections. Adding a section is one entry in SECTIONS
 * plus its route.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'cases-section', label: 'Case Studies' },
  { id: 'roster-section', label: 'Roster Logos' },
  { id: 'network-section', label: 'Network Map' },
  { id: 'testimonials-section', label: 'Testimonials' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function ClientsPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section - see InsiderPageLayout.
  const segment = pathname.split('/').filter(Boolean).pop();
  const active = (SECTIONS.find((s) => s.id === segment)?.id ?? SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Clients"
        description="Content for the public Clients & Case Studies page (/clients), section by section."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/clients/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
