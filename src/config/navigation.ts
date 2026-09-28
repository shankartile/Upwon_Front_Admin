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
  LayoutDashboard, Boxes, Building2, Mail,
  Megaphone, Users, ShieldCheck, Home, Phone, Briefcase, Handshake, Info, Share2,
  Library, Award,
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
  { label: 'HREasy Page', to: '/cms/products/hreasy' },
  { label: 'WMS Page', to: '/cms/products/wms' },
  { label: 'Vendor Portal Page', to: '/cms/products/vendor-portal' },
];

/**
 * The resource pages, each edited on its own screen.
 *
 *   Blog                    the public /blog page - its hero, the topic intro,
 *                           the category chips and the posts - at
 *                           /cms/resources/blog.
 *   Free Operational Audit  the public /free-audit page - its hero, and the
 *                           audit requests its form collects - at
 *                           /cms/resources/free-audit. Directly under Blog, as
 *                           the user asked.
 *   Knowledgebase           the public /knowledgebase pages - the hub's hero and
 *                           category cards, and every guide with its FAQs - at
 *                           /cms/resources/knowledgebase.
 *   UpWon vs SAP            the public /compare/upwon-vs-sap page - its hero,
 *                           "The straight answer" cards and the capability
 *                           table - at /cms/resources/upwon-vs-sap.
 */
const RESOURCE_PAGES: NavChild[] = [
  { label: 'Blog', to: '/cms/resources/blog' },
  { label: 'Free Operational Audit', to: '/cms/resources/free-audit' },
  { label: 'Knowledgebase', to: '/cms/resources/knowledgebase' },
  { label: 'UpWon vs SAP', to: '/cms/resources/upwon-vs-sap' },
];

/**
 * The industry landing pages, in the order the marketing site lists them.
 *
 * Same arrangement as PRODUCT_PAGES: each industry is edited on its own screen
 * of sections. Only the ones with sections built carry a `to`; the rest are
 * placeholders until their screens exist.
 */
const INDUSTRY_PAGES: NavChild[] = [
  { label: 'Engineering & Manufacturing', to: '/cms/industries/engineering-manufacturing' },
  { label: 'Bakery & Confectionery', to: '/cms/industries/bakery-confectionery' },
  { label: 'FMCG Distribution', to: '/cms/industries/fmcg-distribution' },
  { label: 'Sweets & Namkeen', to: '/cms/industries/sweets-namkeen' },
  { label: 'Food Processing', to: '/cms/industries/food-processing' },
  { label: 'Non-Food FMCG', to: '/cms/industries/non-food-fmcg' },
  { label: 'Dairy & Ice Cream', to: '/cms/industries/dairy' },
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
      // The public /clients page - above Insider, the order the site's header uses.
      { label: 'Clients', to: '/cms/clients', icon: Award },
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
      // The contact lines and social icons in the public site's footer. Directly
      // below About Us, as the user asked - the footer is on every page rather
      // than one, so it closes the run of page areas instead of joining it.
      { label: 'Social Media Links', to: '/cms/social-media-links', icon: Share2 },
      // The site's reading material, one child per resource page. Below About
      // Us, as the user asked - after Social Media Links, which already held the
      // slot directly under it. A disclosure like Products, not a link: Blog,
      // Free Operational Audit, Knowledgebase and UpWon vs SAP are the resource
      // pages with admin-driven content so far, and the others join them here
      // as they become editable.
      { label: 'Resource Page', icon: Library, children: RESOURCE_PAGES },
      /*
       * Case Studies, Testimonials and FAQs used to sit here. They were early
       * scaffold screens backed by the localStorage mock in services/crud.ts
       * rather than the API, so they showed seed data an editor could change
       * without anything reaching the site. Removed from the sidebar rather
       * than deleted: the dashboard still links to two of them, and the pages
       * are harmless where they are.
       */
    ],
  },
];

export const accountNav: NavItem[] = [
  { label: 'Profile', to: '/account/profile', icon: Users },
  { label: 'Change Password', to: '/account/password', icon: ShieldCheck },
  { label: 'Notifications', to: '/account/notifications', icon: Megaphone },
];
