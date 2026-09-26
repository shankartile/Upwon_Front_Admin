import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ClientLogosCard from './ClientLogosCard';
import TestimonialsCard from './TestimonialsCard';
import TestimonialsPanelCard from './TestimonialsPanelCard';

/**
 * The customer trust & testimonials section - "Built Around the Way Modern
 * Businesses Work."
 *
 * The copy and a button beside a rotating testimonial card, over a scrolling
 * wall of client logos - and four things to edit: the copy once, the small
 * lines around it, the testimonials, and the logos.
 */
export default function WhyUpwonTestimonialsSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="why-upwon"
        sectionKey="testimonials"
        entryNoun="testimonial"
        placeholders={{
          eyebrow: 'CUSTOMER TRUST & TESTIMONIALS',
          heading: 'Built Around the Way Modern Businesses **Work.**',
          subtext:
            'From growing manufacturers to multi-plant enterprises, businesses trust UpWon to simplify operations, improve visibility, and run from one connected system.',
        }}
      />

      <TestimonialsPanelCard />
      <TestimonialsCard />
      <ClientLogosCard />
    </>
  );
}
