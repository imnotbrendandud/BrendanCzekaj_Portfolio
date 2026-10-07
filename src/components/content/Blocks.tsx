import type { Block } from '@/content/portfolio';
import { Inline } from './Inline';

/** One block, read-only. */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return (
        <h3 className="block-heading">
          <Inline text={block.text} />
        </h3>
      );
    case 'subheading':
      return (
        <h4 className="block-subheading">
          <Inline text={block.text} />
        </h4>
      );
    case 'meta':
      return (
        <p className="block-meta">
          <Inline text={block.text} />
        </p>
      );
    case 'paragraph':
      return (
        <p className="block-paragraph">
          <Inline text={block.text} />
        </p>
      );
    case 'list':
      return (
        <ul className="block-list">
          {block.items.map((item) => (
            <li key={item.id}>
              <Inline text={item.text} />
            </li>
          ))}
        </ul>
      );
    case 'tags':
      return (
        <ul className="tags">
          {block.tags.map((tag) => (
            <li className="tag" key={tag.id}>
              {tag.text}
            </li>
          ))}
        </ul>
      );
    case 'link':
      return (
        <p className="block-link">
          <a className="project-link" href={block.href} rel="noopener noreferrer" target="_blank">
            {block.text} →
          </a>
        </p>
      );
    case 'contact':
      return (
        <p className="block-contact">
          <span className="contact-label">{block.label}</span>
          <a href={block.href} rel="noopener noreferrer">
            {block.text}
          </a>
        </p>
      );
    case 'divider':
      return <hr className="block-divider" />;
  }
}

/** A tab's blocks, read-only. Empty paragraphs are skipped on the live site. */
export function BlockList({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="blocks">
      {blocks
        .filter((block) => !isBlank(block))
        .map((block) => (
          <BlockView key={block.id} block={block} />
        ))}
    </div>
  );
}

/** A block with nothing to show, which the live site leaves out. */
function isBlank(block: Block): boolean {
  switch (block.type) {
    case 'heading':
    case 'subheading':
    case 'meta':
    case 'paragraph':
      return block.text.trim() === '';
    case 'list':
      return block.items.every((item) => item.text.trim() === '');
    case 'tags':
      return block.tags.every((tag) => tag.text.trim() === '');
    default:
      return false;
  }
}
