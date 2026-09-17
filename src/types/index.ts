export type ID = string;
export type ISODate = string;
export type Status = 'draft' | 'scheduled' | 'published' | 'archived';
export type Role = 'admin' | 'editor' | 'viewer';

export interface Audit {
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy?: ID;
  updatedBy?: ID;
}

export interface Seo {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  keywords?: string[];
}

export interface MediaRef {
  id: ID;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  folder?: string;
  size?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FaqItem { id: ID; question: string; answer: string; tags?: string[]; active?: boolean }
export interface Metric { label: string; value: string; delta?: string }

export interface CmsPage extends Audit {
  id: ID;
  slug: string;
  title: string;
  status: Status;
  sectionsCount: number;
  seo: Seo;
  publishedAt?: ISODate;
}

export interface CtaButton { label: string; link: string }

export interface HeroSection {
  eyebrow: string;
  heading: string;
  subtext: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
}

export interface Product extends Audit {
  id: ID; slug: string; name: string; tagline: string; status: Status;
  category: string;
  hero: HeroSection;
  moduleIds: ID[]; integrationIds: ID[];
  faqs: FaqItem[]; seo: Seo;
}

export interface Industry extends Audit {
  id: ID; slug: string; name: string; status: Status;
  shortDesc: string; clientsCount: number;
  seo: Seo;
}

export interface CaseStudy extends Audit {
  id: ID; slug: string; client: string; industryId: ID; logoUrl?: string;
  problem: string; solution: string; results: Metric[];
  quote?: { text: string; author: string; role: string };
  status: Status; seo: Seo;
}

export interface NewsletterIssue extends Audit {
  id: ID; slug: string; title: string; coverUrl?: string;
  publishDate: ISODate; summary: string; status: Status; storyCount: number;
}

export interface NewsletterStory extends Audit {
  id: ID; issueId: ID; slug: string; title: string;
  body: string; author: string; tags: string[];
  heroImageUrl?: string; status: Status; seo: Seo;
}

export type LeadType = 'demo' | 'free-audit' | 'proposal' | 'contact' | 'partner';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
export interface Lead extends Audit {
  id: ID; type: LeadType; name: string; email: string; phone?: string;
  company?: string; message?: string; status: LeadStatus;
  source?: string; assignedTo?: ID;
}

export interface AdminUser extends Audit {
  id: ID; name: string; email: string; role: Role;
  avatarUrl?: string; active: boolean; lastLoginAt?: ISODate;
}

export interface Testimonial extends Audit {
  id: ID; quote: string; author: string; role: string; company: string;
  logoUrl?: string; rating: number; status: Status;
}

export interface ModuleItem extends Audit {
  id: ID; name: string; slug: string; description: string; category: string; iconKey: string;
  active?: boolean;
}

export interface Integration extends Audit {
  id: ID; name: string; slug: string; description: string; category: string; logoUrl?: string;
  active?: boolean;
}

export interface ComparisonRow {
  feature: string;
  upwon: string | boolean;
  rival: string | boolean;
  highlight?: boolean;
}
export interface Comparison extends Audit {
  id: ID; slug: string; rival: 'SAP' | 'Tally' | 'Others' | string;
  title: string; status: Status; rows: ComparisonRow[]; seo: Seo;
}

export interface AnnouncementBar extends Audit {
  id: ID; message: string; link?: string; cta?: string;
  startsAt?: ISODate; endsAt?: ISODate; active: boolean; variant: 'info' | 'warn' | 'promo';
}

export interface RedirectRule { id: ID; from: string; to: string; code: 301 | 302 }
