import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The About Us area - the public /about page, section by section, plus the calls
 * its form books.
 *
 * A tab strip like ContactPageLayout and PartnerProgramLayout, and for the same
 * reason: the backend has one controller/service/repository set per resource under
 * modules/about-page, so this screen is a strip over those.
 *
 * Six tabs: the inbox first, then the five sections in the order the bands are
 * read down the page.
 *
 *   Discovery Call Applications NOT page content - the records the form at the
 *                               foot of the page produces.
 *   Hero Section                the band at the top and its rotating backdrops.
 *   Founder Note Section        the founder's card and the note beside it.
 *   People Section (Team)       the People heading, and the people under it.
 *   Number Section              the Number heading, and the stat cards under it.
 *   CTA Section                 the closing banner above the footer, with its own
 *                               wide and narrow artwork.
 *
 * Nothing else on /about has a tab, because nothing else on it is admin-driven:
 * the Nashik pride band, the timeline, the four operating principles under the
 * team, the client-logo strip under the numbers, the Byte Elephants facts and the
 * global-ambition block are artwork in the website's own code.
 *
 * This area opens on its inbox, the same way the Contact, Career and Partner
 * Program areas do: Discovery Call Applications is the tab with something new in
 * it most days, while the five authoring tabs behind it change rarely. The user
 * asked for that order after first asking for the sections to lead, so it is a
 * decision rather than a default - moving it back means moving the redirect in
 * App.tsx with it.
 *
 * The cost of leading with the inbox is that opening the area puts strangers'
 * names and phone numbers on screen for an admin who only came to fix a heading.
 * It is still gated separately on the server - behind discovery_calls.read rather
 * than about_page.read - so an admin without that permission sees the tab's own
 * refusal rather than the records.
 *
 * Every tab is a self-contained screen: the five sections are one form and Save
 * each (the People and Number tabs manage their lists in a Modal on the same
 * screen), and a booking opens a detail card rather than a page. So nothing lives
 * outside this layout, and there is no route matching
 * /cms/about/discovery-calls/:id.
 */

const SECTIONS = [
  // The inbox leads, as the user asked: it is the tab with something new in it
  // most days, while the five authoring tabs behind it change rarely.
  { id: 'discovery-calls', label: 'Discovery Call Applications' },
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'founder-note', label: 'Founder Note Section' },
  { id: 'team-section', label: 'People Section (Team)' },
  { id: 'numbers-section', label: 'Number Section' },
  { id: 'cta-section', label: 'CTA Section' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function AboutPageLayout() {
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
        title="About Us"
        description="The public /about page, section by section, and the discovery calls its form books."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/about/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
