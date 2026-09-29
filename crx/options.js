import { CLIENTS, buildComposeUrl, clientName, withDefaults } from "./lib/share.js";

const SAMPLE_TEXT = "Example page https://example.com/";
const textFields = ["mastodonInstance", "customName", "customTemplate"];

let settings = withDefaults(await chrome.storage.sync.get(null));

function renderClients() {
  const rows = Object.keys(CLIENTS).map((clientId) => {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = clientName(settings, clientId);
    const choice = document.createElement("td");
    const radio = Object.assign(document.createElement("input"), {
      type: "radio", name: "client", value: clientId, checked: settings.client === clientId,
    });
    radio.setAttribute("aria-label", `Default: ${name.textContent}`);
    choice.append(radio);
    const menu = document.createElement("td");
    const checkbox = Object.assign(document.createElement("input"), {
      type: "checkbox", value: clientId, checked: settings.menuClients.includes(clientId),
    });
    checkbox.setAttribute("aria-label", `Context menu: ${name.textContent}`);
    menu.append(checkbox);
    row.append(name, choice, menu);
    return row;
  });
  document.getElementById("clients").replaceChildren(...rows);
}

function renderPreview() {
  const preview = document.getElementById("preview");
  const url = buildComposeUrl(settings, settings.client, SAMPLE_TEXT);
  preview.textContent = url ?? `${clientName(settings, settings.client)} is not configured`;
  preview.classList.toggle("error", !url);
}

async function save(changes) {
  settings = { ...settings, ...changes };
  await chrome.storage.sync.set(changes);
  renderPreview();
}

for (const field of textFields) {
  const input = document.getElementById(field);
  input.value = settings[field];
  input.addEventListener("change", async () => {
    await save({ [field]: input.value.trim() });
    if (field === "customName") renderClients();
  });
}

document.getElementById("clients").addEventListener("change", ({ target }) => {
  if (target.type === "radio") {
    save({ client: target.value });
  } else {
    const checked = [...document.querySelectorAll("#clients input[type=checkbox]:checked")];
    save({ menuClients: checked.map((box) => box.value) });
  }
});

renderClients();
renderPreview();
