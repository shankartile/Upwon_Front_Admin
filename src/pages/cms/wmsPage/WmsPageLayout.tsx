import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The WMS product page.
 *
 * Same arrangement as the POS, FMS, SFA-DMS and ERP page screens: the
 * marketing page is authored section by section and the backend is laid out
 * the same way, so this is a tab strip over those sections rather than one
 * long form.
 *
 * SECTIONS lists only what is editable today. The page renders far more than
 * this on the live site - the warehouse-type map, the category depth and the
 * client wall; each arrives as its tables and screens are built, and each is
 * one entry here plus its routes.
 */
const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'proof-section', label: 'Proof Strip' },
  { id: 'recognition-section', label: 'Warehouse Types' },
  { id: 'capabilities-section', label: 'Core Capabilities' },
  { id: 'outcomes-section', label: 'Customer Outcomes' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const BASE = '/cms/products/wms';

export default function WmsPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="WMS Page"
        description="Content for the public UpWon WMS product page, section by section."
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
