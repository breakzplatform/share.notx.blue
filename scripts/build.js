// Zips crx/ into dist/ for store upload. One archive serves Chrome and Firefox.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync("crx/manifest.json", "utf8"));
const archive = `dist/share-notx-blue-${version}.zip`;

mkdirSync("dist", { recursive: true });
rmSync(archive, { force: true });
execFileSync("zip", ["-r", "-X", `../${archive}`, ".", "-x", ".*", "_metadata/*"], { cwd: "crx", stdio: "inherit" });
console.log(archive);
