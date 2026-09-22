import { Navigate, Route, Routes } from 'react-router-dom';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ProtectedRoute } from './components/common/ProtectedRoute';
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

import NewsletterPage from './pages/cms/newsletter/NewsletterPage';
import IssueEditPage from './pages/cms/newsletter/IssueEditPage';
import StoryEditPage from './pages/cms/newsletter/StoryEditPage';

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

          <Route path="/cms/newsletter" element={<NewsletterPage />} />
          <Route path="/cms/newsletter/:id" element={<IssueEditPage />} />
          <Route path="/cms/newsletter/:issueId/stories/:storyId" element={<StoryEditPage />} />

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
