#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();

/**
 * Finds all package.json files in the project, excluding node_modules.
 */
function findPackageJsons(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (
        file !== 'node_modules' &&
        file !== 'docker' &&
        !file.startsWith('.') &&
        !file.startsWith('_')
      ) {
        findPackageJsons(filePath, fileList);
      }
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  });
  return fileList;
}

/**
 * Updates and pins latest versions of all dependencies in a package.json.
 */
function pinLatestVersions() {
  console.log('--- Updating and Pinning Latest Versions ---');
  const packageJsons = findPackageJsons(ROOT_DIR);

  packageJsons.forEach((filePath) => {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const dirPath = path.dirname(filePath);
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`\nProcessing ${relativePath}...`);

    ['dependencies', 'devDependencies'].forEach((type) => {
      if (pkg[type]) {
        const deps = Object.keys(pkg[type]).filter(
          (name) => !pkg[type][name].includes('workspace:'),
        );
        if (deps.length > 0) {
          const saveFlag = type === 'devDependencies' ? '--save-dev' : '--save';
          const command = `npm install ${deps.join(' ')} ${saveFlag} --save-exact`;

          console.log(`  Updating ${type} with: ${command}`);
          try {
            // Note: npm workstations handles hoisting, but we run in the directory to find correct local peer deps
            execSync(command, { stdio: 'inherit', cwd: dirPath });
          } catch (error) {
            console.error(`  Error updating ${type} in ${relativePath}: ${error.message}`);
          }
        }
      }
    });
  });

  console.log('\nFinished updating and pinning.');
}

pinLatestVersions();
