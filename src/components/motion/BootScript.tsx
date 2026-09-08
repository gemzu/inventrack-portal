/**
 * The one decision that has to happen before paint.
 *
 * This renders a synchronous <script> as the very first thing inside <body>,
 * so it runs while the browser is still parsing the document — before the hero
 * exists, let alone gets painted. It is the same trick a theme-flash guard
 * uses, and for the same reason: anything that waits for React has already
 * lost, because hydration happens after the first frame is on screen.
 *
 * All it does is set an attribute. The gate's markup and every bit of its
 * timing live in the HTML and the stylesheet, so this stays small enough to
 * inline without thinking about it.
 *
 * Two ways to not show it: the session has already seen it, or the visitor has
 * asked for less motion. The whole thing is wrapped in try/catch because
 * sessionStorage throws outright in some private modes, and a boot animation is
 * not worth taking the page down for.
 */

const TOTAL_MS = 2150; // draw 1250 + door 900, matching globals.css

const SCRIPT = `
(function () {
  try {
    var seen = false;
    try { seen = sessionStorage.getItem('invems-booted') === '1'; } catch (e) {}
    if (seen) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { sessionStorage.setItem('invems-booted', '1'); } catch (e) {}
    var el = document.documentElement;
    el.setAttribute('data-boot', 'on');
    setTimeout(function () { el.removeAttribute('data-boot'); }, ${TOTAL_MS});
  } catch (e) {}
})();
`;

export default function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
