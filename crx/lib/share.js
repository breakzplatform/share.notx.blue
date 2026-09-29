// Shared by the background worker, the redirect page, the options page and the tests.
// Must stay free of extension APIs so it runs under plain Node.

export const INTENT_URL_PATTERN =
  "^https://(?:(?:www|mobile)\\.)?(?:twitter|x)\\.com/(?:intent/(?:tweet|post)|share)(?:[/?#]|$)";

export const CLIENTS = {
  bluesky: { name: "Bluesky", template: "https://bsky.app/intent/compose?text={text}" },
  deer: { name: "deer.social", template: "https://deer.social/intent/compose?text={text}" },
  blacksky: { name: "Blacksky", template: "https://blacksky.community/intent/compose?text={text}" },
  mastodon: { name: "Mastodon", template: "https://{instance}/share?text={text}" },
  threads: { name: "Threads", template: "https://www.threads.com/intent/post?text={text}" },
  custom: { name: "Custom", template: null },
};

export const DEFAULT_SETTINGS = {
  client: "bluesky",
  menuClients: ["bluesky"],
  mastodonInstance: "mastodon.social",
  customName: "Custom",
  customTemplate: "",
};

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "twclid",
  "igshid", "mc_cid", "mc_eid", "_hsenc", "_hsmi", "ref_src", "ref_url",
]);

export function isIntentUrl(url) {
  return new RegExp(INTENT_URL_PATTERN).test(url);
}

export function parseIntent(intentUrl) {
  let params;
  try {
    params = new URL(intentUrl).searchParams;
  } catch {
    return { text: "", url: "", hashtags: [] };
  }
  const hashtags = (params.get("hashtags") ?? "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  return {
    text: (params.get("text") ?? params.get("status") ?? "").trim(),
    url: (params.get("url") ?? "").trim(),
    hashtags,
  };
}

export function stripTracking(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const keys = [...parsed.searchParams.keys()];
  const tracked = keys.filter((key) => key.startsWith("utm_") || TRACKING_PARAMS.has(key));
  if (tracked.length === 0) return url;
  tracked.forEach((key) => parsed.searchParams.delete(key));
  return parsed.toString();
}

export function composeText({ text = "", url = "", hashtags = [] }) {
  const cleanUrl = stripTracking(url);
  const parts = [text];
  if (cleanUrl && !text.includes(url) && !text.includes(cleanUrl)) parts.push(cleanUrl);
  const tags = hashtags.map((tag) => `#${tag}`).filter((tag) => !text.includes(tag));
  parts.push(...tags);
  return parts.filter(Boolean).join(" ");
}

export function normalizeInstance(instance) {
  const host = String(instance ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return /^[a-z0-9.-]+(?::\d+)?$/.test(host) && host.includes(".") ? host : null;
}

export function clientName(settings, clientId) {
  if (clientId === "custom") return settings.customName?.trim() || CLIENTS.custom.name;
  return CLIENTS[clientId]?.name ?? clientId;
}

export function buildComposeUrl(settings, clientId, text) {
  const template = clientId === "custom" ? settings.customTemplate?.trim() : CLIENTS[clientId]?.template;
  if (!template || !template.includes("{text}")) return null;
  let result = template;
  if (result.includes("{instance}")) {
    const instance = normalizeInstance(settings.mastodonInstance);
    if (!instance) return null;
    result = result.replaceAll("{instance}", instance);
  }
  result = result.replaceAll("{text}", encodeURIComponent(text));
  try {
    const { protocol } = new URL(result);
    return protocol === "https:" || protocol === "http:" ? result : null;
  } catch {
    return null;
  }
}

export function withDefaults(stored) {
  return { ...DEFAULT_SETTINGS, ...stored };
}
