import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Dairy & Ice Cream industry page.
 *
 * Same arrangement as the product page screens: the marketing page is authored
 * section by section and the backend is laid out the same way, so this is a
 * tab strip over those sections rather than one long form.
 *
 * SECTIONS lists only what is editable today. The live page renders more than
 * this; the rest arrive as their tables and screens are built, and each is one
 * entry here plus its route.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'trust-section', label: 'Trust Section' },
  { id: 'capabilities-section', label: 'Core Capabilities' },
  { id: 'platform-section', label: 'Connected Platform' },
  { id: 'benefits-section', label: 'Benefits' },
  { id: 'coverage-section', label: 'Industry Coverage' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export const DAIRY_PAGE_BASE = '/cms/industries/dairy';

export default function DairyPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Dairy & Ice Cream Page"
        description="Content for the public UpWon Dairy & Ice Cream industry page, section by section."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`${DAIRY_PAGE_BASE}/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
