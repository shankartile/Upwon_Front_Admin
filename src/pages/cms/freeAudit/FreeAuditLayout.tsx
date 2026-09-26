import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Resource Page -> Free Operational Audit area - the public /free-audit page's
 * hero, and the audit requests its form collects.
 *
 * A tab strip like BlogPageLayout and AboutPageLayout, and for the same reason:
 * the backend has one controller/service/repository set per resource under
 * modules/free-audit, so this screen is a strip over those.
 *
 * Two tabs:
 *
 *   Hero Section             the hero carousel at the top - its slides, each an
 *                            eyebrow, heading, subtext and a desktop + mobile
 *                            image.
 *   Free Audit Applications  NOT page content - the records the "Tell us about
 *                            your business." form under the hero produces.
 *
 * Nothing else on /free-audit has a tab, because nothing else on it is
 * admin-driven: the four steps, the six audit outputs and the hero's two buttons
 * are fixed in the website's own code.
 *
 * Hero Section leads, and is what /cms/resources/free-audit opens on, because
 * that is the order the user asked for them in. The inbox is still gated
 * separately on the server - behind free_audit_applications.read rather than
 * free_audit.read - so an admin without that permission sees the tab's own
 * refusal rather than the records.
 *
 * A hero slide's form (/cms/resources/free-audit/hero-section/new and /:id) sits
 * outside this layout, the way the Blog hero's does; a request opens a detail
 * card rather than a page, so there is no route matching
 * /cms/resources/free-audit/applications/:id.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'applications', label: 'Free Audit Applications' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function FreeAuditLayout() {
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
        title="Free Operational Audit"
        description="The public /free-audit page — its hero, and the audit requests its form collects."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/resources/free-audit/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
