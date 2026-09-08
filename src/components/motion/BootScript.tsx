/**
 * Everything that has to be decided before the first pixel.
 *
 * This renders a synchronous <script> as the very first thing inside <body>,
 * so it runs while the browser is still parsing the document — before the hero
 * exists, let alone gets painted. Anything that waits for React has already
 * lost: hydration happens after the first frame is on screen.
 *
 * Two decisions live here, and they were the same bug twice.
 *
 * THEME. ThemeProvider used to add the `dark` class in an effect, which meant
 * every load painted light and then flipped once React caught up. For anyone on
 * a dark theme that is a white page for the length of hydration — about a third
 * of a second, and the most visible flaw the site had.
 *
 * BOOT GATE. Same story: the gate mounted from an effect, so the page was
 * already on screen before the door covered it.
 *
 * WHEN THE GATE SHOWS. It was once per sessionStorage, which sounded right and
 * behaved wrong: reload the tab and you never saw it again, which is exactly
 * when you go looking for it. It now plays on every full load of a public page,
 * and never inside the console or the buyer portal — an entrance is worth two
 * seconds the first time you arrive somewhere, and is an obstacle in front of
 * a screen you refresh all day. Client-side navigation cannot replay it either
 * way, because this script only runs on a real document load.
 *
 * Everything is wrapped in try/catch because localStorage throws outright in
 * some private modes, and neither a theme nor an entrance is worth taking the
 * page down for.
 */

const TOTAL_MS = 2150; // draw 1250 + door 900, matching globals.css

/* Signed-in surfaces. People refresh these; they do not want a door first. */
const APP_PREFIXES = ["/dashboard", "/buyer"];

const SCRIPT = `
(function () {
  var el = document.documentElement;

  try {
    var theme = null;
    try { theme = localStorage.getItem('inventrack-theme'); } catch (e) {}
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    if (theme === 'dark') el.classList.add('dark');

    var accent = null;
    try { accent = localStorage.getItem('inventrack-accent'); } catch (e) {}
    if (accent === 'pink') el.classList.add('pink-accent');
  } catch (e) {}

  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var path = location.pathname;
    var app = ${JSON.stringify(APP_PREFIXES)};
    for (var i = 0; i < app.length; i++) {
      if (path === app[i] || path.indexOf(app[i] + '/') === 0) return;
    }
    el.setAttribute('data-boot', 'on');
    setTimeout(function () { el.removeAttribute('data-boot'); }, ${TOTAL_MS});
  } catch (e) {}
})();
`;

export default function BootScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
