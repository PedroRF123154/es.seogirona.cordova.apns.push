#!/usr/bin/env node
/**
 * FORCE create entitlements and FORCE reference them in Xcode project.
 *
 * Creates/overwrites:
 *   platforms/ios/<AppName>/<AppName>.entitlements
 *
 * Patches:
 *   platforms/ios/<AppName>.xcodeproj/project.pbxproj
 * to set CODE_SIGN_ENTITLEMENTS for Debug/Release:
 *   CODE_SIGN_ENTITLEMENTS = <AppName>/<AppName>.entitlements;
 */

const fs = require("fs");
const path = require("path");

function log(msg) { console.log("[apns-entitlements] " + msg); }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, c) { fs.writeFileSync(p, c, "utf8"); }

function detectIosProject(iosDir) {
  const entries = fs.readdirSync(iosDir);
  const xcodeproj = entries.find(e => e.endsWith(".xcodeproj"));
  if (!xcodeproj) return null;

  const appName = xcodeproj.replace(/\.xcodeproj$/, "");
  const pbxproj = path.join(iosDir, xcodeproj, "project.pbxproj");
  const appDir = path.join(iosDir, appName);

  if (!exists(pbxproj)) return null;
  if (!exists(appDir)) return null;

  return { appName, appDir, pbxproj };
}

function getEnv(ctx) {
  // Default development. If you want production, set env var APNS_ENV=production
  // or install plugin with --variable APNS_ENV=production (Cordova doesn't always expose it to hooks).
  let env = "development";
  if (process.env.APNS_ENV && String(process.env.APNS_ENV).toLowerCase() === "production") {
    env = "production";
  }

  // Best-effort: sometimes cordova passes opts.plugin.variables
  try {
    const v = ctx?.opts?.plugin?.variables?.APNS_ENV;
    if (v && String(v).toLowerCase() === "production") env = "production";
  } catch (_) {}

  return env;
}

function entitlementsXml(env) {
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

function forceWriteEntitlements(appDir, appName, env) {
  const entPath = path.join(appDir, `${appName}.entitlements`);
  write(entPath, entitlementsXml(env));
  log(`FORCED write: ${appName}/${appName}.entitlements (aps-environment=${env})`);
  return entPath;
}

function forcePatchPbxproj(pbxprojPath, appName) {
  let pbx = read(pbxprojPath);

  const value = `${appName}/${appName}.entitlements`;

  // Patch every XCBuildConfiguration buildSettings block for Debug/Release
  // Ensure CODE_SIGN_ENTITLEMENTS is set to value.
  function patchConfig(configName) {
    const re = new RegExp(
      `(\\/\\*\\s*${configName}\\s*\\*\\/\\s*=\\s*\\{[\\s\\S]*?isa\\s*=\\s*XCBuildConfiguration;[\\s\\S]*?buildSettings\\s*=\\s*\\{)([\\s\\S]*?)(\\};[\\s\\S]*?name\\s*=\\s*${configName};[\\s\\S]*?\\};)`,
      "g"
    );

    let changed = false;

    pbx = pbx.replace(re, (match, pre, settings, post) => {
      changed = true;

      if (/CODE_SIGN_ENTITLEMENTS\s*=/.test(settings)) {
        settings = settings.replace(/CODE_SIGN_ENTITLEMENTS\s*=\s*[^;]+;/g, `CODE_SIGN_ENTITLEMENTS = ${value};`);
      } else {
        // Insert near beginning of buildSettings dict
        settings = `\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = ${value};` + settings;
      }
      return pre + settings + post;
    });

    if (!changed) {
      log(`WARN: Could not find XCBuildConfiguration for ${configName} to patch CODE_SIGN_ENTITLEMENTS.`);
    }
  }

  patchConfig("Debug");
  patchConfig("Release");

  write(pbxprojPath, pbx);
  log(`FORCED patch: CODE_SIGN_ENTITLEMENTS = ${value} (Debug/Release)`);
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
      log("Could not detect iOS .xcodeproj and app folder, skipping.");
      return;
    }

    const env = getEnv(ctx); // development|production

    forceWriteEntitlements(info.appDir, info.appName, env);
    forcePatchPbxproj(info.pbxproj, info.appName);

    log(`DONE (App=${info.appName}, env=${env})`);
  } catch (e) {
    console.error("[apns-entitlements] ERROR:", e?.stack || e);
  }
};
