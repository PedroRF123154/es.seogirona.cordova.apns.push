#!/usr/bin/env node

/**
 * Cordova iOS entitlements helper
 * - Ensures Entitlements-Debug.plist and Entitlements-Release.plist exist
 * - Ensures aps-environment is set (development|production)
 */

const fs = require("fs");
const path = require("path");

function log(msg) {
  console.log("[apns-entitlements] " + msg);
}

function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function ensureDir(p) {
  if (!fileExists(p)) fs.mkdirSync(p, { recursive: true });
}

function plistWithAps(env) {
  // Simple plist (xml) for entitlements
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

function readEnvFromCordovaConfig(projectRoot, defaultEnv) {
  // Try read variable passed during plugin install: APNS_ENV
  // Cordova doesn't always expose variables here, so we also fallback.
  // We'll also try to infer based on build config when possible.
  return defaultEnv || "development";
}

function findIosPlatformDir(projectRoot) {
  const p = path.join(projectRoot, "platforms", "ios");
  return fileExists(p) ? p : null;
}

function findAppDir(iosPlatformDir) {
  // Find the .xcodeproj to infer app name, then locate the sibling folder
  const entries = fs.readdirSync(iosPlatformDir);
  const xcodeproj = entries.find(e => e.endsWith(".xcodeproj"));
  if (!xcodeproj) return null;

  const appName = xcodeproj.replace(/\.xcodeproj$/, "");
  const appDir = path.join(iosPlatformDir, appName);
  if (fileExists(appDir) && fs.statSync(appDir).isDirectory()) return appDir;

  // fallback: search for a folder that contains *-Info.plist
  for (const e of entries) {
    const candidate = path.join(iosPlatformDir, e);
    if (fileExists(candidate) && fs.statSync(candidate).isDirectory()) {
      const files = fs.readdirSync(candidate);
      if (files.some(f => f.endsWith("-Info.plist") || f === "Info.plist")) return candidate;
    }
  }
  return null;
}

function upsertApsEnvironment(plistPath, env) {
  // If file doesn't exist: create with aps-environment
  if (!fileExists(plistPath)) {
    fs.writeFileSync(plistPath, plistWithAps(env), "utf8");
    log(`Created ${path.basename(plistPath)} with aps-environment=${env}`);
    return;
  }

  // If exists: patch (very safely) the aps-environment string
  let content = fs.readFileSync(plistPath, "utf8");

  if (content.includes("<key>aps-environment</key>")) {
    // Replace the next <string>...</string> after aps-environment
    content = content.replace(
      /(<key>\s*aps-environment\s*<\/key>\s*<string>)([^<]*)(<\/string>)/m,
      `$1${env}$3`
    );
  } else {
    // Insert into <dict>...</dict>
    content = content.replace(
      /<dict>/m,
      `<dict>\n  <key>aps-environment</key>\n  <string>${env}</string>`
    );
  }

  fs.writeFileSync(plistPath, content, "utf8");
  log(`Updated ${path.basename(plistPath)} aps-environment=${env}`);
}

module.exports = function (ctx) {
  try {
    const projectRoot = ctx && ctx.opts && ctx.opts.projectRoot
      ? ctx.opts.projectRoot
      : process.cwd();

    const iosDir = findIosPlatformDir(projectRoot);
    if (!iosDir) {
      log("platforms/ios not found, skipping.");
      return;
    }

    const appDir = findAppDir(iosDir);
    if (!appDir) {
      log("Could not detect iOS app directory, skipping.");
      return;
    }

    // Determine desired env:
    // - If user installed plugin with --variable APNS_ENV=production -> we can’t always read it here reliably,
    //   so we keep default development and allow manual override by setting APNS_ENV in config.xml (config-file handles it)
    // In practice: config-file injection will run when files exist; this hook ensures they exist.
    const envDefault = "development";
    const env = readEnvFromCordovaConfig(projectRoot, envDefault);

    // Ensure entitlements files exist in the app folder
    const debugEnt = path.join(appDir, "Entitlements-Debug.plist");
    const releaseEnt = path.join(appDir, "Entitlements-Release.plist");

    upsertApsEnvironment(debugEnt, env);
    upsertApsEnvironment(releaseEnt, env);

    log(`Entitlements ensured in: ${appDir}`);
    log("If you install with --variable APNS_ENV=production, Cordova config-file will overwrite the value on prepare.");

  } catch (e) {
    console.error("[apns-entitlements] ERROR:", e && e.stack ? e.stack : e);
  }
};