import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const root = process.cwd();
const vanillaDir = join(root, "vanilla", "src");
const reactDir = join(root, "react", "src");

// 1. Shared domain files that must be 100% line-ending normalized hash-identical across packages (5 files)
const IDENTICAL_DOMAIN_FILES = [
  "store.ts",
  "seed.ts",
  "chordsheet.ts",
  "backup.ts",
  "moods.ts",
];

// 2. Shared domain files that differ ONLY in storage namespace constants ("songunlocked" vs "songunlocked-react") (2 files)
const NAMESPACED_DOMAIN_FILES = ["db.ts", "autoscroll.ts"];

// 3. Test suite files that must be 100% line-ending normalized hash-identical across packages (5 files)
const GUARDED_TEST_FILES = [
  "e2e/app.spec.ts",
  "e2e/offline.spec.ts",
  "e2e/routes.spec.ts",
  "tests/backup.test.ts",
  "tests/chordsheet.test.ts",
];

// Static PWA icon assets in public/assets/ that must be byte-identical across packages (3 assets)
const ICON_ASSETS = [
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

// Vanilla-specific framework & UI files (not shared domain logic)
const VANILLA_SPECIFIC_FILES = [
  "dom.ts",
  "icons.ts",
  "main.ts",
  "ui/dialog.ts",
  "ui/select.ts",
  "ui/shell.ts",
  "ui/song-form.ts",
  "ui/tag-input.ts",
  "views/home.ts",
  "views/instruments.ts",
  "views/library.ts",
  "views/settings.ts",
  "views/song.ts",
];

// React-specific framework & UI files (not shared domain logic)
const REACT_SPECIFIC_FILES = [
  "main.tsx",
  "App.tsx",
  "components/Dialog.tsx",
  "components/Icon.tsx",
  "components/Select.tsx",
  "components/Shell.tsx",
  "components/SongForm.tsx",
  "components/TagInput.tsx",
  "components/ToastContext.tsx",
  "hooks/useHashRoute.ts",
  "hooks/useStore.ts",
  "hooks/useSwipe.ts",
  "views/HomeView.tsx",
  "views/InstrumentsView.tsx",
  "views/LibraryView.tsx",
  "views/SettingsView.tsx",
  "views/SongView.tsx",
];

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalize(content) {
  return content.replace(/\r\n/g, "\n");
}

function walkDir(dir, baseDir = dir) {
  const results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath, baseDir));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const relPath = relative(baseDir, filePath).replace(/\\/g, "/");
      results.push(relPath);
    }
  }
  return results;
}

let errors = 0;

console.log("=== Checking Domain Logic & Test Suite Synchronization ===");

// Reverse existence check: collect and report ALL missing listed files
const missingVanilla = [...IDENTICAL_DOMAIN_FILES, ...NAMESPACED_DOMAIN_FILES, ...VANILLA_SPECIFIC_FILES].filter(
  (f) => !existsSync(join(vanillaDir, f)),
);

if (missingVanilla.length > 0) {
  for (const f of missingVanilla) {
    console.error(`FAIL Listed file does not exist in vanilla/src: ${f}`);
    errors++;
  }
}

const missingReact = [...IDENTICAL_DOMAIN_FILES, ...NAMESPACED_DOMAIN_FILES, ...REACT_SPECIFIC_FILES].filter(
  (f) => !existsSync(join(reactDir, f)),
);

if (missingReact.length > 0) {
  for (const f of missingReact) {
    console.error(`FAIL Listed file does not exist in react/src: ${f}`);
    errors++;
  }
}

for (const tf of GUARDED_TEST_FILES) {
  if (!existsSync(join(root, "vanilla", tf)) || !existsSync(join(root, "react", tf))) {
    console.error(`FAIL Listed test file missing from package: ${tf}`);
    errors++;
  }
}

// 1. Recursive file tree audit for vanilla/src
const vanillaFiles = walkDir(vanillaDir);
const vanillaAccounted = new Set([
  ...IDENTICAL_DOMAIN_FILES,
  ...NAMESPACED_DOMAIN_FILES,
  ...VANILLA_SPECIFIC_FILES,
]);
const vanillaUnhandled = vanillaFiles.filter((f) => !vanillaAccounted.has(f));

if (vanillaUnhandled.length > 0) {
  console.error(
    `FAIL Unaccounted file(s) in vanilla/src: ${vanillaUnhandled.join(", ")}`,
  );
  errors++;
} else if (missingVanilla.length === 0) {
  console.log(
    `OK   All ${vanillaFiles.length} source files in vanilla/src (recursive) exist and are accounted for`,
  );
}

// 2. Recursive file tree audit for react/src
const reactFiles = walkDir(reactDir);
const reactAccounted = new Set([
  ...IDENTICAL_DOMAIN_FILES,
  ...NAMESPACED_DOMAIN_FILES,
  ...REACT_SPECIFIC_FILES,
]);
const reactUnhandled = reactFiles.filter((f) => !reactAccounted.has(f));

if (reactUnhandled.length > 0) {
  console.error(
    `FAIL Unaccounted file(s) in react/src: ${reactUnhandled.join(", ")}`,
  );
  errors++;
} else if (missingReact.length === 0) {
  console.log(
    `OK   All ${reactFiles.length} source files in react/src (recursive) exist and are accounted for`,
  );
}

// 3. Check 5 byte/line-ending normalized identical domain files
for (const file of IDENTICAL_DOMAIN_FILES) {
  const vContent = normalize(readFileSync(join(vanillaDir, file), "utf8"));
  const rContent = normalize(readFileSync(join(reactDir, file), "utf8"));
  const vHash = sha256(vContent);
  const rHash = sha256(rContent);

  if (vHash === rHash) {
    console.log(`OK   ${file} (hash: ${vHash.slice(0, 8)}) - Line-ending normalized identical`);
  } else {
    console.error(`FAIL ${file} - Files differ between vanilla and react!`);
    errors++;
  }
}

// 4. Check 2 namespaced domain files with normalized line endings
for (const file of NAMESPACED_DOMAIN_FILES) {
  const vContent = normalize(readFileSync(join(vanillaDir, file), "utf8"));
  const rContent = normalize(readFileSync(join(reactDir, file), "utf8"));

  const vNormalized = vContent.replace(/songunlocked/g, "STORAGE_NS");
  const rNormalized = rContent.replace(/songunlocked-react/g, "STORAGE_NS");

  const vHash = sha256(vNormalized);
  const rHash = sha256(rNormalized);

  if (vHash === rHash) {
    console.log(
      `OK   ${file} - Identical logic (differs only in storage namespace constant)`,
    );
  } else {
    console.error(
      `FAIL ${file} - Logic differs beyond storage namespace constant!`,
    );
    errors++;
  }
}

// 5. Check 5 guarded test suite files
for (const file of GUARDED_TEST_FILES) {
  const vSpec = normalize(readFileSync(join(root, "vanilla", file), "utf8"));
  const rSpec = normalize(readFileSync(join(root, "react", file), "utf8"));
  const vSpecHash = sha256(vSpec);
  const rSpecHash = sha256(rSpec);

  if (vSpecHash === rSpecHash) {
    console.log(
      `OK   ${file} (hash: ${vSpecHash.slice(0, 8)}) - Test suite file is identical`,
    );
  } else {
    console.error(
      `FAIL ${file} - Test suite file differs between vanilla and react!`,
    );
    errors++;
  }
}

// 6. Check static PWA icon assets in public/assets/
for (const asset of ICON_ASSETS) {
  const vPath = join(root, "vanilla", "public", asset);
  const rPath = join(root, "react", "public", asset);
  if (!existsSync(vPath) || !existsSync(rPath)) {
    console.error(`FAIL Icon asset missing: ${asset}`);
    errors++;
    continue;
  }
  const vBuf = readFileSync(vPath);
  const rBuf = readFileSync(rPath);
  const vHash = sha256(vBuf);
  const rHash = sha256(rBuf);
  if (vHash === rHash) {
    console.log(`OK   public/${asset} (hash: ${vHash.slice(0, 8)}) - Byte identical`);
  } else {
    console.error(`FAIL public/${asset} - Icon asset differs between vanilla and react!`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\nFAILED: ${errors} check(s) failed.`);
  process.exit(1);
} else {
  console.log("\nALL DOMAIN & TEST SUITE SYNCHRONIZATION CHECKS PASSED (12 guarded files verified).");
}
