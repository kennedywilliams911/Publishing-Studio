import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes rich-text article HTML before it is stored or rendered publicly.
 * Allows the formatting the editor produces (headings, lists, blockquotes,
 * scripture blocks, links, images) while stripping scripts and dangerous attributes.
 */
export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote", "hr", "img", "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["class"],
      div: ["class"],
      blockquote: ["class"],
      p: ["class", "style"],
    },
    allowedStyles: {
      p: { "text-align": [/^left$|^right$|^center$|^justify$/] },
      "*": { "text-align": [/^left$|^right$|^center$|^justify$/] },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
