import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The HREasy product page.
 *
 * Same arrangement as the POS, FMS, SFA-DMS and ERP page screens: the
 * marketing page is authored section by section and the backend is laid out
 * the same way, so this is a tab strip over those sections rather than one
 * long form.
 *
 * The page is served at /products/hrms on the site; every name here follows
 * the product id instead, which is what the module, the tables and the page
 * key already use.
 *
 * SECTIONS lists only what is editable today. The page renders more than this
 * on the live site - the pricing tiers, the comparison and the outcomes; each
 * arrives as its tables and screens are built, and each is one entry here
 * plus its routes.
 */

/*
 * Module Showcase and Core Capabilities list the same seven lifecycle stages
 * and are two different sections of the page: the first is the sticky nav
 * whose panel is one composite image, the second is the card grid below it,
 * where every card has its own photograph and its own line.
 */
const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'proof-section', label: 'Proof Bento' },
  { id: 'capabilities-section', label: 'Module Showcase' },
  { id: 'lifecycle-section', label: 'Core Capabilities' },
  { id: 'packages-section', label: 'Packages' },
  { id: 'alternatives-section', label: 'Comparison' },
  { id: 'outcomes-section', label: 'Outcomes' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const BASE = '/cms/products/hreasy';

export default function HreasyPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="HREasy Page"
        description="Content for the public UpWon HREasy product page, section by section."
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
