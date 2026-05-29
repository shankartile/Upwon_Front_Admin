import {
  LayoutDashboard, FileText, Boxes, Building2, Trophy, Mail, MessageSquareQuote,
  HelpCircle, Scale, Calculator, Workflow, BadgeDollarSign, Handshake, Megaphone,
  Inbox, Layers, Plug, ImageIcon, Network, Search, Settings, Users, ShieldCheck,
  ScrollText, Palette, Globe,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem { label: string; to: string; icon: LucideIcon; badge?: 'new' | number }
export interface NavGroup { label?: string; items: NavItem[] }

export const navigation: NavGroup[] = [
  { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Content',
    items: [
      { label: 'Pages', to: '/cms/pages', icon: FileText },
      { label: 'Products', to: '/cms/products', icon: Boxes },
      { label: 'Industries', to: '/cms/industries', icon: Building2 },
      { label: 'Case Studies', to: '/cms/case-studies', icon: Trophy },
      { label: 'Newsletter', to: '/cms/newsletter', icon: Mail },
      { label: 'Testimonials', to: '/cms/testimonials', icon: MessageSquareQuote },
      { label: 'FAQs', to: '/cms/faqs', icon: HelpCircle },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Comparisons', to: '/cms/comparisons', icon: Scale },
      { label: 'ROI Calculator', to: '/cms/roi-calculator', icon: Calculator },
      { label: 'Implementation', to: '/cms/implementation', icon: Workflow },
      { label: 'Pricing', to: '/cms/pricing', icon: BadgeDollarSign },
      { label: 'Partners', to: '/cms/partners', icon: Handshake },
      { label: 'Announcements', to: '/cms/announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Leads',
    items: [
      { label: 'Demo Requests', to: '/cms/leads/demo', icon: Inbox, badge: 'new' },
      { label: 'Free Audit', to: '/cms/leads/free-audit', icon: Inbox },
      { label: 'Proposal', to: '/cms/leads/proposal', icon: Inbox },
      { label: 'Contact', to: '/cms/leads/contact', icon: Inbox },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Modules', to: '/cms/modules', icon: Layers },
      { label: 'Integrations', to: '/cms/integrations', icon: Plug },
      { label: 'Media', to: '/cms/media', icon: ImageIcon },
    ],
  },
  {
    label: 'Structure',
    items: [
      { label: 'Navigation', to: '/cms/navigation', icon: Network },
      { label: 'SEO Manager', to: '/cms/seo', icon: Search },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'General', to: '/settings/general', icon: Settings },
      { label: 'Branding', to: '/settings/branding', icon: Palette },
      { label: 'SEO Defaults', to: '/settings/seo', icon: Globe },
      { label: 'Integrations', to: '/settings/integrations', icon: Plug },
      { label: 'Users & Roles', to: '/settings/users', icon: Users },
      { label: 'Audit Log', to: '/settings/audit-log', icon: ScrollText },
    ],
  },
];

export const accountNav: NavItem[] = [
  { label: 'Profile', to: '/account/profile', icon: Users },
  { label: 'Change Password', to: '/account/password', icon: ShieldCheck },
  { label: 'Notifications', to: '/account/notifications', icon: Megaphone },
];
