#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

/**
 * Finds all package.json files in the project, excluding node_modules.
 */
function findPackageJsons(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'docker' && !file.startsWith('.')) {
        findPackageJsons(filePath, fileList);
      }
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Checks if a version string is pinned (non-range).
 */
function isPinned(version) {
  // Check for range characters
  return (
    !version.match(/[\^~><*xy]/) && !version.includes('latest') && !version.includes('workspace:')
  );
}

function checkPinnedVersions() {
  console.log('--- Checking for Unpinned Dependencies ---');
  const packageJsons = findPackageJsons(ROOT_DIR);
  let allPinned = true;

  packageJsons.forEach((filePath) => {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const relativePath = path.relative(ROOT_DIR, filePath);
    const unpinned = [];

    ['dependencies', 'devDependencies', 'peerDependencies'].forEach((type) => {
      if (pkg[type]) {
        Object.entries(pkg[type]).forEach(([name, version]) => {
          if (!isPinned(version)) {
            unpinned.push(`${name}: ${version} (${type})`);
          }
        });
      }
    });

    if (unpinned.length > 0) {
      console.log(`\nFound unpinned versions in ${relativePath}:`);
      unpinned.forEach((msg) => console.log(`  - ${msg}`));
      allPinned = false;
    }
  });

  if (allPinned) {
    console.log('\nSuccess: All versions are pinned.');
    process.exit(0);
  } else {
    console.log('\nError: Some versions are not pinned.');
    process.exit(1);
  }
}

checkPinnedVersions();
