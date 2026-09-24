import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The ERP product page.
 *
 * Same arrangement as the Home Page screen: the marketing page is authored
 * section by section and the backend is laid out the same way, so this is a
 * tab strip over those sections rather than one long form.
 *
 * SECTIONS lists only what is editable today. The page renders more than this
 * on the live site; the rest arrive as their tables and screens are built, and
 * each is one entry here plus its route.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'trust-section', label: 'Trust Section' },
  { id: 'recognition-section', label: 'Industry Recognition' },
  { id: 'benefits-section', label: 'Benefits for Everyone' },
  { id: 'alternatives-section', label: 'Vs Alternatives' },
  { id: 'outcomes-section', label: 'Customer Outcomes' },
  { id: 'establishers-section', label: 'Trust Establishers' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const BASE = '/cms/products/erp';

export default function ErpPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="ERP Page"
        description="Content for the public UpWon ERP product page, section by section."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`${BASE}/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
