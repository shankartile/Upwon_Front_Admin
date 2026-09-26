import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Why UpWon page.
 *
 * Same arrangement as the industry pages' screens: the marketing page is
 * authored section by section and the backend is laid out the same way, so
 * this is a tab strip over those sections rather than one long form.
 *
 * SECTIONS lists only what is editable today. The page renders more than this
 * on the live site; each section arrives as its tables and screens are built,
 * and each is one entry here plus its routes.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'industries-section', label: 'Industry Trust' },
  { id: 'testimonials-section', label: 'Testimonials' },
  { id: 'proof-section', label: 'Product Proof' },
  { id: 'results-section', label: 'Proof & Results' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const BASE = '/cms/why-upwon';

export default function WhyUpwonPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Why UpWon Page"
        description="Content for the public Why UpWon page (/why-upwon), section by section."
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
