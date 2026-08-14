#!/usr/bin/env bash
#
# Build + install BodyCal on an iOS Simulator without an Apple Development
# certificate.
#
# Why this exists:
#   `npx expo run:ios` refuses to build when the generated entitlements contain
#   `com.apple.developer.applesignin` (set by ios.usesAppleSignIn in app.json)
#   unless a development signing identity exists -- even for simulator targets.
#   See node_modules/expo/node_modules/@expo/cli/build/src/run/ios/codeSigning/
#   simulatorCodeSigning.js.
#
#   Simulator builds are ad-hoc signed and need no certificate, so calling
#   xcodebuild directly sidesteps that check without touching app.json.
#
#   Once `security find-identity -v -p codesigning` reports a valid identity,
#   plain `npx expo run:ios` works again and this script is optional.
#
# Usage:
#   npm run ios:sim                 # booted simulator, else "iPhone 17 Pro"
#   npm run ios:sim -- <udid|name>  # a specific simulator
#
# Start the JS bundler separately:  npm run start:dev-client
#
set -euo pipefail

cd "$(dirname "$0")/.."

SCHEME="BodyCal"
WORKSPACE="ios/BodyCal.xcworkspace"
CONFIGURATION="${CONFIGURATION:-Debug}"
DEFAULT_DEVICE="iPhone 17 Pro"

# ---------------------------------------------------------------------------
# Environment
#
# `expo run:ios` loads .env.local and .env before invoking xcodebuild; a bare
# xcodebuild does not. Without this the @sentry/react-native build phase misses
# SENTRY_DISABLE_AUTO_UPLOAD and fails the build with
# "An organization ID or slug is required (provide with --org)".
#
# Precedence matches dotenv: existing shell env > .env.local > .env.
# Values are parsed, never sourced, so .env cannot execute shell code.
# ---------------------------------------------------------------------------
load_env_file() {
  local file="$1" line key val
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    key="${key#"${key%%[![:space:]]*}"}"   # ltrim
    key="${key#export }"
    key="${key%"${key##*[![:space:]]}"}"   # rtrim
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [[ -n "${!key+x}" ]] && continue        # already set: shell env wins
    val="${line#*=}"
    val="${val#"${val%%[![:space:]]*}"}"
    if [[ "$val" == \"*\" && ${#val} -ge 2 ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && ${#val} -ge 2 ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "$key=$val"
  done < "$file"
}

load_env_file .env.local
load_env_file .env

# A local simulator build has nothing useful to upload source maps to.
: "${SENTRY_DISABLE_AUTO_UPLOAD:=true}"
export SENTRY_DISABLE_AUTO_UPLOAD

if [[ ! -d "$WORKSPACE" ]]; then
  echo "error: $WORKSPACE missing. Run: npx expo prebuild --platform ios" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Target simulator
# ---------------------------------------------------------------------------
pick_device='
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const [wanted, fallback] = process.argv.slice(1);
  const all = Object.values(JSON.parse(s).devices).flat();
  const d = wanted
    ? all.find((x) => x.udid === wanted || x.name === wanted)
    : all.find((x) => x.state === "Booted") || all.find((x) => x.name === fallback);
  if (!d) {
    console.error(wanted
      ? `error: no available simulator matching "${wanted}"`
      : `error: no booted simulator and no "${fallback}" available`);
    process.exit(1);
  }
  process.stdout.write(d.udid);
});
'
udid=$(xcrun simctl list devices available -j \
  | node -e "$pick_device" "${1:-}" "$DEFAULT_DEVICE")

echo "==> Simulator $udid"
xcrun simctl bootstatus "$udid" -b

# ---------------------------------------------------------------------------
# Build
#
# No -derivedDataPath: Xcode's shared DerivedData is what `expo run:ios` uses,
# so the two share a build cache. Pointing it at ios/build would also drop SPM
# checkouts inside ios/, which makes Expo's config plugins warn about finding
# multiple project.pbxproj files.
# ---------------------------------------------------------------------------
build_args=(
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -configuration "$CONFIGURATION"
  -sdk iphonesimulator
  -destination "id=$udid"
  COMPILER_INDEX_STORE_ENABLE=NO
)

echo "==> Building $SCHEME ($CONFIGURATION) for iphonesimulator"
xcodebuild "${build_args[@]}" build

echo "==> Locating built app"
app_path=$(xcodebuild "${build_args[@]}" -showBuildSettings -json 2>/dev/null | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const t = JSON.parse(s).map((x) => x.buildSettings)
    .find((b) => b && b.BUILT_PRODUCTS_DIR && b.FULL_PRODUCT_NAME);
  if (!t) { console.error("error: could not resolve BUILT_PRODUCTS_DIR"); process.exit(1); }
  process.stdout.write(`${t.BUILT_PRODUCTS_DIR}/${t.FULL_PRODUCT_NAME}`);
});
')

if [[ ! -d "$app_path" ]]; then
  echo "error: build succeeded but $app_path is missing" >&2
  exit 1
fi

bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist")

echo "==> Installing $bundle_id"
xcrun simctl install "$udid" "$app_path"

echo "==> Launching $bundle_id"
xcrun simctl launch "$udid" "$bundle_id"
open -a Simulator

echo
echo "Done. Start the bundler if it is not already running:"
echo "  npm run start:dev-client"
