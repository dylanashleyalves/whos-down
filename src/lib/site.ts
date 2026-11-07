import * as WebBrowser from 'expo-web-browser';

// The app's website (docs/ on GitHub Pages): privacy policy, terms and more.
export const SITE = 'https://dylanashleyalves.github.io/whos-down';

// Opens a page in an in-app browser, so whatever is on screen stays as it was.
export function openSitePage(page: 'privacy.html' | 'terms.html') {
  return WebBrowser.openBrowserAsync(`${SITE}/${page}`);
}
