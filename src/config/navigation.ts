// import {
//   LayoutDashboard, FileText, Boxes, Building2, Trophy, Mail, MessageSquareQuote,
//   HelpCircle, Scale, Calculator, Workflow, BadgeDollarSign, Handshake, Megaphone,
//   Inbox, Layers, Plug, ImageIcon, Network, Search, Settings, Users, ShieldCheck,
//   ScrollText, Palette, Globe,
//   type LucideIcon,
// } from 'lucide-react';

// export interface NavItem { label: string; to: string; icon: LucideIcon; badge?: 'new' | number }
// export interface NavGroup { label?: string; items: NavItem[] }

// export const navigation: NavGroup[] = [
//   { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
//   {
//     label: 'Content',
//     items: [
//       { label: 'Pages', to: '/cms/pages', icon: FileText },
//       { label: 'Products', to: '/cms/products', icon: Boxes },
//       { label: 'Industries', to: '/cms/industries', icon: Building2 },
//       { label: 'Case Studies', to: '/cms/case-studies', icon: Trophy },
//       { label: 'Newsletter', to: '/cms/newsletter', icon: Mail },
//       { label: 'Testimonials', to: '/cms/testimonials', icon: MessageSquareQuote },
//       { label: 'FAQs', to: '/cms/faqs', icon: HelpCircle },
//     ],
//   },
//   {
//     label: 'Marketing',
//     items: [
//       { label: 'Comparisons', to: '/cms/comparisons', icon: Scale },
//       { label: 'ROI Calculator', to: '/cms/roi-calculator', icon: Calculator },
//       { label: 'Implementation', to: '/cms/implementation', icon: Workflow },
//       { label: 'Pricing', to: '/cms/pricing', icon: BadgeDollarSign },
//       { label: 'Partners', to: '/cms/partners', icon: Handshake },
//       { label: 'Announcements', to: '/cms/announcements', icon: Megaphone },
//     ],
//   },
//   {
//     label: 'Leads',
//     items: [
//       { label: 'Demo Requests', to: '/cms/leads/demo', icon: Inbox, badge: 'new' },
//       { label: 'Free Audit', to: '/cms/leads/free-audit', icon: Inbox },
//       { label: 'Proposal', to: '/cms/leads/proposal', icon: Inbox },
//       { label: 'Contact', to: '/cms/leads/contact', icon: Inbox },
//     ],
//   },
//   {
//     label: 'Library',
//     items: [
//       { label: 'Modules', to: '/cms/modules', icon: Layers },
//       { label: 'Integrations', to: '/cms/integrations', icon: Plug },
//       { label: 'Media', to: '/cms/media', icon: ImageIcon },
//     ],
//   },
//   {
//     label: 'Structure',
//     items: [
//       { label: 'Navigation', to: '/cms/navigation', icon: Network },
//       { label: 'SEO Manager', to: '/cms/seo', icon: Search },
//     ],
//   },
//   {
//     label: 'Settings',
//     items: [
//       { label: 'General', to: '/settings/general', icon: Settings },
//       { label: 'Branding', to: '/settings/branding', icon: Palette },
//       { label: 'SEO Defaults', to: '/settings/seo', icon: Globe },
//       { label: 'Integrations', to: '/settings/integrations', icon: Plug },
//       { label: 'Users & Roles', to: '/settings/users', icon: Users },
//       { label: 'Audit Log', to: '/settings/audit-log', icon: ScrollText },
//     ],
//   },
// ];

// export const accountNav: NavItem[] = [
//   { label: 'Profile', to: '/account/profile', icon: Users },
//   { label: 'Change Password', to: '/account/password', icon: ShieldCheck },
//   { label: 'Notifications', to: '/account/notifications', icon: Megaphone },
// ];






import {
  LayoutDashboard, Boxes, Building2, Trophy, Mail, MessageSquareQuote,
  HelpCircle, Megaphone, Users, ShieldCheck, Home, Phone, Briefcase, Handshake, Info, Award,
  type LucideIcon,
} from 'lucide-react';

/**
 * An item may own a nested list instead of a destination of its own.
 *
 * Products is the case that needs it: each platform gets its own page of
 * sections, so the parent is a disclosure rather than a link. `to` is optional
 * for exactly that reason - a parent with children is somewhere you open, not
 * somewhere you go.
 */
export interface NavItem {
  label: string;
  to?: string;
  icon: LucideIcon;
  badge?: 'new' | number;
  children?: NavChild[];
}

/**
 * A child page.
 *
 * `to` is optional here too: the product pages whose sections are not built
 * yet are listed so the set reads as complete, but they are shown as
 * unavailable rather than as links that go nowhere.
 */
export interface NavChild {
  label: string;
  to?: string;
  /** Match `to` exactly, so a parent path is not lit while on a sibling below it. */
  end?: boolean;
}

export interface NavGroup { label?: string; items: NavItem[] }

/**
 * The seven platform pages, in the order the marketing site lists them.
 *
 * Only the ones with sections built carry a `to`; the rest are placeholders so
 * it is obvious what is coming and what is not yet editable.
 */
const PRODUCT_PAGES: NavChild[] = [
  { label: 'ERP Page', to: '/cms/products/erp' },
  { label: 'SFA-DMS Page', to: '/cms/products/sfa-dms' },
  { label: 'FMS Page', to: '/cms/products/fms' },
  { label: 'POS Page', to: '/cms/products/pos' },
  { label: 'HREasy Page' },
  { label: 'WMS Page' },
  { label: 'Vendor Portal Page' },
];

/**
 * The industry landing pages, in the order the marketing site lists them.
 *
 * Same convention as PRODUCT_PAGES: only the ones with sections built carry a
 * `to`; the rest are placeholders until their screens exist.
 */
const INDUSTRY_PAGES: NavChild[] = [
  { label: 'Engineering & Manufacturing', to: '/cms/industries/engineering-manufacturing' },
  { label: 'Bakery & Confectionery' },
  { label: 'FMCG Distribution' },
  { label: 'Sweets & Namkeen' },
  { label: 'Food Processing' },
  { label: 'Non-Food FMCG' },
  { label: 'Dairy' },
  { label: 'QSR & Franchise', to: '/cms/industries/qsr-franchise' },
  { label: 'Spices & Agro', to: '/cms/industries/spices-agro' },
  { label: 'Beverage', to: '/cms/industries/beverage' },
];

export const navigation: NavGroup[] = [
  { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Content',
    items: [
      { label: 'Home Page', to: '/cms/home-page', icon: Home },
      // No `to`: each product page is edited on its own screen, so the parent
      // opens the list rather than a combined one.
      { label: 'Products', icon: Boxes, children: PRODUCT_PAGES },
      // Like Products: each industry page is edited on its own screen.
      { label: 'Industries', icon: Building2, children: INDUSTRY_PAGES },
      // The public /why-upwon page, section by section.
      { label: 'Why UpWon', to: '/cms/why-upwon', icon: Award },
      { label: 'Case Studies', to: '/cms/case-studies', icon: Trophy },
      // The site still serves it at /newsletter; only the admin name changed.
      { label: 'Insider', to: '/cms/insider', icon: Mail },
      // The public /contact page, section by section.
      { label: 'Contact', to: '/cms/contact', icon: Phone },
      // The Open Roles on the public /careers page, and the applications they
      // collect. Directly below Contact: both are inboxes as much as content.
      { label: 'Career', to: '/cms/careers', icon: Briefcase },
      // The hero of the public /partners page, and the applications its form
      // collects. Directly below Career, as the user asked: the third area in a
      // row that is an inbox as much as it is content.
      { label: 'Partner Program', to: '/cms/partner-program', icon: Handshake },
      // The public /about page, section by section, and the discovery calls its
      // form books. Directly below Partner Program, as the user asked - and it
      // belongs at the end of that run for the same reason the other three are in
      // it: a page whose tabs are content, with one inbox among them.
      { label: 'About Us', to: '/cms/about', icon: Info },
      { label: 'Testimonials', to: '/cms/testimonials', icon: MessageSquareQuote },
      { label: 'FAQs', to: '/cms/faqs', icon: HelpCircle },
    ],
  },
];

export const accountNav: NavItem[] = [
  { label: 'Profile', to: '/account/profile', icon: Users },
  { label: 'Change Password', to: '/account/password', icon: ShieldCheck },
  { label: 'Notifications', to: '/account/notifications', icon: Megaphone },
];
