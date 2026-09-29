/*
Share by Mourad Mokrane from Noun Project (CC BY 3.0)
https://thenounproject.com/icon/share-23580/
*/

import {
  INTENT_URL_PATTERN,
  buildComposeUrl,
  clientName,
  composeText,
  withDefaults,
} from "./lib/share.js";

const REDIRECT_RULE_ID = 1;

const MENU_CONTEXTS = {
  page: "page",
  link: "link",
  selection: "selection",
};

async function loadSettings() {
  return withDefaults(await chrome.storage.sync.get(null));
}

// A static rule cannot point at the extension's own page, because the
// extension ID (Chrome) or UUID (Firefox) is only known at runtime.
async function registerRedirectRule() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [REDIRECT_RULE_ID],
    addRules: [
      {
        id: REDIRECT_RULE_ID,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { regexSubstitution: `${chrome.runtime.getURL("share.html")}#\\0` },
        },
        condition: { regexFilter: INTENT_URL_PATTERN, resourceTypes: ["main_frame"] },
      },
    ],
  });
}

async function buildMenus() {
  const settings = await loadSettings();
  await chrome.contextMenus.removeAll();
  for (const [context, label] of Object.entries(MENU_CONTEXTS)) {
    for (const clientId of settings.menuClients) {
      chrome.contextMenus.create({
        id: `${context}:${clientId}`,
        title: `Share ${label} to ${clientName(settings, clientId)}`,
        contexts: [context],
      });
    }
  }
}

function menuText(context, info, tab) {
  if (context === "link") return composeText({ text: info.linkText ?? "", url: info.linkUrl });
  if (context === "selection") {
    return composeText({ text: `“${info.selectionText.trim()}”`, url: info.pageUrl ?? tab.url });
  }
  return composeText({ text: tab.title ?? "", url: tab.url ?? info.pageUrl });
}

async function openCompose(clientId, text, tab) {
  const settings = await loadSettings();
  const url = buildComposeUrl(settings, clientId, text);
  if (!url) {
    chrome.runtime.openOptionsPage();
    return;
  }
  chrome.tabs.create({ url, index: tab ? tab.index + 1 : undefined });
}

chrome.runtime.onInstalled.addListener(() => {
  registerRedirectRule();
  buildMenus();
});

chrome.runtime.onStartup.addListener(registerRedirectRule);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") buildMenus();
});

chrome.action.onClicked.addListener(async (tab) => {
  const settings = await loadSettings();
  openCompose(settings.client, composeText({ text: tab.title ?? "", url: tab.url ?? "" }), tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const [context, clientId] = info.menuItemId.split(":");
  openCompose(clientId, menuText(context, info, tab), tab);
});
