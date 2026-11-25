import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readInventory, releaseReport } from "../out/releaseInventory.js";

const helper = fileURLToPath(new URL("../resources/release_inventory.py", import.meta.url));
const fixtures = `
import io, json, sys, tarfile, zipfile
from pathlib import Path
root = Path(sys.argv[1])
for fmt in ("vsix", "tgz"):
    prefix = "extension/" if fmt == "vsix" else "package/"
    for version in ("1", "2"):
        entries = {"package.json": json.dumps({"publisher":"local","name":"demo","version":version}).encode(),
                   "main.js": version.encode(), "same.txt": b"ok"}
        if version == "1": entries["old.txt"] = b"before"
        else: entries.update({"main.js.map": b"{}", "assets.zip": b"fixture","large.bin": bytes(1024*1024)})
        output = root / (version + "." + fmt)
        if fmt == "vsix":
            with zipfile.ZipFile(output, "w") as z:
                for name, data in entries.items(): z.writestr(prefix + name, data)
        else:
            with tarfile.open(output, "w:gz") as t:
                for name, data in entries.items():
                    member = tarfile.TarInfo(prefix + name); member.size = len(data)
                    t.addfile(member, io.BytesIO(data))
with zipfile.ZipFile(root / "bad.vsix", "w") as z: z.writestr("../bad", "example")
`;

test("finished VSIX and npm artifacts reveal added, removed, changed and flagged entries", async t => {
  const dir = mkdtempSync(join(tmpdir(), "devpet-releases-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync("python3", ["-c", fixtures, dir]);
  for (const type of ["vsix", "tgz"]) {
    const before = await readInventory(helper, join(dir, "1." + type));
    const after = await readInventory(helper, join(dir, "2." + type));
    assert.match(after.digest, /^[0-9a-f]{64}$/);
    const diff = releaseReport(after, before);
    assert.match(diff, /CHANGED[^\n]+main\.js"/); assert.match(diff, /ADDED[^\n]+source map/);
    assert.match(diff, /nested archive/); assert.match(diff, /grew by at least 1 MiB/);
    assert.match(diff, /REMOVED[^\n]+old\.txt/); assert.doesNotMatch(diff, /same\.txt/);
  }
  await assert.rejects(readInventory(helper, join(dir, "bad.vsix")), /ambiguous archive path/);
});
