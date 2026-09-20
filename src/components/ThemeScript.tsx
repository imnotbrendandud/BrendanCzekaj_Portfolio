import { DEFAULT_THEME, THEME_SCHEDULE, THEME_STORAGE_KEY, THEMES } from '@/lib/theme';

/**
 * A blocking inline script in <head>, which is the only way to avoid a flash of
 * the wrong theme on a statically exported site: the server has no idea what
 * time it is where the visitor is, so the HTML ships with the default theme and
 * this rewrites the attribute *before the first paint*.
 *
 * Deliberately dependency-free and serialised from the same schedule constants
 * the React runtime uses, so the two can't drift.
 */
export function ThemeScript() {
  const script = `
(function(){
  try {
    var themes = ${JSON.stringify(THEMES)};
    var schedule = ${JSON.stringify(THEME_SCHEDULE)};
    var stored = null;
    try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
    var theme;
    if (stored && themes.indexOf(stored) !== -1) {
      theme = stored;
    } else {
      var hour = new Date().getHours();
      theme = ${JSON.stringify(DEFAULT_THEME)};
      for (var i = 0; i < schedule.length; i++) {
        if (hour >= schedule[i].from) theme = schedule[i].theme;
      }
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    /* Keep the server-rendered default rather than breaking the page. */
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
