"""Verify the actual VSIX release payload before distributing it."""
import json
import re
import sys
from pathlib import PurePosixPath
from zipfile import ZipFile

with ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()
    package = json.loads(archive.read("extension/package.json"))
    required = {"extension.vsixmanifest", "[Content_Types].xml", "extension/package.json",
                "extension/" + package["main"].removeprefix("./"), "extension/images/icon.png",
                "extension/out/pushGuard.js", "extension/out/hookInstall.js", "extension/out/outgoing.js",
                "extension/out/api.js", "extension/out/companion.js", "extension/out/xp.js",
                "extension/out/security.js", "extension/out/history.js", "extension/out/constants.js",
                "extension/out/workspaceView.js", "extension/out/branchMemory.js", "extension/out/worktree.js",
                "extension/out/reviewScan.js", "extension/out/release.js", "extension/out/releaseInventory.js", "extension/resources/release_inventory.py"}
    if missing := required.difference(names):
        sys.exit("Missing runtime files: " + ", ".join(sorted(missing)))
    if len(names) != len(set(names)):
        sys.exit("Duplicate entries in VSIX")
    for name in names:
        path = PurePosixPath(name)
        if path.is_absolute() or ".." in path.parts or "\\" in name:
            sys.exit("Unexpected archive path")
        if (name.endswith((".map", ".ts", ".vsix", ".pem", ".key")) or path.name.startswith(".env")
                or ".git" in path.parts or name.startswith(("extension/src/", "extension/test/"))):
            sys.exit("Unexpected release file: " + name)
        if name.endswith((".js", ".cjs", ".mjs", ".css")):
            if re.search(rb"sourceMappingURL\s*=\s*data:", archive.read(name)):
                sys.exit("Embedded source map in " + name)
print(f"Verified DevPet {package['version']} archive ({len(names)} entries)")
