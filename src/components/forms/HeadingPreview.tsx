import { useMemo } from 'react';
import { parseHeading } from '../../lib/heading';

/**
 * How the public site will set a heading, previewed while it is typed.
 *
 * Two grammars exist on the site, and a preview in the wrong one would
 * promise a rendering that never ships:
 *
 *   accent  lib/heading's markers - a newline breaks the line, **like this**
 *           takes the orange accent. The home hero and the Insider feature.
 *   emDash  HeroSlider's renderHeadline - the text before the first em-dash
 *           sits lighter and smaller, the payoff after it goes bold. No
 *           markers at all. The Insider hero.
 */
export type HeadingMarkup = 'accent' | 'emDash';

export function HeadingPreview({
  heading,
  markup = 'accent',
}: {
  heading: string;
  markup?: HeadingMarkup;
}) {
  const lines = useMemo(() => parseHeading(heading), [heading]);
  if (!heading.trim()) {
    return <span className="text-charcoal-light dark:text-navy-300">Nothing to preview yet.</span>;
  }
  if (markup === 'emDash') return <EmDashHeading heading={heading} />;
  return (
    <>
      {lines.map((parts, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && <br />}
          {parts.map((part, partIndex) =>
            part.accent ? (
              <span key={partIndex} className="text-orange-500">
                {part.text}
              </span>
            ) : (
              <span key={partIndex}>{part.text}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

/** A line-for-line mirror of renderHeadline in the site's HeroSlider.jsx. */
function EmDashHeading({ heading }: { heading: string }) {
  const i = heading.indexOf('—');
  if (i === -1) return <>{heading}</>;
  const before = heading.slice(0, i + 1); // includes the em-dash
  const after = heading.slice(i + 1).replace(/^\s+/, '');
  if (!after) return <>{heading}</>;
  return (
    <>
      <span className="text-[0.84em] font-medium">{before}</span>{' '}
      <span className="font-extrabold">{after}</span>
    </>
  );
}
