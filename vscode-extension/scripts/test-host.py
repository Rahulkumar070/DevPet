"""Run a reviewed local VSIX in an isolated VS Code profile and temporary Git repository."""
import argparse
import shutil
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("vsix", type=Path)
parser.add_argument("--code", default="code", help="Path to the desktop VS Code CLI")
args = parser.parse_args()
extension = Path(__file__).resolve().parents[1]
with TemporaryDirectory(prefix="devpet-vscode-") as temp:
    root = Path(temp)
    subprocess.run(["python3", str(extension / "scripts/check-vsix.py"), str(args.vsix)], check=True)
    with ZipFile(args.vsix) as archive:
        archive.extractall(root)
    shutil.copyfile(args.vsix, root / "fixture.vsix")
    workspace = root / "workspace"
    subprocess.run(["git", "init", "-q", str(workspace)], check=True)
    subprocess.run([args.code, "--wait", "--new-window", "--disable-extensions", "--disable-workspace-trust",
                    "--disable-telemetry", "--skip-welcome", "--skip-release-notes", "--disable-updates",
                    "--user-data-dir", str(root / "profile"), "--extensions-dir", str(root / "extensions"),
                    "--extensionDevelopmentPath=" + str(root / "extension"),
                    "--extensionTestsPath=" + str(extension / "test/host.cjs"), str(workspace)], check=True, timeout=120)
    if not (workspace / ".devpet-test-passed").exists():
        raise RuntimeError("VS Code exited before the extension host completed its checks")
    print("Passed packaged DevPet extension-host checks")
