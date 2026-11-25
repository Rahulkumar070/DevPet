export const MOOD_EMOJI: Record<string, string> = {
  excited: "✨",
  happy: "😊",
  neutral: "😐",
  hungry: "😤",
  sleepy: "😴",
};

export const SPECIES_EMOJI: Record<string, string> = {
  nullbyte: "🌑",
  gitfox: "🦊",
  stackrat: "🐀",
  hexbug: "🪲",
  loopworm: "🪱",
  compilot: "🤖",
  patchpup: "🐶",
  mergehog: "🦔",
  debugbear: "🐻",
  refactorcat: "🐱",
  binaryboa: "🐍",
  recursivefox: "🦊",
  kernelkrab: "🦀",
  deploybird: "🐦",
  segfaultdrake: "🐲",
  cloudwhale: "🐋",
  runtimelion: "🦁",
  rootwyrm: "🐉",
  voidphoenix: "🦅",
  quantumquokka: "🦘",
};

// ─── Security Scanner Patterns ────────────────────────────────────────────────

// Filenames that should NEVER be pushed to GitHub
export const SENSITIVE_FILENAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.staging",
  ".env.test",
  ".env.backup",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "id_rsa",
  "id_ed25519",
  "id_dsa",
  "id_ecdsa",
  ".aws/credentials",
  "credentials.json",
  "service-account.json",
  "google-services.json",
  "GoogleService-Info.plist",
  "secrets.json",
  "secrets.yaml",
  "secrets.yml",
  "config/master.key",
  "config/credentials.yml.enc",
  "database.yml",
  "wp-config.php",
  ".htpasswd",
  "keystore.jks",
  "*.keystore",
];

// Content patterns that indicate sensitive data inside files
export const SENSITIVE_CONTENT_PATTERNS: Array<{
  pattern: RegExp;
  label: string;
  severity: "critical" | "warning";
}> = [
  // Critical — actual keys/secrets
  {
    pattern: /(?:api[_-]?key|apikey)\s*=\s*["']?[a-zA-Z0-9_\-]{20,}/gi,
    label: "API Key",
    severity: "critical",
  },
  {
    pattern: /(?:secret|secret[_-]?key)\s*=\s*["']?[a-zA-Z0-9_\-]{20,}/gi,
    label: "Secret Key",
    severity: "critical",
  },
  {
    pattern: /(?:password|passwd|pwd)\s*=\s*["']?[^\s"']{8,}/gi,
    label: "Password",
    severity: "critical",
  },
  {
    pattern:
      /(?:token|access[_-]?token|auth[_-]?token)\s*=\s*["']?[a-zA-Z0-9_\-\.]{20,}/gi,
    label: "Auth Token",
    severity: "critical",
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    label: "Private Key",
    severity: "critical",
  },
  {
    pattern: /(?:mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi,
    label: "MongoDB URI with credentials",
    severity: "critical",
  },
  {
    pattern: /(?:postgres|postgresql|mysql):\/\/[^:]+:[^@]+@/gi,
    label: "Database URL with credentials",
    severity: "critical",
  },
  // AWS
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    label: "AWS Access Key ID",
    severity: "critical",
  },
  {
    pattern:
      /(?:aws[_-]?secret[_-]?access[_-]?key)\s*=\s*["']?[a-zA-Z0-9\/+]{40}/gi,
    label: "AWS Secret Access Key",
    severity: "critical",
  },
  // Warnings — patterns that might be sensitive
  {
    pattern: /(?:stripe[_-]?(?:secret|live|test)[_-]?key)\s*=\s*["']?sk_/gi,
    label: "Stripe Secret Key",
    severity: "critical",
  },
  {
    pattern:
      /(?:razorpay[_-]?(?:key[_-]?secret|secret))\s*=\s*["']?[a-zA-Z0-9]{20,}/gi,
    label: "Razorpay Secret",
    severity: "critical",
  },
  {
    pattern:
      /(?:anthropic[_-]?api[_-]?key|ANTHROPIC[_-]?API[_-]?KEY)\s*=\s*["']?sk-ant-/gi,
    label: "Anthropic API Key",
    severity: "critical",
  },
  {
    pattern: /(?:openai[_-]?api[_-]?key)\s*=\s*["']?sk-/gi,
    label: "OpenAI API Key",
    severity: "critical",
  },
  {
    pattern: /(?:twilio[_-]?auth[_-]?token)\s*=\s*["']?[a-zA-Z0-9]{32}/gi,
    label: "Twilio Auth Token",
    severity: "critical",
  },
  {
    pattern:
      /(?:github[_-]?(?:token|pat|personal[_-]?access[_-]?token))\s*=\s*["']?(?:ghp_|github_pat_)[a-zA-Z0-9_]+/gi,
    label: "GitHub Personal Access Token",
    severity: "critical",
  },
];

// Extensions that are always safe to push (never scan content)
export const SAFE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".mp4",
  ".mp3",
  ".wav",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
  ".sum",
];

// Directories to skip during scanning
export const SKIP_DIRECTORIES = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  ".turbo",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
];

export const PRE_PUSH_HOOK_SCRIPT = `#!/bin/sh
# DevPet Security Hook — installed by DevPet VS Code extension
# Checks for sensitive files before git push

echo "🐾 DevPet: Scanning for sensitive files..."

SENSITIVE_PATTERNS=".env .env.local .env.production .env.staging id_rsa id_ed25519 *.pem *.key credentials.json service-account.json secrets.json"

# Get list of files being pushed
FILES=$(git diff --cached --name-only 2>/dev/null || git diff HEAD~1 --name-only 2>/dev/null)

FOUND_SENSITIVE=0
SENSITIVE_FILES=""

for file in $FILES; do
  for pattern in $SENSITIVE_PATTERNS; do
    case "$file" in
      *$pattern*)
        FOUND_SENSITIVE=1
        SENSITIVE_FILES="$SENSITIVE_FILES\\n  ⚠️  $file"
        ;;
    esac
  done
done

if [ $FOUND_SENSITIVE -eq 1 ]; then
  echo ""
  echo "🛑 DevPet BLOCKED YOUR PUSH — Sensitive files detected:"
  echo "$SENSITIVE_FILES"
  echo ""
  echo "These files contain secrets and should NOT be on GitHub."
  echo ""
  echo "To fix:"
  echo "  1. Add them to .gitignore"
  echo "  2. Run: git rm --cached <filename>"
  echo "  3. Then push again"
  echo ""
  echo "To bypass (NOT recommended): git push --no-verify"
  echo ""
  exit 1
fi

echo "✅ DevPet: No sensitive files found. Clean push!"
exit 0
`;
