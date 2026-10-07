import { Fragment, type ReactNode } from 'react';
import { parseInline, type InlineNode } from '@/lib/inline';

/** Formatted copy, rendered as React elements (never innerHTML). */
export function Inline({ text }: { text: string }) {
  return <>{renderNodes(parseInline(text))}</>;
}

function renderNodes(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>;
      case 'a': {
        const external = /^(https?:)?\/\//i.test(node.href);
        return (
          <a
            key={i}
            href={node.href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {renderNodes(node.children)}
          </a>
        );
      }
      default: {
        const Tag = node.type;
        return <Tag key={i}>{renderNodes(node.children)}</Tag>;
      }
    }
  });
}
