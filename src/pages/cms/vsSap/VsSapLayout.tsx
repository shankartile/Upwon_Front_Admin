import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Resource Page -> UpWon vs SAP area - the public /compare/upwon-vs-sap
 * page, band by band.
 *
 * A tab strip like FreeAuditLayout and KnowledgebaseLayout, and for the same
 * reason: the backend has one controller/service/repository set per resource
 * under modules/vs-sap-page, so this screen is a strip over those.
 *
 * Three tabs, in the order the bands are read down the page:
 *
 *   Hero Section           the hero carousel at the top - its slides, each an
 *                          eyebrow, heading, subtext and a desktop + mobile
 *                          image.
 *   Straight Answer        "The straight answer" band under it - its heading,
 *                          the UpWon card and the SAP card, each a title and a
 *                          list of points, and the italic line that closes the
 *                          SAP card.
 *   Capability Comparison  the capability table - its heading, the labels of its
 *                          Total Cost of Ownership row, and the rows themselves,
 *                          each rated for UpWon, SAP B1 and Oracle NetSuite.
 *
 * Nothing else on the page has a tab, because nothing else on it is
 * admin-driven: "THE MATH" band under the table, the hero's two buttons and the
 * page's SEO tags are fixed in the website's own code.
 *
 * Hero Section leads, and is what /cms/resources/upwon-vs-sap opens on: there is
 * no inbox here to argue for another order. A hero slide's form
 * (/cms/resources/upwon-vs-sap/hero-section/new and /:id) sits outside this
 * layout, the way the Free Audit hero's does; a capability row opens a dialog
 * on its own tab, so there is no route for one.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'answer-section', label: 'Straight Answer' },
  { id: 'comparison', label: 'Capability Comparison' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function VsSapLayout() {
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
        title="UpWon vs SAP"
        description="The public /compare/upwon-vs-sap page — its hero, the straight answer and the capability comparison."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/resources/upwon-vs-sap/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
