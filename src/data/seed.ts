import type {
  CmsPage, Product, Industry, CaseStudy,
  Lead, AdminUser, Testimonial, ModuleItem, Integration, Comparison,
  AnnouncementBar, MediaRef, FaqItem, RedirectRule,
} from '../types';

const now = new Date().toISOString();
const day = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

const emptySeo = (title: string) => ({ title, description: `${title} — Upwon enterprise platform.` });

export const seedUsers: AdminUser[] = [
  { id: 'u_admin', name: 'Aarav Mehta', email: 'admin@upwon.local', role: 'admin', active: true, lastLoginAt: day(0), createdAt: day(120), updatedAt: day(0) },
  { id: 'u_priya', name: 'Priya Shah', email: 'priya@upwon.local', role: 'admin', active: true, lastLoginAt: day(1), createdAt: day(90), updatedAt: day(1) },
  { id: 'u_rahul', name: 'Rahul Iyer', email: 'rahul@upwon.local', role: 'editor', active: true, lastLoginAt: day(2), createdAt: day(60), updatedAt: day(2) },
  { id: 'u_neha', name: 'Neha Kapoor', email: 'neha@upwon.local', role: 'editor', active: true, lastLoginAt: day(3), createdAt: day(40), updatedAt: day(3) },
  { id: 'u_vikram', name: 'Vikram Joshi', email: 'vikram@upwon.local', role: 'editor', active: false, lastLoginAt: day(30), createdAt: day(180), updatedAt: day(30) },
  { id: 'u_ananya', name: 'Ananya Rao', email: 'ananya@upwon.local', role: 'viewer', active: true, lastLoginAt: day(5), createdAt: day(20), updatedAt: day(5) },
];

const PAGES: Array<[string, string]> = [
  ['Home', '/'],
  ['What is Upwon', 'what-is-upwon'],
  ['Why Upwon', 'why-upwon'],
  ['Resources', 'resources'],
  ['About', 'about'],
  ['Careers', 'careers'],
  ['Contact', 'contact'],
  ['Legal', 'legal'],
  ['404', '404'],
];

export const seedPages: CmsPage[] = PAGES.map(([title, slug], i) => ({
  id: `pg_${i + 1}`,
  slug,
  title,
  status: i < 7 ? 'published' : 'draft',
  sectionsCount: 4 + (i % 4),
  seo: emptySeo(`${title} | Upwon`),
  publishedAt: i < 7 ? day(20 - i) : undefined,
  createdAt: day(100 - i),
  updatedAt: day(i % 9),
}));

const PRODUCTS: Array<[string, string, string]> = [
  ['UpWon ERP', 'ERP', 'Batch production, recipe BOM, multi-plant control — with FSSAI and GST built in.'],
  ['UpWon SFA-DMS', 'Sales', 'Beat plans, secondary sales and distributor stock visible on one live dashboard.'],
  ['UpWon FMS', 'Franchise', 'Franchisee onboarding, royalty, outlet POS and Swiggy / Zomato — every store in sync.'],
  ['UpWon POS', 'Retail', 'Offline-first counter billing with native Swiggy, Zomato and loyalty in one tablet.'],
  ['UpWon HREasy', 'People', 'Multi-state payroll, biometric attendance, PF / ESIC / TDS — fully automated.'],
  ['UpWon WMS', 'Warehouse', 'FEFO putaway, expiry alerts and temperature zones — built for perishable warehouses.'],
  ['UpWon Vendor Portal', 'Procurement', 'Supplier onboarding, RFQs, PO confirmation and quality self-certification, in one place.'],
];

export const seedProducts: Product[] = PRODUCTS.map(([name, cat, tagline], i) => ({
  id: `pr_${i + 1}`,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  tagline,
  status: 'published',
  category: cat,
  hero: {
    eyebrow: cat,
    heading: name,
    subtext: tagline,
    primaryCta: { label: 'Book a demo', link: '/demo' },
    secondaryCta: { label: 'Talk to sales', link: '/contact' },
  },
  moduleIds: [],
  integrationIds: [],
  faqs: [],
  seo: emptySeo(`${name} | Upwon`),
  createdAt: day(200 - i * 10),
  updatedAt: day(i),
}));

const INDUSTRIES = [
  'Manufacturing', 'Retail & E-commerce', 'Pharma & Life Sciences', 'Logistics',
  'Construction', 'Hospitality', 'Education', 'Banking & NBFC', 'Energy & Utilities', 'Public Sector',
];

export const seedIndustries: Industry[] = INDUSTRIES.map((name, i) => ({
  id: `in_${i + 1}`,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  status: i < 9 ? 'published' : 'draft',
  shortDesc: `Purpose-built workflows for ${name.toLowerCase()}.`,
  clientsCount: 8 + ((i * 7) % 40),
  seo: emptySeo(`${name} | Upwon Industries`),
  createdAt: day(160 - i * 5),
  updatedAt: day(i),
}));

export const seedCaseStudies: CaseStudy[] = [
  ['Aurora Mills', 'in_1'], ['Hexa Retail', 'in_2'], ['Vimana Pharma', 'in_3'],
  ['Sankalp Logistics', 'in_4'], ['Skyline Build', 'in_5'], ['Wandr Hotels', 'in_6'],
  ['Lumen Academy', 'in_7'], ['Trishul Bank', 'in_8'], ['Sunkraft Energy', 'in_9'],
  ['MetroGov', 'in_10'], ['Pixel Apparel', 'in_2'], ['Helix Bio', 'in_3'],
].map(([client, ind], i) => ({
  id: `cs_${i + 1}`,
  slug: String(client).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  client: String(client),
  industryId: String(ind),
  logoUrl: `https://picsum.photos/seed/${i + 10}/120/60`,
  problem: 'Fragmented systems caused reporting delays and reconciliation issues across business units.',
  solution: 'Deployed Upwon unified platform across finance, supply, and CRM with phased rollout.',
  results: [
    { label: 'Faster close', value: '63%', delta: '+18pp' },
    { label: 'Cost savings', value: '₹4.2 Cr', delta: 'YoY' },
    { label: 'On-time orders', value: '98.4%', delta: '+12pp' },
  ],
  quote: { text: 'We moved from spreadsheets to certainty in 90 days.', author: 'CFO', role: 'Finance Head' },
  status: i < 10 ? 'published' : 'draft',
  seo: emptySeo(`${client} case study | Upwon`),
  createdAt: day(140 - i * 3),
  updatedAt: day(i),
}));

const FIRST_NAMES = ['Arjun', 'Diya', 'Karan', 'Meera', 'Rohit', 'Sneha', 'Tanvi', 'Yash', 'Isha', 'Aditya'];
const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Reddy', 'Khan', 'Das', 'Bose'];
const COMPANIES = ['Acme Co', 'Globex', 'Initech', 'Soylent', 'Umbrella', 'Vandelay', 'Wayne Ent', 'Stark Ind', 'Wonka', 'Hooli'];
const LEAD_TYPES: Lead['type'][] = ['demo', 'free-audit', 'proposal', 'contact', 'partner'];
const LEAD_STATUS: Lead['status'][] = ['new', 'new', 'contacted', 'contacted', 'qualified', 'won', 'lost'];

export const seedLeads: Lead[] = Array.from({ length: 40 }, (_, i) => {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  return {
    id: `ld_${i + 1}`,
    type: LEAD_TYPES[i % LEAD_TYPES.length],
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${COMPANIES[i % COMPANIES.length].toLowerCase().replace(/\s+/g, '')}.com`,
    phone: `+91 9${(800000000 + i * 13371).toString().slice(0, 9)}`,
    company: COMPANIES[i % COMPANIES.length],
    message: 'Interested in evaluating Upwon for our next-year planning.',
    status: LEAD_STATUS[i % LEAD_STATUS.length],
    source: ['website', 'referral', 'ads', 'event'][i % 4],
    assignedTo: i % 3 === 0 ? 'u_priya' : i % 3 === 1 ? 'u_rahul' : undefined,
    createdAt: day(i),
    updatedAt: day(Math.max(0, i - 1)),
  };
});

export const seedTestimonials: Testimonial[] = Array.from({ length: 15 }, (_, i) => ({
  id: `tm_${i + 1}`,
  quote: 'Upwon unified our finance, ops and CRM stack. Reporting that took weeks now takes hours.',
  author: `${FIRST_NAMES[i % 10]} ${LAST_NAMES[(i * 2) % 10]}`,
  role: ['CFO', 'COO', 'CIO', 'VP Finance', 'Director Ops'][i % 5],
  company: COMPANIES[i % COMPANIES.length],
  logoUrl: `https://picsum.photos/seed/log${i}/120/60`,
  rating: 5,
  status: 'published',
  createdAt: day(60 - i),
  updatedAt: day(i),
}));

export const seedFaqs: FaqItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `fq_${i + 1}`,
  question: [
    'How long does Upwon implementation take?',
    'Can we migrate from Tally to Upwon?',
    'Does Upwon support multi-entity consolidation?',
    'Is Upwon cloud or on-prem?',
    'How is data secured?',
  ][i % 5],
  answer: 'Yes — covered in detail in the implementation playbook and security whitepaper.',
  tags: ['general', 'finance', 'security', 'migration', 'platform'].slice(0, (i % 3) + 1),
}));

export const seedModules: ModuleItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `md_${i + 1}`,
  name: ['GL', 'AP', 'AR', 'Inventory', 'MRP', 'WMS', 'TMS', 'Payroll', 'Recruit', 'Leave',
         'Sales', 'Service', 'Marketing', 'Projects', 'Assets', 'Treasury', 'Tax', 'Budgets', 'Reporting', 'KPI Studio'][i],
  slug: `module-${i + 1}`,
  description: 'Configurable module with rules engine and audit trail.',
  category: ['Finance', 'Supply', 'People', 'Revenue', 'Insights'][i % 5],
  iconKey: 'Layers',
  createdAt: day(200 - i),
  updatedAt: day(i),
}));

export const seedIntegrations: Integration[] = Array.from({ length: 18 }, (_, i) => ({
  id: `it_${i + 1}`,
  name: ['Tally', 'SAP', 'Salesforce', 'HubSpot', 'Zoho', 'Shopify', 'Magento', 'AWS S3',
         'GSuite', 'O365', 'Slack', 'Teams', 'WhatsApp Biz', 'GST Portal', 'NSDL', 'Razorpay', 'Stripe', 'Power BI'][i],
  slug: `integration-${i + 1}`,
  description: 'Two-way sync with field-level mapping and retry policy.',
  category: ['Accounting', 'CRM', 'Comms', 'Payments', 'Analytics'][i % 5],
  logoUrl: `https://picsum.photos/seed/int${i}/80/80`,
  createdAt: day(220 - i),
  updatedAt: day(i),
}));

export const seedMedia: MediaRef[] = Array.from({ length: 25 }, (_, i) => ({
  id: `me_${i + 1}`,
  url: `https://picsum.photos/seed/me${i}/600/400`,
  alt: `Asset ${i + 1}`,
  width: 600, height: 400,
  folder: ['Hero', 'Product', 'Industry', 'Insider', 'Misc'][i % 5],
  size: 80000 + i * 1234,
}));

export const seedComparisons: Comparison[] = [
  { id: 'cp_sap', slug: 'upwon-vs-sap', rival: 'SAP', title: 'Upwon vs SAP', status: 'published',
    rows: [
      { feature: 'Time to go live', upwon: '90 days', rival: '9–18 months', highlight: true },
      { feature: 'TCO (3 yr)', upwon: '40% lower', rival: 'Baseline', highlight: true },
      { feature: 'India localization', upwon: true, rival: 'Partial' },
      { feature: 'Mobile-first', upwon: true, rival: false },
    ], seo: emptySeo('Upwon vs SAP'), createdAt: day(30), updatedAt: day(2) },
  { id: 'cp_tally', slug: 'upwon-vs-tally', rival: 'Tally', title: 'Upwon vs Tally', status: 'published',
    rows: [
      { feature: 'Multi-entity', upwon: true, rival: false, highlight: true },
      { feature: 'Workflow engine', upwon: true, rival: false },
      { feature: 'Mobile app', upwon: true, rival: 'Limited' },
    ], seo: emptySeo('Upwon vs Tally'), createdAt: day(30), updatedAt: day(2) },
  { id: 'cp_others', slug: 'upwon-vs-others', rival: 'Others', title: 'Upwon vs Others', status: 'draft',
    rows: [{ feature: 'Platform breadth', upwon: '7 suites', rival: 'Point tools' }],
    seo: emptySeo('Upwon vs Others'), createdAt: day(30), updatedAt: day(2) },
];

export const seedAnnouncements: AnnouncementBar[] = [
  { id: 'an_1', message: 'Q4 Demo Week — book your slot', link: '/demo', cta: 'Book now',
    active: true, variant: 'promo', startsAt: day(2), endsAt: day(-7),
    createdAt: day(10), updatedAt: day(1) },
  { id: 'an_2', message: 'New: UpWon POS 2.0 is live', link: '/products/upwon-pos', cta: 'See what’s new',
    active: false, variant: 'info', createdAt: day(40), updatedAt: day(40) },
];

export const seedRedirects: RedirectRule[] = [
  { id: 'rd_1', from: '/platform', to: '/products/upwon-erp', code: 301 },
  { id: 'rd_2', from: '/case-studies', to: '/clients', code: 301 },
];

export const todayIso = now;
