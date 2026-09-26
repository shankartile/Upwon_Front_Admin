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
import HeroSlideViewPage from './pages/cms/homePage/HeroSlideViewPage';
import TrustSectionPage from './pages/cms/homePage/TrustSectionPage';
import TrustEntryEditPage from './pages/cms/homePage/TrustEntryEditPage';
import TrustEntryViewPage from './pages/cms/homePage/TrustEntryViewPage';
import IndustriesSectionPage from './pages/cms/homePage/IndustriesSectionPage';
import IndustriesEntryEditPage from './pages/cms/homePage/IndustriesEntryEditPage';
import IndustriesEntryViewPage from './pages/cms/homePage/IndustriesEntryViewPage';
import ValuesSectionPage from './pages/cms/homePage/ValuesSectionPage';
import ValuesEntryEditPage from './pages/cms/homePage/ValuesEntryEditPage';
import ValuesEntryViewPage from './pages/cms/homePage/ValuesEntryViewPage';
import IntegrationsSectionPage from './pages/cms/homePage/IntegrationsSectionPage';
import IntegrationsEntryEditPage from './pages/cms/homePage/IntegrationsEntryEditPage';
import IntegrationsEntryViewPage from './pages/cms/homePage/IntegrationsEntryViewPage';
import TestimonialsSectionPage from './pages/cms/homePage/TestimonialsSectionPage';
import TestimonialEntryEditPage from './pages/cms/homePage/TestimonialEntryEditPage';
import TestimonialEntryViewPage from './pages/cms/homePage/TestimonialEntryViewPage';
import FaqSectionPage from './pages/cms/homePage/FaqSectionPage';
import FaqEntryEditPage from './pages/cms/homePage/FaqEntryEditPage';
import FaqEntryViewPage from './pages/cms/homePage/FaqEntryViewPage';
import CtaSectionPage from './pages/cms/homePage/CtaSectionPage';

import PagesListPage from './pages/cms/pages/PagesListPage';
import PageEditPage from './pages/cms/pages/PageEditPage';

import ErpPageLayout from './pages/cms/erpPage/ErpPageLayout';
import ErpHeroSectionPage from './pages/cms/erpPage/HeroSectionPage';
import ErpHeroSlideEditPage from './pages/cms/erpPage/HeroSlideEditPage';
import ErpHeroSlideViewPage from './pages/cms/erpPage/HeroSlideViewPage';
import ErpTrustSectionPage from './pages/cms/erpPage/TrustSectionPage';
import ErpTrustEntryEditPage from './pages/cms/erpPage/TrustEntryEditPage';
import ErpTrustEntryViewPage from './pages/cms/erpPage/TrustEntryViewPage';
import ErpRecognitionSectionPage from './pages/cms/erpPage/RecognitionSectionPage';
// Aliased: /cms/industries already has an IndustryEditPage of its own.
import ErpIndustryEditPage from './pages/cms/erpPage/IndustryEditPage';
import ErpIndustryViewPage from './pages/cms/erpPage/IndustryViewPage';
import ErpBenefitsSectionPage from './pages/cms/erpPage/BenefitsSectionPage';
import ErpPersonaEditPage from './pages/cms/erpPage/PersonaEditPage';
import ErpPersonaViewPage from './pages/cms/erpPage/PersonaViewPage';
import ErpAlternativesSectionPage from './pages/cms/erpPage/AlternativesSectionPage';
import ErpComparisonBandPage from './pages/cms/erpPage/ComparisonBandPage';
import ErpOutcomesSectionPage from './pages/cms/erpPage/OutcomesSectionPage';
import ErpOutcomeCardEditPage from './pages/cms/erpPage/OutcomeCardEditPage';
import ErpOutcomeCardViewPage from './pages/cms/erpPage/OutcomeCardViewPage';
import ErpEstablishersSectionPage from './pages/cms/erpPage/EstablishersSectionPage';
import ErpEstablisherBadgeEditPage from './pages/cms/erpPage/EstablisherBadgeEditPage';
import ErpEstablisherBadgeViewPage from './pages/cms/erpPage/EstablisherBadgeViewPage';
import SfaDmsPageLayout from './pages/cms/sfaDmsPage/SfaDmsPageLayout';
import FmsPageLayout from './pages/cms/fmsPage/FmsPageLayout';
import FmsHeroSectionPage from './pages/cms/fmsPage/HeroSectionPage';
import FmsHeroSlideEditPage from './pages/cms/fmsPage/HeroSlideEditPage';
import FmsHeroSlideViewPage from './pages/cms/fmsPage/HeroSlideViewPage';
import FmsFaqSectionPage from './pages/cms/fmsPage/FaqSectionPage';
import FmsFaqEntryEditPage from './pages/cms/fmsPage/FaqEntryEditPage';
import FmsFaqEntryViewPage from './pages/cms/fmsPage/FaqEntryViewPage';
import FmsCtaSectionPage from './pages/cms/fmsPage/CtaSectionPage';
import FmsProofSectionPage from './pages/cms/fmsPage/ProofSectionPage';
import FmsFranchiseSectionPage from './pages/cms/fmsPage/FranchiseSectionPage';
import FmsVideoSectionPage from './pages/cms/fmsPage/VideoSectionPage';
import FmsIntegrationsSectionPage from './pages/cms/fmsPage/IntegrationsSectionPage';
import FmsIntegrationLogoEditPage from './pages/cms/fmsPage/IntegrationLogoEditPage';
import FmsIntegrationLogoViewPage from './pages/cms/fmsPage/IntegrationLogoViewPage';
import FmsVideoEntryEditPage from './pages/cms/fmsPage/VideoEntryEditPage';
import FmsVideoEntryViewPage from './pages/cms/fmsPage/VideoEntryViewPage';
import FmsFranchiseCategoryEditPage from './pages/cms/fmsPage/FranchiseCategoryEditPage';
import FmsFranchiseCategoryViewPage from './pages/cms/fmsPage/FranchiseCategoryViewPage';
import FmsFranchiseEntryEditPage from './pages/cms/fmsPage/FranchiseEntryEditPage';
import FmsFranchiseEntryViewPage from './pages/cms/fmsPage/FranchiseEntryViewPage';
import FmsProofLogoEditPage from './pages/cms/fmsPage/ProofLogoEditPage';
import FmsProofLogoViewPage from './pages/cms/fmsPage/ProofLogoViewPage';
import FmsProofStatEditPage from './pages/cms/fmsPage/ProofStatEditPage';
import FmsProofStatViewPage from './pages/cms/fmsPage/ProofStatViewPage';
import SfaHeroSectionPage from './pages/cms/sfaDmsPage/HeroSectionPage';
import SfaHeroSlideEditPage from './pages/cms/sfaDmsPage/HeroSlideEditPage';
import SfaHeroSlideViewPage from './pages/cms/sfaDmsPage/HeroSlideViewPage';
import SfaFaqSectionPage from './pages/cms/sfaDmsPage/FaqSectionPage';
import SfaFaqEntryEditPage from './pages/cms/sfaDmsPage/FaqEntryEditPage';
import SfaFaqEntryViewPage from './pages/cms/sfaDmsPage/FaqEntryViewPage';
import SfaCtaSectionPage from './pages/cms/sfaDmsPage/CtaSectionPage';
import SfaProofSectionPage from './pages/cms/sfaDmsPage/ProofSectionPage';
import SfaProofPanelEditPage from './pages/cms/sfaDmsPage/ProofPanelEditPage';
import SfaProofLogoEditPage from './pages/cms/sfaDmsPage/ProofLogoEditPage';
import SfaProofLogoViewPage from './pages/cms/sfaDmsPage/ProofLogoViewPage';
import SfaProofStatEditPage from './pages/cms/sfaDmsPage/ProofStatEditPage';
import SfaProofStatViewPage from './pages/cms/sfaDmsPage/ProofStatViewPage';
import SfaVideoSectionPage from './pages/cms/sfaDmsPage/VideoSectionPage';
import SfaVideoEntryEditPage from './pages/cms/sfaDmsPage/VideoEntryEditPage';
import SfaVideoEntryViewPage from './pages/cms/sfaDmsPage/VideoEntryViewPage';
import SfaPackagesSectionPage from './pages/cms/sfaDmsPage/PackagesSectionPage';
import SfaPackageCardEditPage from './pages/cms/sfaDmsPage/PackageCardEditPage';
import SfaPackageCardViewPage from './pages/cms/sfaDmsPage/PackageCardViewPage';
import SfaPackageFeaturesPage from './pages/cms/sfaDmsPage/PackageFeaturesPage';
import SfaPackageFeatureEditPage from './pages/cms/sfaDmsPage/PackageFeatureEditPage';
import SfaEstablishersSectionPage from './pages/cms/sfaDmsPage/EstablishersSectionPage';
import SfaEstablishersPanelsPage from './pages/cms/sfaDmsPage/EstablishersPanelsPage';
import SfaEstablisherBadgeEditPage from './pages/cms/sfaDmsPage/EstablisherBadgeEditPage';
import SfaAlternativesSectionPage from './pages/cms/sfaDmsPage/AlternativesSectionPage';
import SfaAlternativesLeaderPage from './pages/cms/sfaDmsPage/AlternativesLeaderPage';
import SfaAlternativesColumnEditPage from './pages/cms/sfaDmsPage/AlternativesColumnEditPage';
import SfaCapabilityRowEditPage from './pages/cms/sfaDmsPage/CapabilityRowEditPage';
import SfaAlternativesSummaryPage from './pages/cms/sfaDmsPage/AlternativesSummaryPage';
import SfaOutcomesSectionPage from './pages/cms/sfaDmsPage/OutcomesSectionPage';
import SfaOutcomeButtonsPage from './pages/cms/sfaDmsPage/OutcomeButtonsPage';
import SfaOutcomeCardEditPage from './pages/cms/sfaDmsPage/OutcomeCardEditPage';
import SfaOutcomeCardViewPage from './pages/cms/sfaDmsPage/OutcomeCardViewPage';
import SfaEstablisherBadgeViewPage from './pages/cms/sfaDmsPage/EstablisherBadgeViewPage';
import SfaAlternativesColumnViewPage from './pages/cms/sfaDmsPage/AlternativesColumnViewPage';
import SfaCapabilityRowViewPage from './pages/cms/sfaDmsPage/CapabilityRowViewPage';
import SfaPackageFeatureViewPage from './pages/cms/sfaDmsPage/PackageFeatureViewPage';
import ErpComparisonColumnViewPage from './pages/cms/erpPage/ComparisonColumnViewPage';
import ErpComparisonBandViewPage from './pages/cms/erpPage/ComparisonBandViewPage';
import ErpFaqSectionPage from './pages/cms/erpPage/FaqSectionPage';
import ErpFaqEntryEditPage from './pages/cms/erpPage/FaqEntryEditPage';
import ErpFaqEntryViewPage from './pages/cms/erpPage/FaqEntryViewPage';
import ErpCtaSectionPage from './pages/cms/erpPage/CtaSectionPage';

import BakeryPageLayout from './pages/cms/bakeryPage/BakeryPageLayout';
import BakeryHeroSectionPage from './pages/cms/bakeryPage/HeroSectionPage';
import BakeryHeroSlideEditPage from './pages/cms/bakeryPage/HeroSlideEditPage';
import BakeryHeroSlideViewPage from './pages/cms/bakeryPage/HeroSlideViewPage';
import BakeryTrustSectionPage from './pages/cms/bakeryPage/TrustSectionPage';
import BakeryTrustLogoEditPage from './pages/cms/bakeryPage/TrustLogoEditPage';
import BakeryTrustLogoViewPage from './pages/cms/bakeryPage/TrustLogoViewPage';
import BakeryTrustStatEditPage from './pages/cms/bakeryPage/TrustStatEditPage';
import BakeryTrustStatViewPage from './pages/cms/bakeryPage/TrustStatViewPage';
import BakeryPlatformSectionPage from './pages/cms/bakeryPage/PlatformSectionPage';
import BakeryPlatformTileEditPage from './pages/cms/bakeryPage/PlatformTileEditPage';
import BakeryPlatformTileViewPage from './pages/cms/bakeryPage/PlatformTileViewPage';
import BakeryHelpsSectionPage from './pages/cms/bakeryPage/HelpsSectionPage';
import BakeryHelpVisualEditPage from './pages/cms/bakeryPage/HelpVisualEditPage';
import BakeryHelpVisualViewPage from './pages/cms/bakeryPage/HelpVisualViewPage';
import BakeryFaqSectionPage from './pages/cms/bakeryPage/FaqSectionPage';
import BakeryFaqEntryEditPage from './pages/cms/bakeryPage/FaqEntryEditPage';
import BakeryFaqEntryViewPage from './pages/cms/bakeryPage/FaqEntryViewPage';
import BakeryCtaSectionPage from './pages/cms/bakeryPage/CtaSectionPage';
import BakeryCtaFeatureEditPage from './pages/cms/bakeryPage/CtaFeatureEditPage';
import BakeryCtaFeatureViewPage from './pages/cms/bakeryPage/CtaFeatureViewPage';

import FmcgPageLayout from './pages/cms/fmcgPage/FmcgPageLayout';
import FmcgHeroSectionPage from './pages/cms/fmcgPage/HeroSectionPage';
import FmcgHeroSlideEditPage from './pages/cms/fmcgPage/HeroSlideEditPage';
import FmcgHeroSlideViewPage from './pages/cms/fmcgPage/HeroSlideViewPage';
import FmcgTrustSectionPage from './pages/cms/fmcgPage/TrustSectionPage';
import FmcgTrustLogoEditPage from './pages/cms/fmcgPage/TrustLogoEditPage';
import FmcgTrustLogoViewPage from './pages/cms/fmcgPage/TrustLogoViewPage';
import FmcgTrustStatEditPage from './pages/cms/fmcgPage/TrustStatEditPage';
import FmcgTrustStatViewPage from './pages/cms/fmcgPage/TrustStatViewPage';
import FmcgPlatformSectionPage from './pages/cms/fmcgPage/PlatformSectionPage';
import FmcgPlatformTileEditPage from './pages/cms/fmcgPage/PlatformTileEditPage';
import FmcgPlatformTileViewPage from './pages/cms/fmcgPage/PlatformTileViewPage';
import FmcgFaqSectionPage from './pages/cms/fmcgPage/FaqSectionPage';
import FmcgFaqEntryEditPage from './pages/cms/fmcgPage/FaqEntryEditPage';
import FmcgFaqEntryViewPage from './pages/cms/fmcgPage/FaqEntryViewPage';
import FmcgCtaSectionPage from './pages/cms/fmcgPage/CtaSectionPage';

import SweetsPageLayout from './pages/cms/sweetsPage/SweetsPageLayout';
import SweetsHeroSectionPage from './pages/cms/sweetsPage/HeroSectionPage';
import SweetsHeroSlideEditPage from './pages/cms/sweetsPage/HeroSlideEditPage';
import SweetsHeroSlideViewPage from './pages/cms/sweetsPage/HeroSlideViewPage';
import SweetsTrustSectionPage from './pages/cms/sweetsPage/TrustSectionPage';
import SweetsTrustLogoEditPage from './pages/cms/sweetsPage/TrustLogoEditPage';
import SweetsTrustLogoViewPage from './pages/cms/sweetsPage/TrustLogoViewPage';
import SweetsTrustStatEditPage from './pages/cms/sweetsPage/TrustStatEditPage';
import SweetsTrustStatViewPage from './pages/cms/sweetsPage/TrustStatViewPage';
import SweetsPlatformSectionPage from './pages/cms/sweetsPage/PlatformSectionPage';
import SweetsPlatformTileEditPage from './pages/cms/sweetsPage/PlatformTileEditPage';
import SweetsPlatformTileViewPage from './pages/cms/sweetsPage/PlatformTileViewPage';
import SweetsFaqSectionPage from './pages/cms/sweetsPage/FaqSectionPage';
import SweetsFaqEntryEditPage from './pages/cms/sweetsPage/FaqEntryEditPage';
import SweetsFaqEntryViewPage from './pages/cms/sweetsPage/FaqEntryViewPage';
import SweetsCtaSectionPage from './pages/cms/sweetsPage/CtaSectionPage';

import FoodProcessingPageLayout from './pages/cms/foodProcessingPage/FoodProcessingPageLayout';
import FoodProcessingHeroSectionPage from './pages/cms/foodProcessingPage/HeroSectionPage';
import FoodProcessingHeroSlideEditPage from './pages/cms/foodProcessingPage/HeroSlideEditPage';
import FoodProcessingHeroSlideViewPage from './pages/cms/foodProcessingPage/HeroSlideViewPage';
import FoodProcessingTrustSectionPage from './pages/cms/foodProcessingPage/TrustSectionPage';
import FoodProcessingTrustLogoEditPage from './pages/cms/foodProcessingPage/TrustLogoEditPage';
import FoodProcessingTrustLogoViewPage from './pages/cms/foodProcessingPage/TrustLogoViewPage';
import FoodProcessingTrustStatEditPage from './pages/cms/foodProcessingPage/TrustStatEditPage';
import FoodProcessingTrustStatViewPage from './pages/cms/foodProcessingPage/TrustStatViewPage';
import FoodProcessingPlatformSectionPage from './pages/cms/foodProcessingPage/PlatformSectionPage';
import FoodProcessingPlatformTileEditPage from './pages/cms/foodProcessingPage/PlatformTileEditPage';
import FoodProcessingPlatformTileViewPage from './pages/cms/foodProcessingPage/PlatformTileViewPage';
import FoodProcessingFaqSectionPage from './pages/cms/foodProcessingPage/FaqSectionPage';
import FoodProcessingFaqEntryEditPage from './pages/cms/foodProcessingPage/FaqEntryEditPage';
import FoodProcessingFaqEntryViewPage from './pages/cms/foodProcessingPage/FaqEntryViewPage';
import FoodProcessingCtaSectionPage from './pages/cms/foodProcessingPage/CtaSectionPage';
import FoodProcessingCoverageSectionPage from './pages/cms/foodProcessingPage/CoverageSectionPage';
import FoodProcessingCoverageItemEditPage from './pages/cms/foodProcessingPage/CoverageItemEditPage';
import FoodProcessingCoverageItemViewPage from './pages/cms/foodProcessingPage/CoverageItemViewPage';
import NonFoodFmcgPageLayout from './pages/cms/nonFoodFmcgPage/NonFoodFmcgPageLayout';
import NonFoodFmcgHeroSectionPage from './pages/cms/nonFoodFmcgPage/HeroSectionPage';
import NonFoodFmcgHeroSlideEditPage from './pages/cms/nonFoodFmcgPage/HeroSlideEditPage';
import NonFoodFmcgHeroSlideViewPage from './pages/cms/nonFoodFmcgPage/HeroSlideViewPage';
import NonFoodFmcgTrustSectionPage from './pages/cms/nonFoodFmcgPage/TrustSectionPage';
import NonFoodFmcgTrustLogoEditPage from './pages/cms/nonFoodFmcgPage/TrustLogoEditPage';
import NonFoodFmcgTrustLogoViewPage from './pages/cms/nonFoodFmcgPage/TrustLogoViewPage';
import NonFoodFmcgTrustStatEditPage from './pages/cms/nonFoodFmcgPage/TrustStatEditPage';
import NonFoodFmcgTrustStatViewPage from './pages/cms/nonFoodFmcgPage/TrustStatViewPage';
import NonFoodFmcgPlatformSectionPage from './pages/cms/nonFoodFmcgPage/PlatformSectionPage';
import NonFoodFmcgPlatformTileEditPage from './pages/cms/nonFoodFmcgPage/PlatformTileEditPage';
import NonFoodFmcgPlatformTileViewPage from './pages/cms/nonFoodFmcgPage/PlatformTileViewPage';
import NonFoodFmcgFaqSectionPage from './pages/cms/nonFoodFmcgPage/FaqSectionPage';
import NonFoodFmcgFaqEntryEditPage from './pages/cms/nonFoodFmcgPage/FaqEntryEditPage';
import NonFoodFmcgFaqEntryViewPage from './pages/cms/nonFoodFmcgPage/FaqEntryViewPage';
import NonFoodFmcgCtaSectionPage from './pages/cms/nonFoodFmcgPage/CtaSectionPage';
import NonFoodFmcgCapabilitiesSectionPage from './pages/cms/nonFoodFmcgPage/CapabilitiesSectionPage';
import NonFoodFmcgCapabilityCardEditPage from './pages/cms/nonFoodFmcgPage/CapabilityCardEditPage';
import NonFoodFmcgCapabilityCardViewPage from './pages/cms/nonFoodFmcgPage/CapabilityCardViewPage';
import NonFoodFmcgBenefitsSectionPage from './pages/cms/nonFoodFmcgPage/BenefitsSectionPage';
import NonFoodFmcgBenefitItemEditPage from './pages/cms/nonFoodFmcgPage/BenefitItemEditPage';
import NonFoodFmcgBenefitItemViewPage from './pages/cms/nonFoodFmcgPage/BenefitItemViewPage';
import NonFoodFmcgCoverageSectionPage from './pages/cms/nonFoodFmcgPage/CoverageSectionPage';
import NonFoodFmcgCoverageItemEditPage from './pages/cms/nonFoodFmcgPage/CoverageItemEditPage';
import NonFoodFmcgCoverageItemViewPage from './pages/cms/nonFoodFmcgPage/CoverageItemViewPage';
import DairyPageLayout from './pages/cms/dairyPage/DairyPageLayout';
import DairyHeroSectionPage from './pages/cms/dairyPage/HeroSectionPage';
import DairyHeroSlideEditPage from './pages/cms/dairyPage/HeroSlideEditPage';
import DairyHeroSlideViewPage from './pages/cms/dairyPage/HeroSlideViewPage';
import DairyTrustSectionPage from './pages/cms/dairyPage/TrustSectionPage';
import DairyTrustLogoEditPage from './pages/cms/dairyPage/TrustLogoEditPage';
import DairyTrustLogoViewPage from './pages/cms/dairyPage/TrustLogoViewPage';
import DairyTrustStatEditPage from './pages/cms/dairyPage/TrustStatEditPage';
import DairyTrustStatViewPage from './pages/cms/dairyPage/TrustStatViewPage';
import DairyCapabilitiesSectionPage from './pages/cms/dairyPage/CapabilitiesSectionPage';
import DairyCapabilityCardEditPage from './pages/cms/dairyPage/CapabilityCardEditPage';
import DairyCapabilityCardViewPage from './pages/cms/dairyPage/CapabilityCardViewPage';
import DairyPlatformSectionPage from './pages/cms/dairyPage/PlatformSectionPage';
import DairyPlatformTileEditPage from './pages/cms/dairyPage/PlatformTileEditPage';
import DairyPlatformTileViewPage from './pages/cms/dairyPage/PlatformTileViewPage';
import DairyBenefitsSectionPage from './pages/cms/dairyPage/BenefitsSectionPage';
import DairyBenefitItemEditPage from './pages/cms/dairyPage/BenefitItemEditPage';
import DairyBenefitItemViewPage from './pages/cms/dairyPage/BenefitItemViewPage';
import DairyCoverageSectionPage from './pages/cms/dairyPage/CoverageSectionPage';
import DairyCoverageItemEditPage from './pages/cms/dairyPage/CoverageItemEditPage';
import DairyCoverageItemViewPage from './pages/cms/dairyPage/CoverageItemViewPage';
import DairyFaqSectionPage from './pages/cms/dairyPage/FaqSectionPage';
import DairyFaqEntryEditPage from './pages/cms/dairyPage/FaqEntryEditPage';
import DairyFaqEntryViewPage from './pages/cms/dairyPage/FaqEntryViewPage';
import DairyCtaSectionPage from './pages/cms/dairyPage/CtaSectionPage';

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
            <Route path="trust-section" element={<TrustSectionPage />} />
            <Route path="industries-section" element={<IndustriesSectionPage />} />
            <Route path="values-section" element={<ValuesSectionPage />} />
            <Route path="integrations-section" element={<IntegrationsSectionPage />} />
            <Route path="testimonials-section" element={<TestimonialsSectionPage />} />
            <Route path="faq-section" element={<FaqSectionPage />} />
            <Route path="cta-section" element={<CtaSectionPage />} />
          </Route>

          {/*
            The slide form is its own page, outside the tab layout - the tabs
            navigate between sections, and a half-written slide is not a section
            you want one click away from being abandoned. 'new' is the create
            sentinel, matching /cms/pages/new and the other CMS edit screens.
          */}
          <Route path="/cms/home-page/hero-section/:id" element={<HeroSlideEditPage />} />
          <Route path="/cms/home-page/hero-section/:id/view" element={<HeroSlideViewPage />} />

          <Route path="/cms/home-page/trust-section/:id" element={<TrustEntryEditPage />} />
          <Route path="/cms/home-page/trust-section/:id/view" element={<TrustEntryViewPage />} />

          <Route path="/cms/home-page/industries-section/:id" element={<IndustriesEntryEditPage />} />
          <Route path="/cms/home-page/industries-section/:id/view" element={<IndustriesEntryViewPage />} />

          <Route path="/cms/home-page/values-section/:id" element={<ValuesEntryEditPage />} />
          <Route path="/cms/home-page/values-section/:id/view" element={<ValuesEntryViewPage />} />
          <Route
            path="/cms/home-page/integrations-section/:id"
            element={<IntegrationsEntryEditPage />}
          />
          <Route
            path="/cms/home-page/integrations-section/:id/view"
            element={<IntegrationsEntryViewPage />}
          />
          <Route
            path="/cms/home-page/testimonials-section/:id"
            element={<TestimonialEntryEditPage />}
          />
          <Route
            path="/cms/home-page/testimonials-section/:id/view"
            element={<TestimonialEntryViewPage />}
          />
          <Route path="/cms/home-page/faq-section/:id" element={<FaqEntryEditPage />} />
          <Route path="/cms/home-page/faq-section/:id/view" element={<FaqEntryViewPage />} />

          <Route path="/cms/pages" element={<PagesListPage />} />
          <Route path="/cms/pages/:id" element={<PageEditPage />} />

          {/*
            The ERP product page, section by section. Nested so the tab strip
            in ErpPageLayout stays mounted while the sections change, the same
            arrangement the Home Page screen uses.
          */}
          {/* The FMS page, laid out the same way as the SFA-DMS one. */}
          <Route path="/cms/products/fms" element={<FmsPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<FmsHeroSectionPage />} />
            <Route path="proof-section" element={<FmsProofSectionPage />} />
            <Route path="franchise-section" element={<FmsFranchiseSectionPage />} />
            <Route path="video-section" element={<FmsVideoSectionPage />} />
            <Route path="integrations-section" element={<FmsIntegrationsSectionPage />} />
            <Route path="faq-section" element={<FmsFaqSectionPage />} />
            <Route path="cta-section" element={<FmsCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/products/fms/hero-section/:id"
            element={<FmsHeroSlideEditPage />}
          />
          <Route
            path="/cms/products/fms/hero-section/:id/view"
            element={<FmsHeroSlideViewPage />}
          />
          <Route path="/cms/products/fms/faq-section/:id" element={<FmsFaqEntryEditPage />} />
          <Route
            path="/cms/products/fms/faq-section/:id/view"
            element={<FmsFaqEntryViewPage />}
          />
          <Route
            path="/cms/products/fms/proof-section/logos/:id"
            element={<FmsProofLogoEditPage />}
          />
          <Route
            path="/cms/products/fms/proof-section/logos/:id/view"
            element={<FmsProofLogoViewPage />}
          />
          <Route
            path="/cms/products/fms/proof-section/stats/:id"
            element={<FmsProofStatEditPage />}
          />
          <Route
            path="/cms/products/fms/proof-section/stats/:id/view"
            element={<FmsProofStatViewPage />}
          />
          <Route
            path="/cms/products/fms/franchise-section/categories/:id"
            element={<FmsFranchiseCategoryEditPage />}
          />
          <Route
            path="/cms/products/fms/franchise-section/categories/:id/view"
            element={<FmsFranchiseCategoryViewPage />}
          />
          {/*
            The flow and the benefits strip share one pair of screens; which
            list is being edited comes from the segment in the path, so a step
            can never be saved into the strip.
          */}
          <Route
            path="/cms/products/fms/franchise-section/categories/:categoryId/steps/:id"
            element={<FmsFranchiseEntryEditPage kind="steps" />}
          />
          <Route
            path="/cms/products/fms/franchise-section/categories/:categoryId/steps/:id/view"
            element={<FmsFranchiseEntryViewPage kind="steps" />}
          />
          <Route
            path="/cms/products/fms/franchise-section/categories/:categoryId/benefits/:id"
            element={<FmsFranchiseEntryEditPage kind="benefits" />}
          />
          <Route
            path="/cms/products/fms/franchise-section/categories/:categoryId/benefits/:id/view"
            element={<FmsFranchiseEntryViewPage kind="benefits" />}
          />
          <Route
            path="/cms/products/fms/video-section/:id"
            element={<FmsVideoEntryEditPage />}
          />
          <Route
            path="/cms/products/fms/video-section/:id/view"
            element={<FmsVideoEntryViewPage />}
          />
          <Route
            path="/cms/products/fms/integrations-section/logos/:id"
            element={<FmsIntegrationLogoEditPage />}
          />
          <Route
            path="/cms/products/fms/integrations-section/logos/:id/view"
            element={<FmsIntegrationLogoViewPage />}
          />

          {/*
            The Bakery & Confectionery industry page, laid out the same way as
            the product pages. Declared as static paths, so they outrank the
            older /cms/industries/:id route.
          */}
          <Route path="/cms/industries/bakery-confectionery" element={<BakeryPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<BakeryHeroSectionPage />} />
            <Route path="trust-section" element={<BakeryTrustSectionPage />} />
            <Route path="platform-section" element={<BakeryPlatformSectionPage />} />
            <Route path="helps-section" element={<BakeryHelpsSectionPage />} />
            <Route path="faq-section" element={<BakeryFaqSectionPage />} />
            <Route path="cta-section" element={<BakeryCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route path="/cms/industries/bakery-confectionery/hero-section/:id" element={<BakeryHeroSlideEditPage />} />
          <Route path="/cms/industries/bakery-confectionery/hero-section/:id/view" element={<BakeryHeroSlideViewPage />} />
          <Route path="/cms/industries/bakery-confectionery/trust-section/logos/:id" element={<BakeryTrustLogoEditPage />} />
          <Route
            path="/cms/industries/bakery-confectionery/trust-section/logos/:id/view"
            element={<BakeryTrustLogoViewPage />}
          />
          <Route path="/cms/industries/bakery-confectionery/trust-section/stats/:id" element={<BakeryTrustStatEditPage />} />
          <Route
            path="/cms/industries/bakery-confectionery/trust-section/stats/:id/view"
            element={<BakeryTrustStatViewPage />}
          />
          <Route path="/cms/industries/bakery-confectionery/platform-section/:id" element={<BakeryPlatformTileEditPage />} />
          <Route
            path="/cms/industries/bakery-confectionery/platform-section/:id/view"
            element={<BakeryPlatformTileViewPage />}
          />
          <Route path="/cms/industries/bakery-confectionery/helps-section/:id" element={<BakeryHelpVisualEditPage />} />
          <Route path="/cms/industries/bakery-confectionery/helps-section/:id/view" element={<BakeryHelpVisualViewPage />} />
          <Route path="/cms/industries/bakery-confectionery/faq-section/:id" element={<BakeryFaqEntryEditPage />} />
          <Route path="/cms/industries/bakery-confectionery/faq-section/:id/view" element={<BakeryFaqEntryViewPage />} />
          <Route path="/cms/industries/bakery-confectionery/cta-section/features/:id" element={<BakeryCtaFeatureEditPage />} />
          <Route
            path="/cms/industries/bakery-confectionery/cta-section/features/:id/view"
            element={<BakeryCtaFeatureViewPage />}
          />

          {/* The FMCG Distribution industry page, laid out the same way. */}
          <Route path="/cms/industries/fmcg-distribution" element={<FmcgPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<FmcgHeroSectionPage />} />
            <Route path="trust-section" element={<FmcgTrustSectionPage />} />
            <Route path="platform-section" element={<FmcgPlatformSectionPage />} />
            <Route path="faq-section" element={<FmcgFaqSectionPage />} />
            <Route path="cta-section" element={<FmcgCtaSectionPage />} />
          </Route>
          <Route path="/cms/industries/fmcg-distribution/hero-section/:id" element={<FmcgHeroSlideEditPage />} />
          <Route path="/cms/industries/fmcg-distribution/hero-section/:id/view" element={<FmcgHeroSlideViewPage />} />
          <Route path="/cms/industries/fmcg-distribution/trust-section/logos/:id" element={<FmcgTrustLogoEditPage />} />
          <Route path="/cms/industries/fmcg-distribution/trust-section/logos/:id/view" element={<FmcgTrustLogoViewPage />} />
          <Route path="/cms/industries/fmcg-distribution/trust-section/stats/:id" element={<FmcgTrustStatEditPage />} />
          <Route path="/cms/industries/fmcg-distribution/trust-section/stats/:id/view" element={<FmcgTrustStatViewPage />} />
          <Route path="/cms/industries/fmcg-distribution/platform-section/:id" element={<FmcgPlatformTileEditPage />} />
          <Route path="/cms/industries/fmcg-distribution/platform-section/:id/view" element={<FmcgPlatformTileViewPage />} />
          <Route path="/cms/industries/fmcg-distribution/faq-section/:id" element={<FmcgFaqEntryEditPage />} />
          <Route path="/cms/industries/fmcg-distribution/faq-section/:id/view" element={<FmcgFaqEntryViewPage />} />

          {/* The Sweets & Namkeen industry page, laid out the same way. */}
          <Route path="/cms/industries/sweets-namkeen" element={<SweetsPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<SweetsHeroSectionPage />} />
            <Route path="trust-section" element={<SweetsTrustSectionPage />} />
            <Route path="platform-section" element={<SweetsPlatformSectionPage />} />
            <Route path="faq-section" element={<SweetsFaqSectionPage />} />
            <Route path="cta-section" element={<SweetsCtaSectionPage />} />
          </Route>
          <Route path="/cms/industries/sweets-namkeen/hero-section/:id" element={<SweetsHeroSlideEditPage />} />
          <Route path="/cms/industries/sweets-namkeen/hero-section/:id/view" element={<SweetsHeroSlideViewPage />} />
          <Route path="/cms/industries/sweets-namkeen/trust-section/logos/:id" element={<SweetsTrustLogoEditPage />} />
          <Route path="/cms/industries/sweets-namkeen/trust-section/logos/:id/view" element={<SweetsTrustLogoViewPage />} />
          <Route path="/cms/industries/sweets-namkeen/trust-section/stats/:id" element={<SweetsTrustStatEditPage />} />
          <Route path="/cms/industries/sweets-namkeen/trust-section/stats/:id/view" element={<SweetsTrustStatViewPage />} />
          <Route path="/cms/industries/sweets-namkeen/platform-section/:id" element={<SweetsPlatformTileEditPage />} />
          <Route path="/cms/industries/sweets-namkeen/platform-section/:id/view" element={<SweetsPlatformTileViewPage />} />
          <Route path="/cms/industries/sweets-namkeen/faq-section/:id" element={<SweetsFaqEntryEditPage />} />
          <Route path="/cms/industries/sweets-namkeen/faq-section/:id/view" element={<SweetsFaqEntryViewPage />} />

          {/* The Food Processing industry page, laid out the same way. */}
          <Route path="/cms/industries/food-processing" element={<FoodProcessingPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<FoodProcessingHeroSectionPage />} />
            <Route path="trust-section" element={<FoodProcessingTrustSectionPage />} />
            <Route path="platform-section" element={<FoodProcessingPlatformSectionPage />} />
            <Route path="coverage-section" element={<FoodProcessingCoverageSectionPage />} />
            <Route path="faq-section" element={<FoodProcessingFaqSectionPage />} />
            <Route path="cta-section" element={<FoodProcessingCtaSectionPage />} />
          </Route>
          <Route path="/cms/industries/food-processing/hero-section/:id" element={<FoodProcessingHeroSlideEditPage />} />
          <Route path="/cms/industries/food-processing/hero-section/:id/view" element={<FoodProcessingHeroSlideViewPage />} />
          <Route path="/cms/industries/food-processing/trust-section/logos/:id" element={<FoodProcessingTrustLogoEditPage />} />
          <Route path="/cms/industries/food-processing/trust-section/logos/:id/view" element={<FoodProcessingTrustLogoViewPage />} />
          <Route path="/cms/industries/food-processing/trust-section/stats/:id" element={<FoodProcessingTrustStatEditPage />} />
          <Route path="/cms/industries/food-processing/trust-section/stats/:id/view" element={<FoodProcessingTrustStatViewPage />} />
          <Route path="/cms/industries/food-processing/platform-section/:id" element={<FoodProcessingPlatformTileEditPage />} />
          <Route path="/cms/industries/food-processing/platform-section/:id/view" element={<FoodProcessingPlatformTileViewPage />} />
          <Route path="/cms/industries/food-processing/faq-section/:id" element={<FoodProcessingFaqEntryEditPage />} />
          <Route path="/cms/industries/food-processing/faq-section/:id/view" element={<FoodProcessingFaqEntryViewPage />} />
          <Route path="/cms/industries/food-processing/coverage-section/:id" element={<FoodProcessingCoverageItemEditPage />} />
          <Route path="/cms/industries/food-processing/coverage-section/:id/view" element={<FoodProcessingCoverageItemViewPage />} />

          {/* The Non-Food FMCG industry page, laid out the same way. */}
          <Route path="/cms/industries/non-food-fmcg" element={<NonFoodFmcgPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<NonFoodFmcgHeroSectionPage />} />
            <Route path="trust-section" element={<NonFoodFmcgTrustSectionPage />} />
            <Route path="platform-section" element={<NonFoodFmcgPlatformSectionPage />} />
            <Route path="capabilities-section" element={<NonFoodFmcgCapabilitiesSectionPage />} />
            <Route path="benefits-section" element={<NonFoodFmcgBenefitsSectionPage />} />
            <Route path="coverage-section" element={<NonFoodFmcgCoverageSectionPage />} />
            <Route path="faq-section" element={<NonFoodFmcgFaqSectionPage />} />
            <Route path="cta-section" element={<NonFoodFmcgCtaSectionPage />} />
          </Route>
          <Route path="/cms/industries/non-food-fmcg/hero-section/:id" element={<NonFoodFmcgHeroSlideEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/hero-section/:id/view" element={<NonFoodFmcgHeroSlideViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/trust-section/logos/:id" element={<NonFoodFmcgTrustLogoEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/trust-section/logos/:id/view" element={<NonFoodFmcgTrustLogoViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/trust-section/stats/:id" element={<NonFoodFmcgTrustStatEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/trust-section/stats/:id/view" element={<NonFoodFmcgTrustStatViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/platform-section/:id" element={<NonFoodFmcgPlatformTileEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/platform-section/:id/view" element={<NonFoodFmcgPlatformTileViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/faq-section/:id" element={<NonFoodFmcgFaqEntryEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/faq-section/:id/view" element={<NonFoodFmcgFaqEntryViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/capabilities-section/:id" element={<NonFoodFmcgCapabilityCardEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/capabilities-section/:id/view" element={<NonFoodFmcgCapabilityCardViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/benefits-section/:id" element={<NonFoodFmcgBenefitItemEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/benefits-section/:id/view" element={<NonFoodFmcgBenefitItemViewPage />} />
          <Route path="/cms/industries/non-food-fmcg/coverage-section/:id" element={<NonFoodFmcgCoverageItemEditPage />} />
          <Route path="/cms/industries/non-food-fmcg/coverage-section/:id/view" element={<NonFoodFmcgCoverageItemViewPage />} />

          {/* The Dairy & Ice Cream page, laid out the same way. */}
          <Route path="/cms/industries/dairy" element={<DairyPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<DairyHeroSectionPage />} />
            <Route path="trust-section" element={<DairyTrustSectionPage />} />
            <Route path="capabilities-section" element={<DairyCapabilitiesSectionPage />} />
            <Route path="platform-section" element={<DairyPlatformSectionPage />} />
            <Route path="benefits-section" element={<DairyBenefitsSectionPage />} />
            <Route path="coverage-section" element={<DairyCoverageSectionPage />} />
            <Route path="faq-section" element={<DairyFaqSectionPage />} />
            <Route path="cta-section" element={<DairyCtaSectionPage />} />
          </Route>
          <Route path="/cms/industries/dairy/hero-section/:id" element={<DairyHeroSlideEditPage />} />
          <Route path="/cms/industries/dairy/hero-section/:id/view" element={<DairyHeroSlideViewPage />} />
          <Route path="/cms/industries/dairy/trust-section/logos/:id" element={<DairyTrustLogoEditPage />} />
          <Route path="/cms/industries/dairy/trust-section/logos/:id/view" element={<DairyTrustLogoViewPage />} />
          <Route path="/cms/industries/dairy/trust-section/stats/:id" element={<DairyTrustStatEditPage />} />
          <Route path="/cms/industries/dairy/trust-section/stats/:id/view" element={<DairyTrustStatViewPage />} />
          <Route path="/cms/industries/dairy/capabilities-section/:id" element={<DairyCapabilityCardEditPage />} />
          <Route path="/cms/industries/dairy/capabilities-section/:id/view" element={<DairyCapabilityCardViewPage />} />
          <Route path="/cms/industries/dairy/platform-section/:id" element={<DairyPlatformTileEditPage />} />
          <Route path="/cms/industries/dairy/platform-section/:id/view" element={<DairyPlatformTileViewPage />} />
          <Route path="/cms/industries/dairy/benefits-section/:id" element={<DairyBenefitItemEditPage />} />
          <Route path="/cms/industries/dairy/benefits-section/:id/view" element={<DairyBenefitItemViewPage />} />
          <Route path="/cms/industries/dairy/coverage-section/:id" element={<DairyCoverageItemEditPage />} />
          <Route path="/cms/industries/dairy/coverage-section/:id/view" element={<DairyCoverageItemViewPage />} />
          <Route path="/cms/industries/dairy/faq-section/:id" element={<DairyFaqEntryEditPage />} />
          <Route path="/cms/industries/dairy/faq-section/:id/view" element={<DairyFaqEntryViewPage />} />

          {/* The SFA-DMS page, laid out the same way as the ERP one. */}
          <Route path="/cms/products/sfa-dms" element={<SfaDmsPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<SfaHeroSectionPage />} />
            <Route path="proof-section" element={<SfaProofSectionPage />} />
            <Route path="video-section" element={<SfaVideoSectionPage />} />
            <Route path="packages-section" element={<SfaPackagesSectionPage />} />
            <Route
              path="alternatives-section"
              element={<SfaAlternativesSectionPage />}
            />
            <Route path="outcomes-section" element={<SfaOutcomesSectionPage />} />
            <Route
              path="establishers-section"
              element={<SfaEstablishersSectionPage />}
            />
            <Route path="faq-section" element={<SfaFaqSectionPage />} />
            <Route path="cta-section" element={<SfaCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/products/sfa-dms/hero-section/:id"
            element={<SfaHeroSlideEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/hero-section/:id/view"
            element={<SfaHeroSlideViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/faq-section/:id"
            element={<SfaFaqEntryEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/faq-section/:id/view"
            element={<SfaFaqEntryViewPage />}
          />
          {/*
            The proof band has three things to edit: the card, the logos inside
            it and the figures beside it. The card is one record, so its route
            carries no id.
          */}
          <Route
            path="/cms/products/sfa-dms/proof-section/panel"
            element={<SfaProofPanelEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/proof-section/logos/:id"
            element={<SfaProofLogoEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/proof-section/logos/:id/view"
            element={<SfaProofLogoViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/proof-section/stats/:id"
            element={<SfaProofStatEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/proof-section/stats/:id/view"
            element={<SfaProofStatViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/video-section/:id"
            element={<SfaVideoEntryEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/video-section/:id/view"
            element={<SfaVideoEntryViewPage />}
          />
          {/*
            The adoption path. A package has its own form and view; its tick
            list is nested under the package, so the URL carries the ownership
            the server checks.
          */}
          <Route
            path="/cms/products/sfa-dms/packages-section/cards/:id"
            element={<SfaPackageCardEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/packages-section/cards/:id/view"
            element={<SfaPackageCardViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/packages-section/cards/:cardId/features"
            element={<SfaPackageFeaturesPage />}
          />
          <Route
            path="/cms/products/sfa-dms/packages-section/cards/:cardId/features/:id"
            element={<SfaPackageFeatureEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/establishers-section/panels"
            element={<SfaEstablishersPanelsPage />}
          />
          <Route
            path="/cms/products/sfa-dms/establishers-section/badges/:id"
            element={<SfaEstablisherBadgeEditPage />}
          />
          {/*
            The comparison grid: the leader column, one column at a time, one
            capability at a time, and the closing line.
          */}
          <Route
            path="/cms/products/sfa-dms/alternatives-section/leader"
            element={<SfaAlternativesLeaderPage />}
          />
          <Route
            path="/cms/products/sfa-dms/alternatives-section/summary"
            element={<SfaAlternativesSummaryPage />}
          />
          <Route
            path="/cms/products/sfa-dms/alternatives-section/columns/:id"
            element={<SfaAlternativesColumnEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/alternatives-section/rows/:id"
            element={<SfaCapabilityRowEditPage />}
          />
          <Route
            path="/cms/products/sfa-dms/outcomes-section/buttons"
            element={<SfaOutcomeButtonsPage />}
          />
          <Route
            path="/cms/products/sfa-dms/outcomes-section/cards/:id"
            element={<SfaOutcomeCardEditPage />}
          />
          {/*
            The read-only views. Declared after their edit routes, which is only
            a readability choice - the '/view' suffix cannot collide with an id.
          */}
          <Route
            path="/cms/products/sfa-dms/outcomes-section/cards/:id/view"
            element={<SfaOutcomeCardViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/establishers-section/badges/:id/view"
            element={<SfaEstablisherBadgeViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/alternatives-section/columns/:id/view"
            element={<SfaAlternativesColumnViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/alternatives-section/rows/:id/view"
            element={<SfaCapabilityRowViewPage />}
          />
          <Route
            path="/cms/products/sfa-dms/packages-section/cards/:cardId/features/:id/view"
            element={<SfaPackageFeatureViewPage />}
          />

          <Route path="/cms/products/erp" element={<ErpPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<ErpHeroSectionPage />} />
            <Route path="trust-section" element={<ErpTrustSectionPage />} />
            <Route path="recognition-section" element={<ErpRecognitionSectionPage />} />
            <Route path="benefits-section" element={<ErpBenefitsSectionPage />} />
            <Route path="alternatives-section" element={<ErpAlternativesSectionPage />} />
            <Route path="outcomes-section" element={<ErpOutcomesSectionPage />} />
            <Route path="establishers-section" element={<ErpEstablishersSectionPage />} />
            <Route path="faq-section" element={<ErpFaqSectionPage />} />
            <Route path="cta-section" element={<ErpCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/products/erp/hero-section/:id"
            element={<ErpHeroSlideEditPage />}
          />
          <Route
            path="/cms/products/erp/hero-section/:id/view"
            element={<ErpHeroSlideViewPage />}
          />
          <Route
            path="/cms/products/erp/trust-section/:id"
            element={<ErpTrustEntryEditPage />}
          />
          <Route
            path="/cms/products/erp/trust-section/:id/view"
            element={<ErpTrustEntryViewPage />}
          />
          <Route
            path="/cms/products/erp/establishers-section/:id"
            element={<ErpEstablisherBadgeEditPage />}
          />
          <Route
            path="/cms/products/erp/establishers-section/:id/view"
            element={<ErpEstablisherBadgeViewPage />}
          />
          <Route
            path="/cms/products/erp/outcomes-section/:id"
            element={<ErpOutcomeCardEditPage />}
          />
          <Route
            path="/cms/products/erp/outcomes-section/:id/view"
            element={<ErpOutcomeCardViewPage />}
          />
          <Route
            path="/cms/products/erp/alternatives-section/columns/:id/view"
            element={<ErpComparisonColumnViewPage />}
          />
          <Route
            path="/cms/products/erp/alternatives-section/bands/:id/view"
            element={<ErpComparisonBandViewPage />}
          />
          <Route
            path="/cms/products/erp/alternatives-section/bands/:id"
            element={<ErpComparisonBandPage />}
          />
          <Route
            path="/cms/products/erp/benefits-section/:id"
            element={<ErpPersonaEditPage />}
          />
          <Route
            path="/cms/products/erp/benefits-section/:id/view"
            element={<ErpPersonaViewPage />}
          />
          <Route
            path="/cms/products/erp/recognition-section/:id"
            element={<ErpIndustryEditPage />}
          />
          <Route
            path="/cms/products/erp/recognition-section/:id/view"
            element={<ErpIndustryViewPage />}
          />
          <Route path="/cms/products/erp/faq-section/:id" element={<ErpFaqEntryEditPage />} />
          <Route
            path="/cms/products/erp/faq-section/:id/view"
            element={<ErpFaqEntryViewPage />}
          />

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
