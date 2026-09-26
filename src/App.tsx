import { Navigate, Route, Routes } from 'react-router-dom';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { RedirectWithParams } from './components/common/RedirectWithParams';
import { AdminShell } from './components/layout/AdminShell';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

import HomePageLayout from './pages/cms/homePage/HomePageLayout';
import HeroSectionPage from './pages/cms/homePage/HeroSectionPage';
import HeroSlideEditPage from './pages/cms/homePage/HeroSlideEditPage';

import PagesListPage from './pages/cms/pages/PagesListPage';
import PageEditPage from './pages/cms/pages/PageEditPage';

import ProductsListPage from './pages/cms/products/ProductsListPage';
import ProductEditPage from './pages/cms/products/ProductEditPage';

import IndustriesListPage from './pages/cms/industries/IndustriesListPage';
import IndustryEditPage from './pages/cms/industries/IndustryEditPage';

import CaseStudiesListPage from './pages/cms/caseStudies/CaseStudiesListPage';
import CaseStudyEditPage from './pages/cms/caseStudies/CaseStudyEditPage';

import InsiderPageLayout from './pages/cms/insider/InsiderPageLayout';
import { INSIDER_HERO_SECTION } from './pages/cms/insider/insiderHeroSection';
import IssuesPage from './pages/cms/insider/IssuesPage';
import IssueEditPage from './pages/cms/insider/IssueEditPage';
import StoryEditPage from './pages/cms/insider/StoryEditPage';
import FeatureSectionPage from './pages/cms/insider/FeatureSectionPage';

import ContactPageLayout from './pages/cms/contact/ContactPageLayout';
import ContactHeroSectionPage from './pages/cms/contact/ContactHeroSectionPage';
import ContactFormSectionPage from './pages/cms/contact/ContactFormSectionPage';
import ContactDetailsPage from './pages/cms/contact/ContactDetailsPage';
import ContactEnquiriesPage from './pages/cms/contact/ContactEnquiriesPage';

import CareerPageLayout from './pages/cms/careers/CareerPageLayout';
import VacancyApplicationsPage from './pages/cms/careers/VacancyApplicationsPage';
import VacancyManagementPage from './pages/cms/careers/VacancyManagementPage';
import VacancyEditPage from './pages/cms/careers/VacancyEditPage';

import PartnerProgramLayout from './pages/cms/partnerProgram/PartnerProgramLayout';
import PartnerProgramApplicationsPage from './pages/cms/partnerProgram/PartnerProgramApplicationsPage';
import PartnerProgramHeroSectionPage from './pages/cms/partnerProgram/PartnerProgramHeroSectionPage';

import AboutPageLayout from './pages/cms/about/AboutPageLayout';
import AboutHeroSectionPage from './pages/cms/about/AboutHeroSectionPage';
import AboutFounderNotePage from './pages/cms/about/AboutFounderNotePage';
import AboutTeamSectionPage from './pages/cms/about/AboutTeamSectionPage';
import AboutNumbersSectionPage from './pages/cms/about/AboutNumbersSectionPage';
import AboutCtaSectionPage from './pages/cms/about/AboutCtaSectionPage';
import DiscoveryCallApplicationsPage from './pages/cms/about/DiscoveryCallApplicationsPage';

import LeadsInboxPage from './pages/cms/leads/LeadsInboxPage';

import TestimonialsPage from './pages/cms/library/TestimonialsPage';
import FaqsPage from './pages/cms/library/FaqsPage';
import ModulesPage from './pages/cms/library/ModulesPage';
import IntegrationsPage from './pages/cms/library/IntegrationsPage';
import MediaPage from './pages/cms/library/MediaPage';

import ComparisonsPage from './pages/cms/marketing/ComparisonsPage';
import AnnouncementsPage from './pages/cms/marketing/AnnouncementsPage';
import RoiCalculatorPage from './pages/cms/marketing/RoiCalculatorPage';
import ImplementationPage from './pages/cms/marketing/ImplementationPage';
import PricingPage from './pages/cms/marketing/PricingPage';
import PartnersPage from './pages/cms/marketing/PartnersPage';

import NavigationPage from './pages/cms/structure/NavigationPage';
import SeoManagerPage from './pages/cms/structure/SeoManagerPage';

import ProfilePage from './pages/account/ProfilePage';
import ChangePasswordPage from './pages/account/ChangePasswordPage';
import NotificationsPage from './pages/account/NotificationsPage';

import GeneralSettingsPage from './pages/settings/GeneralSettingsPage';
import BrandingSettingsPage from './pages/settings/BrandingSettingsPage';
import SeoDefaultsPage from './pages/settings/SeoDefaultsPage';
import IntegrationsSettingsPage from './pages/settings/IntegrationsSettingsPage';
import UsersRolesPage from './pages/settings/UsersRolesPage';
import AuditLogPage from './pages/settings/AuditLogPage';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute><AdminShell /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Home page content, one tab per section of the marketing home page. */}
          <Route path="/cms/home-page" element={<HomePageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<HeroSectionPage />} />
          </Route>

          {/*
            The slide form is its own page, outside the tab layout - the tabs
            navigate between sections, and a half-written slide is not a section
            you want one click away from being abandoned. 'new' is the create
            sentinel, matching /cms/pages/new and the other CMS edit screens.
          */}
          <Route path="/cms/home-page/hero-section/:id" element={<HeroSlideEditPage />} />

          <Route path="/cms/pages" element={<PagesListPage />} />
          <Route path="/cms/pages/:id" element={<PageEditPage />} />

          <Route path="/cms/products" element={<ProductsListPage />} />
          <Route path="/cms/products/:id" element={<ProductEditPage />} />

          <Route path="/cms/industries" element={<IndustriesListPage />} />
          <Route path="/cms/industries/:id" element={<IndustryEditPage />} />

          <Route path="/cms/case-studies" element={<CaseStudiesListPage />} />
          <Route path="/cms/case-studies/:id" element={<CaseStudyEditPage />} />

          {/*
            Insider (the admin name for what the site serves at /newsletter),
            one tab per section of that page - laid out like the home page.
            The hero tab and its slide form are the home hero screens, driven
            by the Insider config; the `key`s make React mount them afresh
            rather than reuse the home instances, whose state belongs to the
            other carousel.
          */}
          <Route path="/cms/insider" element={<InsiderPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route
              path="hero-section"
              element={<HeroSectionPage key="insider" config={INSIDER_HERO_SECTION} />}
            />
            <Route path="news" element={<IssuesPage />} />
            <Route path="feature-section" element={<FeatureSectionPage />} />
          </Route>

          {/* Forms outside the tab layout, as on the home page. 'new' = create. */}
          <Route
            path="/cms/insider/hero-section/:id"
            element={<HeroSlideEditPage key="insider" config={INSIDER_HERO_SECTION} />}
          />
          <Route path="/cms/insider/news/:id" element={<IssueEditPage />} />
          <Route path="/cms/insider/news/:issueId/stories/:storyId" element={<StoryEditPage />} />

          {/*
            The tab reads "News" now and lives at /cms/insider/news; it was
            /cms/insider/issues, and before that the whole area was Newsletter.
            Both older shapes redirect, so old links and bookmarks still land -
            RedirectWithParams carries the query string, which is what keeps
            ?tab=stories working.
          */}
          <Route path="/cms/insider/issues" element={<Navigate to="/cms/insider/news" replace />} />
          <Route
            path="/cms/insider/issues/:id"
            element={<RedirectWithParams to="/cms/insider/news/:id" />}
          />
          <Route
            path="/cms/insider/issues/:issueId/stories/:storyId"
            element={<RedirectWithParams to="/cms/insider/news/:issueId/stories/:storyId" />}
          />
          <Route path="/cms/newsletter" element={<Navigate to="/cms/insider/news" replace />} />
          <Route
            path="/cms/newsletter/:id"
            element={<RedirectWithParams to="/cms/insider/news/:id" />}
          />
          <Route
            path="/cms/newsletter/:issueId/stories/:storyId"
            element={<RedirectWithParams to="/cms/insider/news/:issueId/stories/:storyId" />}
          />

          {/*
            The public /contact page, one tab per section - laid out like the
            home and Insider pages. Three sections: the closing CTA above the
            footer is static artwork in the website's own code, so it has no tab
            here. Every section is a singleton form, so there is nothing to edit
            outside the tab layout.

            'enquiries' is the odd one out: not a section of the page but the
            inbox of what visitors submitted through it, so it is the last tab
            and not the one this area opens on - an admin who came to edit copy
            should not land on a list of strangers' contact details. A row opens
            a detail card rather than a page, so it needs no route of its own
            either, which is why there is nothing here matching
            /cms/contact/enquiries/:id.
          */}
          <Route path="/cms/contact" element={<ContactPageLayout />}>
            {/* The inbox leads the tab strip, so it is also what /cms/contact opens on. */}
            <Route index element={<Navigate to="enquiries" replace />} />
            <Route path="hero-section" element={<ContactHeroSectionPage />} />
            <Route path="form-section" element={<ContactFormSectionPage />} />
            <Route path="contact-details" element={<ContactDetailsPage />} />
            <Route path="enquiries" element={<ContactEnquiriesPage />} />
          </Route>

          {/*
            Career: exactly two tabs, both lists rather than sections of a
            page. The applications inbox leads the strip and is what
            /cms/careers opens on - see CareerPageLayout for why.

            The vacancy form is outside the tab layout, like the Insider news
            item form, and for the same reason: the tabs move between lists,
            and a half-written job advert should not be one click from being
            abandoned. 'new' is the create sentinel, matching the other CMS
            edit screens.
          */}
          <Route path="/cms/careers" element={<CareerPageLayout />}>
            <Route index element={<Navigate to="applications" replace />} />
            <Route path="applications" element={<VacancyApplicationsPage />} />
            <Route path="vacancies" element={<VacancyManagementPage />} />
          </Route>
          <Route path="/cms/careers/vacancies/:id" element={<VacancyEditPage />} />

          {/*
            Partner Program: the public /partners page. Exactly two tabs, because
            exactly two things on that page are not static - the applications the
            form collects, and the hero above it. The partnership models, the
            economics block and the FAQ are artwork in the website's own code.

            The inbox leads the strip and is what /cms/partner-program opens on,
            like the Contact and Career areas - see PartnerProgramLayout. Both
            tabs are singleton screens (one form, and a detail card behind a row),
            so nothing lives outside this layout and there is no route matching
            /cms/partner-program/applications/:id.
          */}
          <Route path="/cms/partner-program" element={<PartnerProgramLayout />}>
            <Route index element={<Navigate to="applications" replace />} />
            <Route path="applications" element={<PartnerProgramApplicationsPage />} />
            <Route path="hero-section" element={<PartnerProgramHeroSectionPage />} />
          </Route>

          {/*
            About Us: the public /about page, one tab per band the user asked to
            become editable, plus the inbox its form fills. Six tabs, and nothing
            else on that page is admin-driven - the Nashik pride band, the timeline,
            the four operating principles under the team, the client-logo strip
            under the numbers, the Byte Elephants facts and the global-ambition
            block are artwork in the website's own code.

            This area opens on its inbox, the same way Contact, Career and Partner
            Program do: Discovery Call Applications leads the tab strip, so the
            index redirect below points at it. The user asked for that after first
            asking for the sections to lead, so the two have to move together -
            see AboutPageLayout.

            Every tab is self-contained: the People and Number tabs manage their
            ordered lists in a Modal on the same screen as the section copy, so
            there is no /cms/about/team-section/:id, and a booking opens a detail
            card rather than a page, so there is nothing matching
            /cms/about/discovery-calls/:id either.
          */}
          <Route path="/cms/about" element={<AboutPageLayout />}>
            {/* The inbox leads the tab strip, so it is what /cms/about opens on. */}
            <Route index element={<Navigate to="discovery-calls" replace />} />
            <Route path="hero-section" element={<AboutHeroSectionPage />} />
            <Route path="founder-note" element={<AboutFounderNotePage />} />
            <Route path="team-section" element={<AboutTeamSectionPage />} />
            <Route path="numbers-section" element={<AboutNumbersSectionPage />} />
            <Route path="cta-section" element={<AboutCtaSectionPage />} />
            <Route path="discovery-calls" element={<DiscoveryCallApplicationsPage />} />
          </Route>

          <Route path="/cms/leads/:type" element={<LeadsInboxPage />} />

          <Route path="/cms/testimonials" element={<TestimonialsPage />} />
          <Route path="/cms/faqs" element={<FaqsPage />} />
          <Route path="/cms/modules" element={<ModulesPage />} />
          <Route path="/cms/integrations" element={<IntegrationsPage />} />
          <Route path="/cms/media" element={<MediaPage />} />

          <Route path="/cms/comparisons" element={<ComparisonsPage />} />
          <Route path="/cms/roi-calculator" element={<RoiCalculatorPage />} />
          <Route path="/cms/implementation" element={<ImplementationPage />} />
          <Route path="/cms/pricing" element={<PricingPage />} />
          <Route path="/cms/partners" element={<PartnersPage />} />
          <Route path="/cms/announcements" element={<AnnouncementsPage />} />

          <Route path="/cms/navigation" element={<NavigationPage />} />
          <Route path="/cms/seo" element={<SeoManagerPage />} />

          <Route path="/account/profile" element={<ProfilePage />} />
          <Route path="/account/password" element={<ChangePasswordPage />} />
          <Route path="/account/notifications" element={<NotificationsPage />} />

          <Route path="/settings/general" element={<GeneralSettingsPage />} />
          <Route path="/settings/branding" element={<BrandingSettingsPage />} />
          <Route path="/settings/seo" element={<SeoDefaultsPage />} />
          <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/settings/users" element={<UsersRolesPage />} />
          <Route path="/settings/audit-log" element={<AuditLogPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
