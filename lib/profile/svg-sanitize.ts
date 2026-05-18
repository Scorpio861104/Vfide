/**
 * SVG sanitization for avatar uploads.
 *
 * Per VFIDE_MERCHANT_PROFILE_SPEC.md §3 (avatar field) — SVG accepted because
 * the file size is small and it renders crisply at all sizes. But SVG is XML
 * and can carry script, foreignObject (which can embed HTML/JS), and event
 * handlers. Every SVG we serve has to be sanitized.
 *
 * Strategy: deny-by-default. We define allowlists for tags and attributes
 * narrow enough to render visual SVG but tight enough that there's no path
 * to script execution.
 *
 * Returns:
 *   - { ok: true, sanitized, stripped: false }   — input was clean
 *   - { ok: true, sanitized, stripped: true }    — input contained attack
 *     surface; sanitization removed it. Worth logging.
 *   - { ok: false, reason }                      — input was unsalvageable
 *     (not parseable XML, structurally invalid, oversized after strip)
 */

import DOMPurify from 'isomorphic-dompurify';

export type SanitizeResult =
  | { ok: true; sanitized: string; stripped: boolean }
  | { ok: false; reason: string };

// Tags that produce visual output but no scripting surface.
// Standard SVG drawing primitives + minimal text/structure support.
const ALLOWED_TAGS = [
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan',
  'linearGradient', 'radialGradient', 'stop',
  'pattern', 'clipPath', 'mask',
  'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode',
  'feColorMatrix', 'feComposite', 'feFlood', 'feMorphology',
];

// Attributes that affect rendering but cannot trigger script execution.
// Notably absent: anything starting with "on", "href" outside of `use` (and
// even there we restrict to local fragments via the URI filter), "style"
// with javascript:, etc.
const ALLOWED_ATTRS = [
  // Structural
  'viewBox', 'width', 'height', 'preserveAspectRatio',
  'version', 'xmlns', 'id', 'class',
  // Shape geometry
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'points', 'd',
  // Fill/stroke
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'stroke-miterlimit',
  // Opacity / display
  'opacity', 'visibility', 'display',
  // Transforms
  'transform', 'transform-origin',
  // Gradient/pattern
  'offset', 'stop-color', 'stop-opacity',
  'gradientUnits', 'gradientTransform', 'spreadMethod',
  'patternUnits', 'patternContentUnits', 'patternTransform',
  // Clipping/masking
  'clip-path', 'mask',
  // Text
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline',
  // Filter primitives
  'in', 'in2', 'result', 'stdDeviation', 'mode', 'operator',
  'flood-color', 'flood-opacity',
];

// Hard size cap. Even after sanitization, refuse oversized SVGs.
// 100 KB is generous for a profile avatar; legitimate avatars are typically
// well under 20 KB.
const MAX_SANITIZED_BYTES = 100 * 1024;

export function sanitizeSvg(input: string): SanitizeResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, reason: 'empty input' };
  }

  // Sanity check: input must declare itself as SVG. DOMPurify with the SVG
  // profile will parse HTML by default; we explicitly want SVG-only.
  // Lightweight check before invoking the expensive parser.
  if (!/<svg\b/i.test(input)) {
    return { ok: false, reason: 'no <svg> root element' };
  }

  // Catch obvious script before sanitization so we can flag stripped=true
  // even if the resulting clean SVG happens to be byte-identical (unlikely
  // but possible if the script was the only thing inside a single tag).
  const hadAttackSurface =
    /<script\b/i.test(input) ||
    /<foreignObject\b/i.test(input) ||
    /\son\w+\s*=/i.test(input) ||
    /javascript\s*:/i.test(input) ||
    /<iframe\b/i.test(input) ||
    /<object\b/i.test(input) ||
    /<embed\b/i.test(input);

  let sanitized: string;
  try {
    sanitized = DOMPurify.sanitize(input, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRS,
      // Belt + suspenders: even though we explicitly allowlist, also list the
      // most dangerous forbidden tags. Some DOMPurify versions reorder
      // precedence and this is cheap insurance.
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'link', 'meta'],
      FORBID_ATTR: ['style', 'href', 'xlink:href'], // strip even from `use` refs
      KEEP_CONTENT: false, // strip content of disallowed tags too
      // No data: URIs anywhere
      ALLOWED_URI_REGEXP: /^(?:#)/, // only same-document fragment refs
    });
  } catch (e) {
    return { ok: false, reason: `sanitize failed: ${(e as Error).message}` };
  }

  if (!sanitized || !/<svg\b/i.test(sanitized)) {
    return { ok: false, reason: 'sanitization stripped the SVG root' };
  }

  const byteLen = new TextEncoder().encode(sanitized).length;
  if (byteLen > MAX_SANITIZED_BYTES) {
    return { ok: false, reason: `sanitized SVG exceeds ${MAX_SANITIZED_BYTES} bytes (${byteLen})` };
  }

  // We compute "stripped" as: either we matched attack-surface patterns in
  // the input, OR the sanitizer changed the bytes meaningfully (more than
  // whitespace normalization). The exact bytes won't compare equal even on
  // clean input because DOMPurify normalizes whitespace and attribute order;
  // so the conservative signal is "did we detect attack patterns?"
  return { ok: true, sanitized, stripped: hadAttackSurface };
}
