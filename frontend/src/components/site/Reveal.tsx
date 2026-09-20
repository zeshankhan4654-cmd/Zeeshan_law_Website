/**
 * A section that fades up as the page arrives.
 *
 * Deliberately **not** a client component and deliberately not an animation
 * library. A library applies its `initial` state as an inline style during
 * server rendering, so the page's own content is delivered at `opacity: 0`
 * and only becomes visible once JavaScript has hydrated — on a marketing
 * page that means a crawler, a slow connection or a blocked script gets a
 * blank section where the practice areas should be.
 *
 * The animation therefore lives entirely in CSS (see `.reveal` in
 * globals.css), runs on load rather than on scroll, and is skipped for
 * anyone who has asked for less motion.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`reveal ${className}`}>{children}</div>;
}
