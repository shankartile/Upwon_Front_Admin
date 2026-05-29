import { makeCrud } from './crud';
import {
  seedPages, seedProducts, seedIndustries, seedCaseStudies,
  seedNewsletterIssues, seedNewsletterStories, seedLeads, seedUsers,
  seedTestimonials, seedFaqs, seedModules, seedIntegrations, seedComparisons,
  seedAnnouncements, seedMedia, seedRedirects,
} from '../data/seed';
import type {
  CmsPage, Product, Industry, CaseStudy, NewsletterIssue, NewsletterStory,
  Lead, AdminUser, Testimonial, ModuleItem, Integration, Comparison,
  AnnouncementBar, MediaRef, FaqItem, RedirectRule,
} from '../types';

export const pagesService = makeCrud<CmsPage>('pages', seedPages, 'pg');
export const productsService = makeCrud<Product>('products', seedProducts, 'pr');
export const industriesService = makeCrud<Industry>('industries', seedIndustries, 'in');
export const caseStudiesService = makeCrud<CaseStudy>('caseStudies', seedCaseStudies, 'cs');
export const issuesService = makeCrud<NewsletterIssue>('issues', seedNewsletterIssues, 'iss');
export const storiesService = makeCrud<NewsletterStory>('stories', seedNewsletterStories, 'st');
export const leadsService = makeCrud<Lead>('leads', seedLeads, 'ld');
export const usersService = makeCrud<AdminUser>('users', seedUsers, 'u');
export const testimonialsService = makeCrud<Testimonial>('testimonials', seedTestimonials, 'tm');
export const faqsService = makeCrud<FaqItem & { createdAt?: string; updatedAt?: string }>('faqs', seedFaqs.map((f) => ({ ...f, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })), 'fq');
export const modulesService = makeCrud<ModuleItem>('modules', seedModules, 'md');
export const integrationsService = makeCrud<Integration>('integrations', seedIntegrations, 'it');
export const comparisonsService = makeCrud<Comparison>('comparisons', seedComparisons, 'cp');
export const announcementsService = makeCrud<AnnouncementBar>('announcements', seedAnnouncements, 'an');
export const mediaService = makeCrud<MediaRef & { createdAt?: string; updatedAt?: string }>(
  'media',
  seedMedia.map((m) => ({ ...m, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
  'me',
);
export const redirectsService = makeCrud<RedirectRule & { createdAt?: string; updatedAt?: string }>(
  'redirects',
  seedRedirects.map((r) => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
  'rd',
);
