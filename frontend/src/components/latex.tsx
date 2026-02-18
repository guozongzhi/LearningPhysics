"use client";

import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

interface LatexProps {
  children: string;
  delimiters?: Array<{ left: string; right: string; display: boolean }>;
}

/**
 * A component to render LaTeX strings, parsing for block and inline math.
 * Note: This is a simplified parser. For production, a more robust library
 * like react-markdown with remark-math and rehype-katex would be better.
 */
export const Latex: React.FC<LatexProps> = ({ children }) => {
  // Split the text by block-level math delimiters ($$)
  const parts = children.split('$$');

  return (
    <div>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a block-level math part
          return <BlockMath key={index} math={part} />;
        } else {
          // This is a regular text part, which may contain inline math
          const inlineParts = part.split('$');
          return (
            <span key={index}>
              {inlineParts.map((inlinePart, inlineIndex) => {
                if (inlineIndex % 2 === 1) {
                  // This is an inline-level math part
                  return <InlineMath key={inlineIndex} math={inlinePart} />;
                } else {
                  // This is regular text
                  return <span key={inlineIndex}>{inlinePart}</span>;
                }
              })}
            </span>
          );
        }
      })}
    </div>
  );
};
