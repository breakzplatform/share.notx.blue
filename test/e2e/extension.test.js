// Loads crx/ unpacked in Playwright's Chromium and checks the real redirect,
// toolbar and options flows. Compose pages are stubbed, so no network is needed.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const extensionPath = fileURLToPath(new URL("../../crx", import.meta.url));
const composeHosts = /^https:\/\/(bsky\.app|deer\.social|blacksky\.community|fosstodon\.org|www\.threads\.com)\//;

let context;
let worker;
const composeRequests = [];

before(async () => {
  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  await context.route(composeHosts, (route) => {
    composeRequests.push(route.request().url());
    route.fulfill({ contentType: "text/html", body: "<title>compose stub</title>" });
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  await waitFor(async () => (await worker.evaluate(() => chrome.declarativeNetRequest.getDynamicRules())).length > 0);
});

after(() => context?.close());

async function waitFor(check, timeout = 5000) {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function setSettings(settings) {
  await worker.evaluate(async (values) => {
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(values);
  }, settings);
}

async function shareFromPage(intentUrl) {
  composeRequests.length = 0;
  const page = await context.newPage();
  await page.goto(intentUrl).catch(() => {});
  await waitFor(() => composeRequests.length > 0);
  await page.close();
  return composeRequests[0];
}

test("redirects a Twitter intent to Bluesky inside the extension", async () => {
  await setSettings({});
  const url = await shareFromPage(
    "https://twitter.com/intent/tweet?text=Hello%20100%25%20world&url=https%3A%2F%2Fexample.com%2F%3Fa%3D1%26utm_source%3Dx&hashtags=foo",
  );
  assert.equal(url, "https://bsky.app/intent/compose?text=Hello%20100%25%20world%20https%3A%2F%2Fexample.com%2F%3Fa%3D1%20%23foo");
});

test("redirects x.com/intent/post to the chosen client", async () => {
  await setSettings({ client: "mastodon", mastodonInstance: "fosstodon.org" });
  const url = await shareFromPage("https://x.com/intent/post?text=hi");
  assert.equal(url, "https://fosstodon.org/share?text=hi");
});

test("leaves non-share intents alone", async () => {
  const page = await context.newPage();
  const requests = [];
  await page.route("https://x.com/**", (route) => {
    requests.push(route.request().url());
    route.fulfill({ contentType: "text/html", body: "x stub" });
  });
  await page.goto("https://x.com/intent/follow?screen_name=someone");
  assert.deepEqual(requests, ["https://x.com/intent/follow?screen_name=someone"]);
  await page.close();
});

test("builds context menu entries for the enabled clients", async () => {
  await setSettings({ menuClients: ["bluesky", "deer"] });
  const exists = (id) => worker.evaluate((menuId) => chrome.contextMenus.update(menuId, {}).then(() => true, () => false), id);
  await waitFor(() => exists("link:deer"));
  assert.ok(await exists("page:bluesky"));
  assert.ok(await exists("selection:deer"));
  assert.ok(!(await exists("page:threads")));
});

test("options page lists clients and saves the default", async () => {
  await setSettings({});
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.getByLabel("Default: Blacksky").check();
  await waitFor(async () => (await worker.evaluate(() => chrome.storage.sync.get("client"))).client === "blacksky");
  assert.match(await page.locator("#preview").textContent(), /^https:\/\/blacksky\.community\/intent\/compose\?text=/);
  await page.getByLabel("Context menu: Threads").check();
  await waitFor(async () =>
    (await worker.evaluate(() => chrome.storage.sync.get("menuClients"))).menuClients?.includes("threads"),
  );
  // update() rejects for unknown ids, so it doubles as an existence check.
  await waitFor(() => worker.evaluate(() => chrome.contextMenus.update("selection:threads", {}).then(() => true, () => false)));
  await page.screenshot({ path: fileURLToPath(new URL("../../dist/options.png", import.meta.url)) });
  await page.close();
});
