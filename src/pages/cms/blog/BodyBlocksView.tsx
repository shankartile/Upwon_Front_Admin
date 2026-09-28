import type { BlogBodyBlock } from '../../../types/blog';

/**
 * A post's or an article's body, read-only, block by block.
 *
 * The Blog post and the Knowledgebase article share one block grammar
 * (types/blog BlogBodyBlock - p, h2, ul, quote) and the site draws both through
 * one renderer, so their view screens share this. It shows each block as the
 * kind of thing it is - a heading as a heading, a list as a list - rather than
 * as the editor's stack of inputs. All of it is rendered as text, never as
 * markup.
 */
export function BodyBlocksView({ blocks }: { blocks: readonly BlogBodyBlock[] }) {
  if (blocks.length === 0) {
    return <p className="text-sm italic text-charcoal-light dark:text-navy-300">No body yet.</p>;
  }

  return (
    <div className="space-y-4 text-charcoal dark:text-cream-100">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h2':
            return (
              <h3 key={index} className="pt-2 text-lg font-semibold leading-snug">
                {block.text}
              </h3>
            );
          case 'p':
            return (
              <p key={index} className="whitespace-pre-line text-sm leading-relaxed">
                {block.text}
              </p>
            );
          case 'ul':
            return (
              <ul key={index} className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <blockquote
                key={index}
                className="rounded-r-lg border-l-4 border-orange-400 bg-cream-100 py-2 pl-4 pr-3 dark:bg-navy-950/50"
              >
                <p className="whitespace-pre-line text-sm italic leading-relaxed">{block.text}</p>
                {block.cite && (
                  <footer className="mt-1 text-xs text-charcoal-light dark:text-navy-300">
                    — {block.cite}
                  </footer>
                )}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
