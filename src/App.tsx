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
// Aliased: named for the ERP page, whose industry list has its own editor.
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
import PosPageLayout from './pages/cms/posPage/PosPageLayout';
import PosHeroSectionPage from './pages/cms/posPage/HeroSectionPage';
import PosHeroSlideEditPage from './pages/cms/posPage/HeroSlideEditPage';
import PosHeroSlideViewPage from './pages/cms/posPage/HeroSlideViewPage';
import PosFaqSectionPage from './pages/cms/posPage/FaqSectionPage';
import PosFaqEntryEditPage from './pages/cms/posPage/FaqEntryEditPage';
import PosFaqEntryViewPage from './pages/cms/posPage/FaqEntryViewPage';
import PosCtaSectionPage from './pages/cms/posPage/CtaSectionPage';
import EngineeringManufacturingPageLayout from './pages/cms/engineeringManufacturingPage/EngineeringManufacturingPageLayout';
import EngineeringHeroSectionPage from './pages/cms/engineeringManufacturingPage/HeroSectionPage';
import EngineeringHeroSlideEditPage from './pages/cms/engineeringManufacturingPage/HeroSlideEditPage';
import EngineeringHeroSlideViewPage from './pages/cms/engineeringManufacturingPage/HeroSlideViewPage';
import EngineeringTrustSectionPage from './pages/cms/engineeringManufacturingPage/TrustSectionPage';
import EngineeringTrustCardEditPage from './pages/cms/engineeringManufacturingPage/TrustCardEditPage';
import EngineeringTrustCardViewPage from './pages/cms/engineeringManufacturingPage/TrustCardViewPage';
import EngineeringTrustLogoEditPage from './pages/cms/engineeringManufacturingPage/TrustLogoEditPage';
import EngineeringTrustLogoViewPage from './pages/cms/engineeringManufacturingPage/TrustLogoViewPage';
import EngineeringCapabilitiesSectionPage from './pages/cms/engineeringManufacturingPage/CapabilitiesSectionPage';
import EngineeringCapabilityEditPage from './pages/cms/engineeringManufacturingPage/CapabilityEditPage';
import EngineeringCapabilityViewPage from './pages/cms/engineeringManufacturingPage/CapabilityViewPage';
import EngineeringPlatformSectionPage from './pages/cms/engineeringManufacturingPage/PlatformSectionPage';
import EngineeringPlatformWorkflowEditPage from './pages/cms/engineeringManufacturingPage/PlatformWorkflowEditPage';
import EngineeringPlatformWorkflowViewPage from './pages/cms/engineeringManufacturingPage/PlatformWorkflowViewPage';
import EngineeringCoverageSectionPage from './pages/cms/engineeringManufacturingPage/CoverageSectionPage';
import EngineeringCoverageCategoryEditPage from './pages/cms/engineeringManufacturingPage/CoverageCategoryEditPage';
import EngineeringCoverageCategoryViewPage from './pages/cms/engineeringManufacturingPage/CoverageCategoryViewPage';
import EngineeringFaqSectionPage from './pages/cms/engineeringManufacturingPage/FaqSectionPage';
import EngineeringFaqEntryEditPage from './pages/cms/engineeringManufacturingPage/FaqEntryEditPage';
import EngineeringFaqEntryViewPage from './pages/cms/engineeringManufacturingPage/FaqEntryViewPage';
import EngineeringCtaSectionPage from './pages/cms/engineeringManufacturingPage/CtaSectionPage';
import BeveragePageLayout from './pages/cms/beveragePage/BeveragePageLayout';
import BeverageHeroSectionPage from './pages/cms/beveragePage/HeroSectionPage';
import BeverageHeroSlideEditPage from './pages/cms/beveragePage/HeroSlideEditPage';
import BeverageHeroSlideViewPage from './pages/cms/beveragePage/HeroSlideViewPage';
import BeverageTrustSectionPage from './pages/cms/beveragePage/TrustSectionPage';
import BeverageTrustStatEditPage from './pages/cms/beveragePage/TrustStatEditPage';
import BeverageTrustStatViewPage from './pages/cms/beveragePage/TrustStatViewPage';
import BeverageTrustLogoEditPage from './pages/cms/beveragePage/TrustLogoEditPage';
import BeverageTrustLogoViewPage from './pages/cms/beveragePage/TrustLogoViewPage';
import BeverageCapabilitiesSectionPage from './pages/cms/beveragePage/CapabilitiesSectionPage';
import BeverageCapabilityEditPage from './pages/cms/beveragePage/CapabilityEditPage';
import BeverageCapabilityViewPage from './pages/cms/beveragePage/CapabilityViewPage';
import BeveragePlatformSectionPage from './pages/cms/beveragePage/PlatformSectionPage';
import BeveragePlatformWorkflowEditPage from './pages/cms/beveragePage/PlatformWorkflowEditPage';
import BeveragePlatformWorkflowViewPage from './pages/cms/beveragePage/PlatformWorkflowViewPage';
import BeverageCoverageSectionPage from './pages/cms/beveragePage/CoverageSectionPage';
import BeverageCoverageCategoryEditPage from './pages/cms/beveragePage/CoverageCategoryEditPage';
import BeverageCoverageCategoryViewPage from './pages/cms/beveragePage/CoverageCategoryViewPage';
import BeverageFaqSectionPage from './pages/cms/beveragePage/FaqSectionPage';
import BeverageFaqEntryEditPage from './pages/cms/beveragePage/FaqEntryEditPage';
import BeverageFaqEntryViewPage from './pages/cms/beveragePage/FaqEntryViewPage';
import BeverageCtaSectionPage from './pages/cms/beveragePage/CtaSectionPage';
import SpicesAgroPageLayout from './pages/cms/spicesAgroPage/SpicesAgroPageLayout';
import SpicesAgroHeroSectionPage from './pages/cms/spicesAgroPage/HeroSectionPage';
import SpicesAgroHeroSlideEditPage from './pages/cms/spicesAgroPage/HeroSlideEditPage';
import SpicesAgroHeroSlideViewPage from './pages/cms/spicesAgroPage/HeroSlideViewPage';
import SpicesAgroTrustSectionPage from './pages/cms/spicesAgroPage/TrustSectionPage';
import SpicesAgroTrustLogoEditPage from './pages/cms/spicesAgroPage/TrustLogoEditPage';
import SpicesAgroTrustLogoViewPage from './pages/cms/spicesAgroPage/TrustLogoViewPage';
import SpicesAgroCapabilitiesSectionPage from './pages/cms/spicesAgroPage/CapabilitiesSectionPage';
import SpicesAgroCapabilityEditPage from './pages/cms/spicesAgroPage/CapabilityEditPage';
import SpicesAgroCapabilityViewPage from './pages/cms/spicesAgroPage/CapabilityViewPage';
import SpicesAgroPlatformSectionPage from './pages/cms/spicesAgroPage/PlatformSectionPage';
import SpicesAgroPlatformGroupEditPage from './pages/cms/spicesAgroPage/PlatformGroupEditPage';
import SpicesAgroPlatformGroupViewPage from './pages/cms/spicesAgroPage/PlatformGroupViewPage';
import SpicesAgroCoverageSectionPage from './pages/cms/spicesAgroPage/CoverageSectionPage';
import SpicesAgroCoverageCategoryEditPage from './pages/cms/spicesAgroPage/CoverageCategoryEditPage';
import SpicesAgroCoverageCategoryViewPage from './pages/cms/spicesAgroPage/CoverageCategoryViewPage';
import SpicesAgroFaqSectionPage from './pages/cms/spicesAgroPage/FaqSectionPage';
import SpicesAgroFaqEntryEditPage from './pages/cms/spicesAgroPage/FaqEntryEditPage';
import SpicesAgroFaqEntryViewPage from './pages/cms/spicesAgroPage/FaqEntryViewPage';
import SpicesAgroCtaSectionPage from './pages/cms/spicesAgroPage/CtaSectionPage';
import QsrFranchisePageLayout from './pages/cms/qsrFranchisePage/QsrFranchisePageLayout';
import QsrFranchiseHeroSectionPage from './pages/cms/qsrFranchisePage/HeroSectionPage';
import QsrFranchiseHeroSlideEditPage from './pages/cms/qsrFranchisePage/HeroSlideEditPage';
import QsrFranchiseHeroSlideViewPage from './pages/cms/qsrFranchisePage/HeroSlideViewPage';
import QsrFranchiseTrustSectionPage from './pages/cms/qsrFranchisePage/TrustSectionPage';
import QsrFranchiseTrustLogoEditPage from './pages/cms/qsrFranchisePage/TrustLogoEditPage';
import QsrFranchiseTrustLogoViewPage from './pages/cms/qsrFranchisePage/TrustLogoViewPage';
import QsrFranchiseTrustStatEditPage from './pages/cms/qsrFranchisePage/TrustStatEditPage';
import QsrFranchiseTrustStatViewPage from './pages/cms/qsrFranchisePage/TrustStatViewPage';
import QsrFranchiseCapabilitiesSectionPage from './pages/cms/qsrFranchisePage/CapabilitiesSectionPage';
import QsrFranchiseCapabilityEditPage from './pages/cms/qsrFranchisePage/CapabilityEditPage';
import QsrFranchiseCapabilityViewPage from './pages/cms/qsrFranchisePage/CapabilityViewPage';
import QsrFranchisePlatformSectionPage from './pages/cms/qsrFranchisePage/PlatformSectionPage';
import QsrFranchisePlatformWorkflowEditPage from './pages/cms/qsrFranchisePage/PlatformWorkflowEditPage';
import QsrFranchisePlatformWorkflowViewPage from './pages/cms/qsrFranchisePage/PlatformWorkflowViewPage';
import QsrFranchiseCoverageSectionPage from './pages/cms/qsrFranchisePage/CoverageSectionPage';
import QsrFranchiseCoverageCategoryEditPage from './pages/cms/qsrFranchisePage/CoverageCategoryEditPage';
import QsrFranchiseCoverageCategoryViewPage from './pages/cms/qsrFranchisePage/CoverageCategoryViewPage';
import QsrFranchiseFaqSectionPage from './pages/cms/qsrFranchisePage/FaqSectionPage';
import QsrFranchiseFaqEntryEditPage from './pages/cms/qsrFranchisePage/FaqEntryEditPage';
import QsrFranchiseFaqEntryViewPage from './pages/cms/qsrFranchisePage/FaqEntryViewPage';
import QsrFranchiseCtaSectionPage from './pages/cms/qsrFranchisePage/CtaSectionPage';
import WhyUpwonPageLayout from './pages/cms/whyUpwonPage/WhyUpwonPageLayout';
import WhyUpwonHeroSectionPage from './pages/cms/whyUpwonPage/HeroSectionPage';
import WhyUpwonIndustriesSectionPage from './pages/cms/whyUpwonPage/IndustriesSectionPage';
import WhyUpwonIndustryEditPage from './pages/cms/whyUpwonPage/IndustryEditPage';
import WhyUpwonIndustryViewPage from './pages/cms/whyUpwonPage/IndustryViewPage';
import WhyUpwonTestimonialsSectionPage from './pages/cms/whyUpwonPage/TestimonialsSectionPage';
import WhyUpwonTestimonialEditPage from './pages/cms/whyUpwonPage/TestimonialEditPage';
import WhyUpwonTestimonialViewPage from './pages/cms/whyUpwonPage/TestimonialViewPage';
import WhyUpwonClientLogoEditPage from './pages/cms/whyUpwonPage/ClientLogoEditPage';
import WhyUpwonClientLogoViewPage from './pages/cms/whyUpwonPage/ClientLogoViewPage';
import WhyUpwonProofSectionPage from './pages/cms/whyUpwonPage/ProofSectionPage';
import WhyUpwonProofCalloutEditPage from './pages/cms/whyUpwonPage/ProofCalloutEditPage';
import WhyUpwonProofCalloutViewPage from './pages/cms/whyUpwonPage/ProofCalloutViewPage';
import WhyUpwonResultsSectionPage from './pages/cms/whyUpwonPage/ResultsSectionPage';
import WhyUpwonResultEditPage from './pages/cms/whyUpwonPage/ResultEditPage';
import WhyUpwonResultViewPage from './pages/cms/whyUpwonPage/ResultViewPage';
import WhyUpwonCtaSectionPage from './pages/cms/whyUpwonPage/CtaSectionPage';
import FmsFranchiseSectionPage from './pages/cms/fmsPage/FranchiseSectionPage';
import FmsVideoSectionPage from './pages/cms/fmsPage/VideoSectionPage';
import FmsIntegrationsSectionPage from './pages/cms/fmsPage/IntegrationsSectionPage';
import FmsGrowthSectionPage from './pages/cms/fmsPage/GrowthSectionPage';
import FmsAlternativesSectionPage from './pages/cms/fmsPage/AlternativesSectionPage';
import FmsOutcomesSectionPage from './pages/cms/fmsPage/OutcomesSectionPage';
import FmsOutcomeStoryEditPage from './pages/cms/fmsPage/OutcomeStoryEditPage';
import FmsOutcomeStoryViewPage from './pages/cms/fmsPage/OutcomeStoryViewPage';
import FmsOutcomeStatEditPage from './pages/cms/fmsPage/OutcomeStatEditPage';
import FmsOutcomeStatViewPage from './pages/cms/fmsPage/OutcomeStatViewPage';
import FmsAlternativesColumnEditPage from './pages/cms/fmsPage/AlternativesColumnEditPage';
import FmsAlternativesColumnViewPage from './pages/cms/fmsPage/AlternativesColumnViewPage';
import FmsAlternativesRowEditPage from './pages/cms/fmsPage/AlternativesRowEditPage';
import FmsAlternativesRowViewPage from './pages/cms/fmsPage/AlternativesRowViewPage';
import FmsGrowthTierEditPage from './pages/cms/fmsPage/GrowthTierEditPage';
import FmsGrowthTierViewPage from './pages/cms/fmsPage/GrowthTierViewPage';
import FmsGrowthFeatureEditPage from './pages/cms/fmsPage/GrowthFeatureEditPage';
import FmsGrowthFeatureViewPage from './pages/cms/fmsPage/GrowthFeatureViewPage';
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
            <Route path="growth-section" element={<FmsGrowthSectionPage />} />
            <Route path="alternatives-section" element={<FmsAlternativesSectionPage />} />
            <Route path="outcomes-section" element={<FmsOutcomesSectionPage />} />
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
          <Route
            path="/cms/products/fms/growth-section/tiers/:id"
            element={<FmsGrowthTierEditPage />}
          />
          <Route
            path="/cms/products/fms/growth-section/tiers/:id/view"
            element={<FmsGrowthTierViewPage />}
          />
          <Route
            path="/cms/products/fms/growth-section/tiers/:tierId/features/:id"
            element={<FmsGrowthFeatureEditPage />}
          />
          <Route
            path="/cms/products/fms/growth-section/tiers/:tierId/features/:id/view"
            element={<FmsGrowthFeatureViewPage />}
          />
          <Route
            path="/cms/products/fms/alternatives-section/columns/:id"
            element={<FmsAlternativesColumnEditPage />}
          />
          <Route
            path="/cms/products/fms/alternatives-section/columns/:id/view"
            element={<FmsAlternativesColumnViewPage />}
          />
          <Route
            path="/cms/products/fms/alternatives-section/rows/:id"
            element={<FmsAlternativesRowEditPage />}
          />
          <Route
            path="/cms/products/fms/alternatives-section/rows/:id/view"
            element={<FmsAlternativesRowViewPage />}
          />
          <Route
            path="/cms/products/fms/outcomes-section/stories/:id"
            element={<FmsOutcomeStoryEditPage />}
          />
          <Route
            path="/cms/products/fms/outcomes-section/stories/:id/view"
            element={<FmsOutcomeStoryViewPage />}
          />
          <Route
            path="/cms/products/fms/outcomes-section/stories/:storyId/stats/:id"
            element={<FmsOutcomeStatEditPage />}
          />
          <Route
            path="/cms/products/fms/outcomes-section/stories/:storyId/stats/:id/view"
            element={<FmsOutcomeStatViewPage />}
          />

          {/* The POS page, laid out the same way as the FMS one. */}
          <Route path="/cms/products/pos" element={<PosPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<PosHeroSectionPage />} />
            <Route path="faq-section" element={<PosFaqSectionPage />} />
            <Route path="cta-section" element={<PosCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/products/pos/hero-section/:id"
            element={<PosHeroSlideEditPage />}
          />
          <Route
            path="/cms/products/pos/hero-section/:id/view"
            element={<PosHeroSlideViewPage />}
          />
          <Route path="/cms/products/pos/faq-section/:id" element={<PosFaqEntryEditPage />} />
          <Route
            path="/cms/products/pos/faq-section/:id/view"
            element={<PosFaqEntryViewPage />}
          />

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

          {/*
            The Engineering & Manufacturing industry page, laid out the same way
            as the product pages.
          */}
          <Route
            path="/cms/industries/engineering-manufacturing"
            element={<EngineeringManufacturingPageLayout />}
          >
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<EngineeringHeroSectionPage />} />
            <Route path="trust-section" element={<EngineeringTrustSectionPage />} />
            <Route path="capabilities-section" element={<EngineeringCapabilitiesSectionPage />} />
            <Route path="platform-section" element={<EngineeringPlatformSectionPage />} />
            <Route path="coverage-section" element={<EngineeringCoverageSectionPage />} />
            <Route path="faq-section" element={<EngineeringFaqSectionPage />} />
            <Route path="cta-section" element={<EngineeringCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/industries/engineering-manufacturing/hero-section/:id"
            element={<EngineeringHeroSlideEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/hero-section/:id/view"
            element={<EngineeringHeroSlideViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/trust-section/cards/:id"
            element={<EngineeringTrustCardEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/trust-section/cards/:id/view"
            element={<EngineeringTrustCardViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/trust-section/logos/:id"
            element={<EngineeringTrustLogoEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/trust-section/logos/:id/view"
            element={<EngineeringTrustLogoViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/capabilities-section/:id"
            element={<EngineeringCapabilityEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/capabilities-section/:id/view"
            element={<EngineeringCapabilityViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/platform-section/workflows/:id"
            element={<EngineeringPlatformWorkflowEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/platform-section/workflows/:id/view"
            element={<EngineeringPlatformWorkflowViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/coverage-section/categories/:id"
            element={<EngineeringCoverageCategoryEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/coverage-section/categories/:id/view"
            element={<EngineeringCoverageCategoryViewPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/faq-section/:id"
            element={<EngineeringFaqEntryEditPage />}
          />
          <Route
            path="/cms/industries/engineering-manufacturing/faq-section/:id/view"
            element={<EngineeringFaqEntryViewPage />}
          />

          {/* The Beverages & Juices industry page, laid out the same way. */}
          <Route path="/cms/industries/beverage" element={<BeveragePageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<BeverageHeroSectionPage />} />
            <Route path="trust-section" element={<BeverageTrustSectionPage />} />
            <Route path="capabilities-section" element={<BeverageCapabilitiesSectionPage />} />
            <Route path="platform-section" element={<BeveragePlatformSectionPage />} />
            <Route path="coverage-section" element={<BeverageCoverageSectionPage />} />
            <Route path="faq-section" element={<BeverageFaqSectionPage />} />
            <Route path="cta-section" element={<BeverageCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/industries/beverage/hero-section/:id"
            element={<BeverageHeroSlideEditPage />}
          />
          <Route
            path="/cms/industries/beverage/hero-section/:id/view"
            element={<BeverageHeroSlideViewPage />}
          />
          <Route
            path="/cms/industries/beverage/trust-section/stats/:id"
            element={<BeverageTrustStatEditPage />}
          />
          <Route
            path="/cms/industries/beverage/trust-section/stats/:id/view"
            element={<BeverageTrustStatViewPage />}
          />
          <Route
            path="/cms/industries/beverage/trust-section/logos/:id"
            element={<BeverageTrustLogoEditPage />}
          />
          <Route
            path="/cms/industries/beverage/trust-section/logos/:id/view"
            element={<BeverageTrustLogoViewPage />}
          />
          <Route
            path="/cms/industries/beverage/capabilities-section/capabilities/:id"
            element={<BeverageCapabilityEditPage />}
          />
          <Route
            path="/cms/industries/beverage/capabilities-section/capabilities/:id/view"
            element={<BeverageCapabilityViewPage />}
          />
          <Route
            path="/cms/industries/beverage/platform-section/workflows/:id"
            element={<BeveragePlatformWorkflowEditPage />}
          />
          <Route
            path="/cms/industries/beverage/platform-section/workflows/:id/view"
            element={<BeveragePlatformWorkflowViewPage />}
          />
          <Route
            path="/cms/industries/beverage/coverage-section/categories/:id"
            element={<BeverageCoverageCategoryEditPage />}
          />
          <Route
            path="/cms/industries/beverage/coverage-section/categories/:id/view"
            element={<BeverageCoverageCategoryViewPage />}
          />
          <Route
            path="/cms/industries/beverage/faq-section/:id"
            element={<BeverageFaqEntryEditPage />}
          />
          <Route
            path="/cms/industries/beverage/faq-section/:id/view"
            element={<BeverageFaqEntryViewPage />}
          />

          {/* The Spices & Agro Processing industry page, laid out the same way. */}
          <Route path="/cms/industries/spices-agro" element={<SpicesAgroPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<SpicesAgroHeroSectionPage />} />
            <Route path="trust-section" element={<SpicesAgroTrustSectionPage />} />
            <Route path="capabilities-section" element={<SpicesAgroCapabilitiesSectionPage />} />
            <Route path="platform-section" element={<SpicesAgroPlatformSectionPage />} />
            <Route path="coverage-section" element={<SpicesAgroCoverageSectionPage />} />
            <Route path="faq-section" element={<SpicesAgroFaqSectionPage />} />
            <Route path="cta-section" element={<SpicesAgroCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/industries/spices-agro/hero-section/:id"
            element={<SpicesAgroHeroSlideEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/hero-section/:id/view"
            element={<SpicesAgroHeroSlideViewPage />}
          />
          <Route
            path="/cms/industries/spices-agro/trust-section/logos/:id"
            element={<SpicesAgroTrustLogoEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/trust-section/logos/:id/view"
            element={<SpicesAgroTrustLogoViewPage />}
          />
          <Route
            path="/cms/industries/spices-agro/capabilities-section/capabilities/:id"
            element={<SpicesAgroCapabilityEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/capabilities-section/capabilities/:id/view"
            element={<SpicesAgroCapabilityViewPage />}
          />
          <Route
            path="/cms/industries/spices-agro/platform-section/groups/:id"
            element={<SpicesAgroPlatformGroupEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/platform-section/groups/:id/view"
            element={<SpicesAgroPlatformGroupViewPage />}
          />
          <Route
            path="/cms/industries/spices-agro/coverage-section/categories/:id"
            element={<SpicesAgroCoverageCategoryEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/coverage-section/categories/:id/view"
            element={<SpicesAgroCoverageCategoryViewPage />}
          />
          <Route
            path="/cms/industries/spices-agro/faq-section/:id"
            element={<SpicesAgroFaqEntryEditPage />}
          />
          <Route
            path="/cms/industries/spices-agro/faq-section/:id/view"
            element={<SpicesAgroFaqEntryViewPage />}
          />

          {/* The QSR & Franchise F&B industry page, laid out the same way. */}
          <Route path="/cms/industries/qsr-franchise" element={<QsrFranchisePageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<QsrFranchiseHeroSectionPage />} />
            <Route path="trust-section" element={<QsrFranchiseTrustSectionPage />} />
            <Route path="capabilities-section" element={<QsrFranchiseCapabilitiesSectionPage />} />
            <Route path="platform-section" element={<QsrFranchisePlatformSectionPage />} />
            <Route path="coverage-section" element={<QsrFranchiseCoverageSectionPage />} />
            <Route path="faq-section" element={<QsrFranchiseFaqSectionPage />} />
            <Route path="cta-section" element={<QsrFranchiseCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/industries/qsr-franchise/hero-section/:id"
            element={<QsrFranchiseHeroSlideEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/hero-section/:id/view"
            element={<QsrFranchiseHeroSlideViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/trust-section/logos/:id"
            element={<QsrFranchiseTrustLogoEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/trust-section/logos/:id/view"
            element={<QsrFranchiseTrustLogoViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/trust-section/stats/:id"
            element={<QsrFranchiseTrustStatEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/trust-section/stats/:id/view"
            element={<QsrFranchiseTrustStatViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/capabilities-section/capabilities/:id"
            element={<QsrFranchiseCapabilityEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/capabilities-section/capabilities/:id/view"
            element={<QsrFranchiseCapabilityViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/platform-section/workflows/:id"
            element={<QsrFranchisePlatformWorkflowEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/platform-section/workflows/:id/view"
            element={<QsrFranchisePlatformWorkflowViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/coverage-section/categories/:id"
            element={<QsrFranchiseCoverageCategoryEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/coverage-section/categories/:id/view"
            element={<QsrFranchiseCoverageCategoryViewPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/faq-section/:id"
            element={<QsrFranchiseFaqEntryEditPage />}
          />
          <Route
            path="/cms/industries/qsr-franchise/faq-section/:id/view"
            element={<QsrFranchiseFaqEntryViewPage />}
          />

          {/* The Why UpWon page, laid out the same way as the industry pages. */}
          <Route path="/cms/why-upwon" element={<WhyUpwonPageLayout />}>
            <Route index element={<Navigate to="hero-section" replace />} />
            <Route path="hero-section" element={<WhyUpwonHeroSectionPage />} />
            <Route path="industries-section" element={<WhyUpwonIndustriesSectionPage />} />
            <Route path="testimonials-section" element={<WhyUpwonTestimonialsSectionPage />} />
            <Route path="proof-section" element={<WhyUpwonProofSectionPage />} />
            <Route path="results-section" element={<WhyUpwonResultsSectionPage />} />
            <Route path="cta-section" element={<WhyUpwonCtaSectionPage />} />
          </Route>
          {/* Entry forms sit outside the layout so they get the full width. */}
          <Route
            path="/cms/why-upwon/industries-section/industries/:id"
            element={<WhyUpwonIndustryEditPage />}
          />
          <Route
            path="/cms/why-upwon/industries-section/industries/:id/view"
            element={<WhyUpwonIndustryViewPage />}
          />
          <Route
            path="/cms/why-upwon/testimonials-section/testimonials/:id"
            element={<WhyUpwonTestimonialEditPage />}
          />
          <Route
            path="/cms/why-upwon/testimonials-section/testimonials/:id/view"
            element={<WhyUpwonTestimonialViewPage />}
          />
          <Route
            path="/cms/why-upwon/testimonials-section/logos/:id"
            element={<WhyUpwonClientLogoEditPage />}
          />
          <Route
            path="/cms/why-upwon/testimonials-section/logos/:id/view"
            element={<WhyUpwonClientLogoViewPage />}
          />
          <Route
            path="/cms/why-upwon/proof-section/callouts/:id"
            element={<WhyUpwonProofCalloutEditPage />}
          />
          <Route
            path="/cms/why-upwon/proof-section/callouts/:id/view"
            element={<WhyUpwonProofCalloutViewPage />}
          />
          <Route
            path="/cms/why-upwon/results-section/results/:id"
            element={<WhyUpwonResultEditPage />}
          />
          <Route
            path="/cms/why-upwon/results-section/results/:id/view"
            element={<WhyUpwonResultViewPage />}
          />

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
