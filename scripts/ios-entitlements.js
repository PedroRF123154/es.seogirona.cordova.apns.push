#!/usr/bin/env node
/**
 * Ensure iOS entitlements exist and are referenced by Xcode project.
 * Creates Entitlements-Debug.plist and Entitlements-Release.plist in platforms/ios/<AppName>/
 * Sets CODE_SIGN_ENTITLEMENTS for Debug/Release in platforms/ios/<AppName>.xcodeproj/project.pbxproj
 */

const fs = require("fs");
const path = require("path");

function log(msg) { console.log("[apns-entitlements] " + msg); }

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readFile(p) { return fs.readFileSync(p, "utf8"); }
function writeFile(p, c) { fs.writeFileSync(p, c, "utf8"); }

function plistContent(env) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>${env}</string>
</dict>
</plist>
`;
}

function detectIosProject(iosDir) {
  const entries = fs.readdirSync(iosDir);
  const xcodeproj = entries.find(e => e.endsWith(".xcodeproj"));
  if (!xcodeproj) return null;

  const appName = xcodeproj.replace(/\.xcodeproj$/, "");
  const pbxproj = path.join(iosDir, xcodeproj, "project.pbxproj");
  const appDir = path.join(iosDir, appName);

  if (!exists(pbxproj) || !exists(appDir)) return null;
  return { appName, pbxproj, appDir };
}

function ensureEntitlementsFiles(appDir, env) {
  const debugPlist = path.join(appDir, "Entitlements-Debug.plist");
  const releasePlist = path.join(appDir, "Entitlements-Release.plist");

  if (!exists(debugPlist)) {
    writeFile(debugPlist, plistContent(env));
    log("Created Entitlements-Debug.plist");
  }
  if (!exists(releasePlist)) {
    writeFile(releasePlist, plistContent(env));
    log("Created Entitlements-Release.plist");
  }

  // Ensure value in existing files
  for (const p of [debugPlist, releasePlist]) {
    let c = readFile(p);
    if (c.includes("<key>aps-environment</key>")) {
      c = c.replace(
        /(<key>\s*aps-environment\s*<\/key>\s*<string>)([^<]*)(<\/string>)/m,
        `$1${env}$3`
      );
      writeFile(p, c);
    }
  }

  return { debugPlist, releasePlist };
}

function setCodeSignEntitlements(pbxprojPath, appName) {
  let pbx = readFile(pbxprojPath);

  const debugValue = `${appName}/Entitlements-Debug.plist`;
  const releaseValue = `${appName}/Entitlements-Release.plist`;

  // Helper: set or insert CODE_SIGN_ENTITLEMENTS inside a buildSettings block that contains a given config name
  // We'll do a pragmatic text patch:
  // - Find XCBuildConfiguration sections
  // - For each, if name = Debug -> set CODE_SIGN_ENTITLEMENTS to debugValue
  // - If name = Release -> set to releaseValue
  //
  // This is not a full pbxproj parser, but works well for Cordova projects.

  function patchForConfig(configName, value) {
    // Match blocks like:
    // /* Debug */ = { isa = XCBuildConfiguration; buildSettings = { ... }; name = Debug; };
    // We replace/insert CODE_SIGN_ENTITLEMENTS in buildSettings.
    const re = new RegExp(
      `(\\/\\*\\s*${configName}\\s*\\*\\/\\s*=\\s*\\{[\\s\\S]*?isa\\s*=\\s*XCBuildConfiguration;[\\s\\S]*?buildSettings\\s*=\\s*\\{)([\\s\\S]*?)(\\};[\\s\\S]*?name\\s*=\\s*${configName};[\\s\\S]*?\\};)`,
      "g"
    );

    pbx = pbx.replace(re, (match, pre, settings, post) => {
      if (/CODE_SIGN_ENTITLEMENTS\s*=/.test(settings)) {
        settings = settings.replace(/CODE_SIGN_ENTITLEMENTS\s*=\s*[^;]+;/g, `CODE_SIGN_ENTITLEMENTS = ${value};`);
      } else {
        // Insert near start of settings
        settings = `\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = ${value};` + settings;
      }
      return pre + settings + post;
    });
  }

  patchForConfig("Debug", debugValue);
  patchForConfig("Release", releaseValue);

  writeFile(pbxprojPath, pbx);
  log("Patched project.pbxproj CODE_SIGN_ENTITLEMENTS for Debug/Release");
}

function readPluginVar(ctx, name, fallback) {
  // Cordova sometimes provides plugin variables here
  try {
    const vars = ctx?.opts?.plugin?.pluginInfo?._et?._root?._children || null;
    // Too brittle; rely on env if present
  } catch {}
  // Also check environment variable for convenience
  if (process.env[name]) return process.env[name];
  return fallback;
}

module.exports = function (ctx) {
  try {
    const projectRoot = ctx?.opts?.projectRoot || process.cwd();
    const iosDir = path.join(projectRoot, "platforms", "ios");
    if (!exists(iosDir)) {
      log("platforms/ios not found, skipping.");
      return;
    }

    const info = detectIosProject(iosDir);
    if (!info) {
      log("Could not detect iOS project (.xcodeproj) and app folder, skipping.");
      return;
    }

    // Best-effort env: default development
    let env = readPluginVar(ctx, "APNS_ENV", "development");
    env = (env === "production") ? "production" : "development";

    ensureEntitlementsFiles(info.appDir, env);
    setCodeSignEntitlements(info.pbxproj, info.appName);

    log(`Done. App=${info.appName} env=${env}`);
  } catch (e) {
    console.error("[apns-entitlements] ERROR:", e?.stack || e);
  }
};
