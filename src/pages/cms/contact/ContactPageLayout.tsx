import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Contact tab - the public /contact page, section by section.
 *
 * Laid out like InsiderPageLayout, for the same reason: the backend has one
 * controller/service/repository set per section under modules/contact-page, so
 * this screen is a tab strip over those sections. Adding a section is one entry
 * in SECTIONS plus its route.
 *
 * Three content sections, not four: the closing CTA above the footer is static
 * artwork in the website's own code and is deliberately not admin-driven.
 *
 * The first tab is not a section. Contact Management is the inbox of what
 * visitors sent back through the form the other tabs author - the same page
 * read from the other end - and the user asked for it to lead, because it is
 * the tab with something new in it most days while the sections behind it
 * change rarely. It is also what /cms/contact opens on. Note the trade-off
 * that buys: opening the Contact area now shows a list of real people's names,
 * addresses and phone numbers straight away, which is why the server gates it
 * behind its own contact_enquiries.read permission rather than the one that
 * lets somebody reword a heading.
 */

const SECTIONS = [
  { id: 'enquiries', label: 'Contact Management' },
  { id: 'hero-section', label: 'Hero Section' },
  { id: 'form-section', label: 'Enquiry Form' },
  { id: 'contact-details', label: 'Contact Details' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function ContactPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active section, so a deep link and a tab
  // click agree without a second piece of state to keep in sync. Matched as a
  // whole segment rather than a suffix, so a trailing slash still resolves to
  // the section whose body is on screen.
  const segment = pathname.split('/').filter(Boolean).pop();
  const active = (SECTIONS.find((s) => s.id === segment)?.id ?? SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Contact"
        description="Content for the public Contact page (/contact), section by section, and the enquiries it collects."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/contact/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
