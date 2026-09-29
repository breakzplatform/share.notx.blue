# share.notx.blue

Browser extension that turns "Share on Twitter/X" buttons into a compose window on Bluesky, another Atmosphere
client (deer.social, Blacksky), Mastodon, Threads or any custom compose URL. Also adds a toolbar button and
context menu entries to share the current page, a link or the selected text.

- Chrome Web Store: https://chromewebstore.google.com/detail/redirect-twitter-share-to/llobhiaihifghfpkflpmnocdhimpkobf
- Firefox Add-ons: https://addons.mozilla.org/firefox/addon/share-notx-blue/
- Website: https://share.notx.blue (source in `web/`)

## Layout

- `crx/`: the extension (Manifest V3, same files for Chromium and Firefox)
- `crx/lib/share.js`: intent parsing and compose URL building, shared by every page and the tests
- `web/`: landing page and the redirect page used by extension 1.x
- `docs/ROADMAP.md`: findings and planned work

## Development

```sh
npm install
npm test            # unit tests (Node's test runner)
npx playwright install chromium
npm run test:e2e    # loads crx/ unpacked in headless Chromium
npm run build       # dist/share-notx-blue-<version>.zip
```

To try it by hand, load `crx/` as an unpacked extension (`chrome://extensions`, developer mode) or as a temporary
add-on in Firefox (`about:debugging`).
