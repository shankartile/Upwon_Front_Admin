// src/lib/heading.ts

/**
 * A client-side mirror of the backend heading grammar
 * (modules/home-page/utils/heading-markup.ts).
 *
 * The API already ships the parsed `headingLines` with every slide, and the
 * saved/rendered result always comes from the server. This copy exists for one
 * job the server cannot do: previewing the heading live, character by
 * character, while the admin is still typing it and nothing has been saved.
 *
 * Keep the two grammars in step. There are only two markers:
 *
 *   a newline      -> a line break
 *   **like this**  -> the orange accent span
 */

export interface HeadingPart {
  text: string;
  accent: boolean;
}

export type HeadingLine = HeadingPart[];

const ACCENT_MARKER = '**';
/** Non-greedy, and rejects an empty body so `****` is not a valid accent. */
const ACCENT_PATTERN = /\*\*([^*]+?)\*\*/g;

const toLines = (heading: string): string[] => heading.replace(/\r\n/g, '\n').split('\n');

function parseLine(line: string): HeadingLine {
  const parts: HeadingLine = [];
  const pattern = new RegExp(ACCENT_PATTERN.source, 'g');
  let cursor = 0;

  for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
    if (match.index > cursor) {
      parts.push({ text: line.slice(cursor, match.index), accent: false });
    }
    parts.push({ text: match[1], accent: true });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    parts.push({ text: line.slice(cursor), accent: false });
  }

  // A blank line still occupies a rendered line, so it must not collapse away.
  return parts.length > 0 ? parts : [{ text: '', accent: false }];
}

/** Parses an authored heading into lines of parts, ready to render. */
export function parseHeading(heading: string): HeadingLine[] {
  return toLines(heading).map(parseLine);
}

/**
 * The heading with all markers removed - for table cells, page titles, and
 * anywhere the accent and the line breaks are noise rather than meaning.
 */
export function plainHeading(heading: string): string {
  return toLines(heading)
    .map((line) =>
      parseLine(line)
        .map((part) => part.text)
        .join(''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reports whether every accent marker is closed. The backend rejects an
 * unbalanced heading with a 422; checking here turns that into inline form
 * feedback before the admin ever hits Save.
 */
export function hasBalancedAccentMarkers(heading: string): boolean {
  return !heading.replace(ACCENT_PATTERN, '').includes(ACCENT_MARKER);
}
