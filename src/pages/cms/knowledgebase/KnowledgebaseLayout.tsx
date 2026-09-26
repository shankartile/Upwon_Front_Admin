import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Resource Page -> Knowledgebase area - the public /knowledgebase pages:
 * the hub, a page per category, and an article page per guide.
 *
 * A tab strip like BlogPageLayout and FreeAuditLayout, and for the same reason:
 * the backend has one controller/service/repository set per resource under
 * modules/knowledgebase, so this screen is a strip over those.
 *
 * Three tabs, in the order a visitor meets them:
 *
 *   Hero Section  the hero carousel at the top of /knowledgebase - its slides,
 *                 each an eyebrow, heading, subtext and a desktop + mobile
 *                 image.
 *   Categories    the category cards under it, each with its icon, name,
 *                 description and guide count, in order. Each card is also the
 *                 hero of its own /knowledgebase/<category> page.
 *   Articles      the guides - a card on their category's page, and an article
 *                 of their own: its hero (category, title, Updated date, read
 *                 time), its opening paragraph, body and FAQs.
 *
 * Nothing else on those pages has a tab, because nothing else on them is
 * admin-driven: the hero's two buttons, the "See this working…" box under each
 * article and the sidebar's "Browse the knowledgebase" links are fixed in the
 * website's own code, and an article's Related guides are picked by the server.
 *
 * Hero Section leads, and is what /cms/resources/knowledgebase opens on: there
 * is no inbox here to argue for another order. An article is written on a page
 * of its own (/cms/resources/knowledgebase/articles/new and /:id) rather than in
 * a dialog, because a body of up to eighty blocks does not fit in one - so the
 * article editor sits outside this layout, with its own header and a way back to
 * the Articles tab. A hero slide's form
 * (/cms/resources/knowledgebase/hero-section/new and /:id) does too.
 */

const SECTIONS = [
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'categories', label: 'Categories' },
  { id: 'articles', label: 'Articles' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function KnowledgebaseLayout() {
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
        title="Knowledgebase"
        description="The public /knowledgebase pages — the hub's hero and category cards, and every guide with its FAQs."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/resources/knowledgebase/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
