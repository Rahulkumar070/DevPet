"""Inspect a local npm tarball or VSIX without extracting or executing its contents."""
import gzip
import hashlib
import io
import json
import re
import sys
import tarfile
import zipfile
from pathlib import Path

MAX_INPUT = 128 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
MAX_FILES = 10000


def inventory(path):
    kind = "vsix" if path.suffix.lower() == ".vsix" else "npm"
    manifest = "extension/package.json" if kind == "vsix" else "package/package.json"
    with path.open("rb") as source:
        raw = source.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        raise ValueError("Archive exceeds the 128 MiB input limit")
    entries = []
    seen = set()
    package = None
    total = 0

    def add(name, size, open_entry):
        nonlocal total, package
        total += size
        if total > MAX_EXPANDED or len(entries) >= MAX_FILES:
            raise ValueError("Archive exceeds the review limit (256 MiB or 10,000 files)")
        if (name in seen or len(name) > 4096 or not name or "\\" in name or re.match(r"^[A-Za-z]:", name)
                or any(part in ("", ".", "..") for part in name.split("/"))):
            raise ValueError("Duplicate or ambiguous archive path")
        seen.add(name)
        if name == manifest and size > 1024 * 1024:
            raise ValueError("Package manifest exceeds 1 MiB")
        with open_entry() as stream:
            digest = hashlib.sha256()
            count = 0
            chunks = bytearray()
            while block := stream.read(65536):
                count += len(block)
                if count > size:
                    raise ValueError("Archive size mismatch")
                digest.update(block)
                if name == manifest:
                    chunks.extend(block)
            if count != size:
                raise ValueError("Truncated archive entry")
            if name == manifest:
                package = json.loads(chunks)
        entries.append({"name": name, "size": size, "hash": digest.hexdigest()})

    if kind == "vsix":
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            if len(archive.infolist()) > MAX_FILES:
                raise ValueError("Too many archive entries")
            for member in archive.infolist():
                if member.is_dir():
                    continue
                if member.external_attr >> 28 == 10:
                    raise ValueError("Symbolic links require manual review")
                add(member.filename, member.file_size, lambda: archive.open(member))
    else:
        # Bound decompression including tar metadata, padding and special headers.
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
            expanded = stream.read(MAX_EXPANDED + 1)
        if len(expanded) > MAX_EXPANDED:
            raise ValueError("Tarball exceeds the 256 MiB expanded limit")
        with tarfile.open(fileobj=io.BytesIO(expanded), mode="r:") as archive:
            for index, member in enumerate(archive):
                if index >= MAX_FILES:
                    raise ValueError("Too many archive entries")
                if member.isdir():
                    continue
                if not member.isfile() or member.issparse():
                    raise ValueError("Links and special entries require manual review")
                add(member.name, member.size, lambda: archive.extractfile(member))

    def field(key):
        value = package.get(key) if isinstance(package, dict) else None
        if not isinstance(value, str) or not value or len(value) > 214 or any(ord(c) < 32 for c in value):
            raise ValueError("Invalid package manifest field " + key)
        return value

    name = field("publisher") + "/" + field("name") if kind == "vsix" else field("name")
    return {"kind": kind, "name": name, "version": field("version"), "digest": hashlib.sha256(raw).hexdigest(), "entries": entries}


if __name__ == "__main__":
    try:
        print(json.dumps(inventory(Path(sys.argv[1])), ensure_ascii=True))
    except (OSError, ValueError, KeyError, RuntimeError, EOFError, zipfile.BadZipFile, tarfile.TarError) as exc:
        sys.exit("Cannot review archive: " + str(exc))
