import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The SFA-DMS product page.
 *
 * Same arrangement as the ERP Page screen: the marketing page is authored
 * section by section and the backend is laid out the same way, so this is a tab
 * strip over those sections rather than one long form.
 *
 * SECTIONS lists only what is editable today. The page renders more than this
 * on the live site; the rest arrive as their tables and screens are built, and
 * each is one entry here plus its route.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'proof-section', label: 'Proof Section' },
  { id: 'video-section', label: 'Video Section' },
  { id: 'packages-section', label: 'Packages' },
  { id: 'alternatives-section', label: 'Alternatives' },
  { id: 'outcomes-section', label: 'Customer Outcomes' },
  { id: 'establishers-section', label: 'Trust Establishers' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const BASE = '/cms/products/sfa-dms';

export default function SfaDmsPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync.
  const active = (SECTIONS.find((s) => pathname.includes(s.id))?.id ??
    SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="SFA-DMS Page"
        description="Content for the public UpWon SFA-DMS product page, section by section."
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
