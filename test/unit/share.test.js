import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SETTINGS,
  buildComposeUrl,
  composeText,
  isIntentUrl,
  normalizeInstance,
  parseIntent,
  stripTracking,
} from "../../crx/lib/share.js";

test("matches share intents only", () => {
  for (const url of [
    "https://twitter.com/intent/tweet?text=a",
    "https://x.com/intent/post?text=a",
    "https://x.com/intent/tweet",
    "https://twitter.com/share?url=https%3A%2F%2Fa.b",
    "https://www.twitter.com/share",
    "https://mobile.twitter.com/intent/tweet?text=a",
  ]) {
    assert.ok(isIntentUrl(url), url);
  }
  for (const url of [
    "https://x.com/intent/follow?screen_name=a",
    "https://x.com/intent/like?tweet_id=1",
    "https://x.com/someone/status/1?ref=/share",
    "https://x.com/shareholder",
    "https://notx.com/intent/tweet",
    "https://x.com.evil.example/intent/tweet",
  ]) {
    assert.ok(!isIntentUrl(url), url);
  }
});

test("parses text, url and hashtags", () => {
  const intent = parseIntent(
    "https://twitter.com/intent/tweet?text=Hello%20100%25%20world&url=https%3A%2F%2Fa.b%2F%3Fq%3D1&hashtags=foo,%23bar,&via=someone",
  );
  assert.deepEqual(intent, { text: "Hello 100% world", url: "https://a.b/?q=1", hashtags: ["foo", "bar"] });
});

test("parses legacy status parameter and invalid input", () => {
  assert.equal(parseIntent("https://twitter.com/share?status=hi").text, "hi");
  assert.deepEqual(parseIntent("not a url"), { text: "", url: "", hashtags: [] });
});

test("strips tracking parameters and keeps the rest", () => {
  assert.equal(
    stripTracking("https://a.b/p?id=7&utm_source=x&utm_medium=y&fbclid=z#top"),
    "https://a.b/p?id=7#top",
  );
  assert.equal(stripTracking("https://a.b/p?id=7"), "https://a.b/p?id=7");
  assert.equal(stripTracking("relative/path?utm_source=x"), "relative/path?utm_source=x");
});

test("composes text without duplicating the url or hashtags", () => {
  assert.equal(composeText({ text: "Title", url: "https://a.b/?utm_source=x", hashtags: ["t"] }), "Title https://a.b/ #t");
  assert.equal(composeText({ text: "Read https://a.b/ #t", url: "https://a.b/", hashtags: ["t"] }), "Read https://a.b/ #t");
  assert.equal(composeText({ url: "https://a.b/" }), "https://a.b/");
  assert.equal(composeText({}), "");
});

test("builds compose urls for every client", () => {
  const settings = { ...DEFAULT_SETTINGS, mastodonInstance: "https://Fosstodon.org/", customTemplate: "https://c.example/new?body={text}" };
  const text = "a b&c";
  assert.equal(buildComposeUrl(settings, "bluesky", text), "https://bsky.app/intent/compose?text=a%20b%26c");
  assert.equal(buildComposeUrl(settings, "deer", text), "https://deer.social/intent/compose?text=a%20b%26c");
  assert.equal(buildComposeUrl(settings, "blacksky", text), "https://blacksky.community/intent/compose?text=a%20b%26c");
  assert.equal(buildComposeUrl(settings, "mastodon", text), "https://fosstodon.org/share?text=a%20b%26c");
  assert.equal(buildComposeUrl(settings, "threads", text), "https://www.threads.com/intent/post?text=a%20b%26c");
  assert.equal(buildComposeUrl(settings, "custom", text), "https://c.example/new?body=a%20b%26c");
});

test("rejects unusable client configuration", () => {
  assert.equal(buildComposeUrl({ ...DEFAULT_SETTINGS, customTemplate: "" }, "custom", "x"), null);
  assert.equal(buildComposeUrl({ ...DEFAULT_SETTINGS, customTemplate: "https://c.example/" }, "custom", "x"), null);
  assert.equal(buildComposeUrl({ ...DEFAULT_SETTINGS, customTemplate: "javascript:alert({text})" }, "custom", "x"), null);
  assert.equal(buildComposeUrl({ ...DEFAULT_SETTINGS, mastodonInstance: "not an instance" }, "mastodon", "x"), null);
  assert.equal(buildComposeUrl(DEFAULT_SETTINGS, "unknown", "x"), null);
});

test("normalizes mastodon instances", () => {
  assert.equal(normalizeInstance("https://mastodon.social/@me"), "mastodon.social");
  assert.equal(normalizeInstance("localhost"), null);
  assert.equal(normalizeInstance(""), null);
});
