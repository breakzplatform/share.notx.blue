# Roadmap

Status as of 2026-09-29. Findings first, then a prioritized list of evolutions.

## 1. What the project is today

### Extension (`crx/`, v1.6.0)

- **Manifest V3**, one codebase for Chromium and Firefox (`browser_specific_settings.gecko`, `strict_min_version: 113.0`). `background` declares both `scripts` (Firefox) and `service_worker` (Chrome).
- **Redirect**: a static `declarativeNetRequest` rule catches `main_frame`/`sub_frame` requests matching
  `^https://(x\.com|twitter\.com).*(/intent|/share).*` and sends them to
  `https://share.notx.blue/redirect#?<original URL>`.
  The page `web/redirect.html` parses the original query and forwards to `https://bsky.app/intent/compose?text=`.
  The original URL travels in the fragment, so it never reaches the server logs, but every share still
  depends on share.notx.blue being up and reachable.
- **Toolbar button**: opens `bsky.app/intent/compose` with the active tab's title and URL.
- **Permissions**: `declarativeNetRequestWithHostAccess`, `tabs`, `activeTab`, `scripting`, host access to the
  x.com/twitter.com intent/share paths. `scripting` is unused. `tabs` is not needed for the toolbar button
  (`activeTab` already grants URL and title on click) and it triggers the "Read your browsing history" warning.
- `crx/_metadata/` (Chrome's generated ruleset index) is committed by accident.
- No tests, no build step, no README, no license file.

### Website (`web/`, Netlify)

- `index.html`: landing page (Vue 3 + vue-i18n + Tailwind from CDNs), English and Brazilian Portuguese,
  links to both stores and a down.blue banner.
- `redirect.html`: the redirect hop described above.
- `_redirects`: `/bugs`, `/bugs/br` (Tally forms) and `/crx` (GitHub tree).

### Bugs confirmed while studying (headless Chromium, v1.6.0 build)

| Bug | Cause |
|---|---|
| Share stalls on `share.notx.blue/redirect` when the text contains `%` (e.g. `100%25`) | `redirect.html` calls `decodeURIComponent` on values `URLSearchParams` already decoded, which throws `URIError` |
| Blank page when the `url` parameter is not an absolute URL | `new URL()` in `removeUtmParams` throws |
| `hashtags` and `via` are dropped | only `text` and `url` are read |
| Only `utm_*` is stripped | `fbclid`, `gclid`, `mc_eid`, etc. survive |
| Loose match | the regex accepts any x.com URL that merely contains `/intent` or `/share` anywhere, and misses `www.` and `mobile.` hosts (they only work when X itself redirects them first) |
| Total dependency on share.notx.blue | an AMO review from 2026-08-02 reports "Secure Connection Failed" on the redirect; the extension cannot work offline from its own site |

### Store listings (public data, 2026-09-29)

| Store | Users | Rating | Version |
|---|---|---|---|
| Chrome Web Store (`llobhiaihifghfpkflpmnocdhimpkobf`) | 309 | 4.4 (5 ratings) | 1.6.0, 2024-11-23 |
| Firefox AMO (`share-notx-blue`, desktop and Android) | 96 average daily users | 4.33 (6 ratings) | 1.6.0, 2024-11-22 |

AMO reviews: a 1-star from 2026-08-02 ("Secure Connection Failed", see above) and a 5-star from 2025-05-23
mentioning a conflict with the "Remove Link Tracking" extension, which strips the shared text.

GitHub: no issues, no pull requests, no repository description.

## 2. Ecosystem

### Bluesky intents

- Only `compose` is documented: `https://bsky.app/intent/compose?text=` (URL-encoded, 300 graphemes).
  The app source also reads `imageUris`/`videoUri`, but external images are filtered and only work in the native
  app, so they are useless here.
- Forks of `social-app` keep the same handler, so the same path works on them:
  `https://blacksky.community/intent/compose?text=` and `https://deer.social/intent/compose?text=`
  (confirmed in their source; the deer.social mirror was last pushed in May 2025).
  Witchsky has the handler too, its public domain is unverified.
  Graysky, Ouranos and Klearsky have no intent route in their source.
- Other networks: Mastodon `https://<instance>/share?text=` (hub: `https://share.joinmastodon.org/?text=`),
  Threads `https://www.threads.com/intent/post?text=` (documented by Meta, also takes `url`).

### Competitors

| Extension | Users | What it does that we don't |
|---|---|---|
| ShareSwitch (Chrome/Edge) | 317 | Redirects X share buttons to Bluesky, mastodon.social or Misskey.io |
| Bluesky Share Extension (BrowserNative, Chrome) | 353 | Context menu for links and selection, keyboard shortcut, custom server |
| Share on BlueSky (Chrome) | 131 | Context menu for links and selection |
| Share On Bluesky (AMO) | 51 | Posts link-card embeds |
| AddToAny (AMO) | 2,414 | Generic multi-network sharing |
| Share-to-Mastodon (AMO) | 217 | Mastodon only |
| Share₂Fedi (web) | n/a | Any Fediverse instance, no Bluesky |

Our niche, redirecting the share buttons already on the page, is shared only with ShareSwitch, and neither
supports Atmosphere clients other than bsky.app.

### Platform changes

- **Firefox**: MV3 is stable. Host permissions are granted at install since Firefox 127 but users can revoke
  them in about:addons. Redirects of navigations only need host access to the request URL, not the initiator.
- **Chrome**: `declarativeNetRequestWithHostAccess` shows no install warning; `tabs` does.
  Branded Chrome 137+ ignores `--load-extension`; testing uses Chrome for Testing / Chromium.
- **Safari**: `regexSubstitution` redirects are reported unsupported; `extensionPath` redirects to a bundled page
  are supported. A Safari port needs the redirect page inside the extension, which item 1 below provides.

## 3. Prioritized evolutions

Priority weighs user impact against effort. P1 items are implemented in the `v2` branch (extension 2.0.0).

| # | Item | Why | Effort | Priority |
|---|---|---|---|---|
| 1 | **Redirect inside the extension** (bundled `share.html` instead of share.notx.blue/redirect) | Removes the network hop and the single point of failure behind the AMO complaint, works offline, prerequisite for Safari and for client choice | S | P1 |
| 2 | **Choose the destination client** (options page): bsky.app, deer.social, Blacksky, a Mastodon instance, Threads, or a custom URL template with `{text}` | The one thing users of Atmosphere clients can't do today; ShareSwitch's main feature | S | P1 |
| 3 | **Parsing and privacy fixes**: keep `hashtags`, drop `via` (an X handle means nothing elsewhere), fix the `%` crash, strip more trackers, stricter URL match incl. `www.`/`mobile.` hosts, drop `tabs`/`scripting`, remove `_metadata` | Real bugs found above; fewer install warnings | S | P1 |
| 4 | **Context menu**: share the page, a link or the selected text, to any enabled client | Competitors all have it | S | P1 |
| 5 | **Tests and a loadable build**: unit tests for parsing, headless Chromium end-to-end test, `npm run build` producing Chrome and Firefox zips | No tests exist; stores require zips | S | P1 |
| 6 | Share to several clients at once (open one compose tab per enabled client) | Cross-posters; cheap once #2 exists | S | P2 |
| 7 | Keyboard shortcut (`commands`) for the toolbar action | Parity with BrowserNative | XS | P2 |
| 8 | Intercept other share intents (Facebook `sharer.php`, LinkedIn, Threads) as opt-in | Wider reach; needs extra host permissions, so opt-in | M | P2 |
| 9 | Grapheme counter / trim to 300 before opening Bluesky | Long titles overflow the Bluesky limit | S | P2 |
| 10 | Safari build (Xcode wrapper via `safari-web-extension-converter`) | New audience; needs a paid Apple developer account for distribution | M | P3 |
| 11 | Localize the extension UI (`_locales/en`, `_locales/pt_BR`) | The site is bilingual, the extension is not | XS | P3 |
| 12 | Website: drop runtime Tailwind/Vue CDNs for static HTML, add a FAQ (known conflict with "Remove Link Tracking"), a Safari button when #10 lands | The Tailwind Play CDN is not meant for production | S | P3 |
| 13 | Post directly through the AT Protocol (OAuth) with link-card embeds | Better posts, but needs OAuth, token storage and a real privacy review; big scope change | L | Later |

MV3 migration is not needed: the extension is already MV3 in both browsers.

## 4. Decisions for v2

- Keep the web `redirect.html` online (fixed) for old installs; v2 no longer uses it.
- The redirect rule is registered as a **dynamic** rule at install time, because a static rule cannot build an
  extension URL (the extension ID/UUID is only known at runtime).
- Only `main_frame` is intercepted. Redirecting a `sub_frame` would load a compose page inside
  an embedded widget, which is not useful.
- Mastodon uses a per-user instance field; Threads and the Atmosphere forks use their compose intents; anything
  else goes through the custom template.
- Host permissions are unchanged from 1.6.0, so the update does not trigger Chrome's "new permissions" prompt
  (which disables the extension until accepted). `www.` and `mobile.` hosts are still reached because X redirects
  them to the bare host first. `tabs` and `scripting` are dropped; `storage` and `contextMenus` add no warning.
- `hashtags` become `#tags` in the text; `via` is dropped.
