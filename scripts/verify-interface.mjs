import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Preview server startup timed out")),
      8000,
    );
    let output = "";
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Preview server exited: ${code}`));
    });
    server.stdout.on("data", (data) => {
      output += data.toString();
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
  });
  const page = await fetch(url);
  assert.equal(page.status, 200);
  const html = await page.text();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(
    new Set(ids).size,
    ids.length,
    "Unique DOM IDs preserve event routing",
  );
  for (const id of [
    "btn-1player",
    "btn-campaign",
    "btn-multiplayer",
    "btn-tutorial",
    "btn-settings-menu",
    "btn-spectate",
    "sp-display",
    "mu-display",
    "selection-info",
    "command-card-grid",
    "minimap-canvas",
  ]) {
    assert.ok(ids.includes(id), `Core game control remains present: ${id}`);
  }
  for (const [path, mime] of [
    ["/css/art-direction.css", "text/css"],
    ["/js/ui/ArtDirection.js", "text/javascript"],
    ["/js/ui/UIIcons.js", "text/javascript"],
    ["/assets/art/warzone-keyart.webp", "image/webp"],
  ]) {
    const response = await fetch(url + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("content-type"), mime, path);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length > 100, `Asset is nonempty: ${path}`);
    if (mime === "image/webp") {
      assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
      assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WEBP");
    }
  }
  console.log(
    "Interface smoke checks passed: server startup, stable controls, CSS/JS assets, and WebP serving.",
  );
} finally {
  server.kill();
}
