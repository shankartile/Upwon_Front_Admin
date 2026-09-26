import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';

/**
 * The Career tab - the public /careers page's Open Roles, and the people who
 * applied through them.
 *
 * A tab strip like ContactPageLayout, but over two resources rather than over
 * the sections of a page: the rest of /careers (the hero, "How we work", the
 * "No matching role?" block) is static artwork in the website's own code and
 * is deliberately not admin-driven, so it has no tab here.
 *
 * Vacancy Applications leads, and is what /cms/careers opens on, for the
 * reason the Contact area's inbox does: it is the tab with something new in it
 * most days, while the adverts behind it change rarely. The same trade-off
 * applies - opening this area shows real people's names and phone numbers
 * straight away - which is why the server gates it behind its own
 * career_applications.read permission rather than the one that lets somebody
 * post a job advert.
 *
 * The vacancy form is not a tab. It lives at /cms/careers/vacancies/:id,
 * outside this layout, exactly as the Insider news item form does: the tabs
 * move between lists, and a half-written advert should not be one click from
 * being abandoned.
 */

const SECTIONS = [
  { id: 'applications', label: 'Vacancy Applications' },
  { id: 'vacancies', label: 'Vacancy Management' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function CareerPageLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The trailing path segment is the active tab, so a deep link and a tab
  // click agree without a second piece of state to keep in sync. Matched as a
  // whole segment rather than a suffix, so a trailing slash still resolves to
  // the tab whose body is on screen.
  const segment = pathname.split('/').filter(Boolean).pop();
  const active = (SECTIONS.find((s) => s.id === segment)?.id ?? SECTIONS[0].id) as SectionId;

  return (
    <>
      <PageHeader
        title="Career"
        description="The roles advertised on the public Careers page (/careers), and the applications they collect."
      />
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        active={active}
        onChange={(id) => navigate(`/cms/careers/${id}`)}
      />
      <div className="mt-5">
        <Outlet />
      </div>
    </>
  );
}
