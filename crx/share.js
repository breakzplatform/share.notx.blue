import { buildComposeUrl, composeText, parseIntent, withDefaults } from "./lib/share.js";

const settings = withDefaults(await chrome.storage.sync.get(null));
const intent = parseIntent(location.hash.slice(1));
const target = buildComposeUrl(settings, settings.client, composeText(intent));

if (target) {
  location.replace(target);
} else {
  document.getElementById("status").textContent =
    "The selected client is not configured. Open the extension options to fix it.";
  chrome.runtime.openOptionsPage();
}
