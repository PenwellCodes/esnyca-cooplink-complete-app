const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function restartCurrentProcess(repoDir) {
  const runningUnderPm2 = process.env.pm_id !== undefined;
  if (runningUnderPm2) {
    // eslint-disable-next-line no-console
    console.log('[auto-git-pull] PM2 detected. Exiting so PM2 can restart...');
    setTimeout(() => process.exit(0), 500);
    return;
  }

  // Relaunch this same entry command when running without PM2 (e.g. npm start).
  // process.argv usually looks like: [node, index.js, ...args]
  const nodeExec = process.argv[0];
  const nodeArgs = process.argv.slice(1);
  const child = spawn(nodeExec, nodeArgs, {
    cwd: repoDir,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  // eslint-disable-next-line no-console
  console.log('[auto-git-pull] restarted app process after pulling new commits.');
  setTimeout(() => process.exit(0), 500);
}

function runGit(args, repoDir) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: repoDir });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(stderr || `git exited with code ${code}`);
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });
  });
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(stderr || `${command} exited with code ${code}`);
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });
  });
}

function readRequirementsModules(repoDir) {
  const requirementsPath = path.join(repoDir, 'requirements.txt');
  if (!fs.existsSync(requirementsPath)) return [];

  const contents = fs.readFileSync(requirementsPath, 'utf8');
  return contents
    .split(/\r?\n/)
    .map((line) => line.split('#')[0].trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function installNodeProjectDependencies(projectDir, options = {}) {
  const { useRequirementsFile = false, includeDevDependencies = true } = options;
  const hasPackageJson = fs.existsSync(path.join(projectDir, 'package.json'));
  if (!hasPackageJson) return;

  const requirementsModules = useRequirementsFile ? readRequirementsModules(projectDir) : [];
  const hasLockfile = fs.existsSync(path.join(projectDir, 'package-lock.json'));
  const omitFlag = includeDevDependencies ? [] : ['--omit=dev'];

  // eslint-disable-next-line no-console
  console.log(`[auto-git-pull] installing dependencies in ${projectDir}...`);

  if (requirementsModules.length > 0) {
    const args = ['install', ...omitFlag, '--no-save', ...requirementsModules];
    await runCommand('npm', args, projectDir);
    // eslint-disable-next-line no-console
    console.log(
      `[auto-git-pull] installed modules from requirements.txt (${requirementsModules.length})`
    );
    return;
  }

  try {
    if (hasLockfile) {
      await runCommand('npm', ['ci', ...omitFlag], projectDir);
    } else {
      await runCommand('npm', ['install', ...omitFlag], projectDir);
    }
    // eslint-disable-next-line no-console
    console.log(`[auto-git-pull] dependency installation complete in ${projectDir}.`);
  } catch (error) {
    await runCommand('npm', ['install'], projectDir);
    // eslint-disable-next-line no-console
    console.warn(
      '[auto-git-pull] fallback install used (npm install) due to previous install error:',
      error.message
    );
  }
}

async function installDependencies(repoDir) {
  const appRootDir = path.resolve(repoDir, '..');
  const isMonorepoLikeSetup = appRootDir !== repoDir;
  const requirementModules = readRequirementsModules(repoDir);
  if (requirementModules.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[auto-git-pull] requirements.txt not found or empty in backend. Falling back to package.json install.'
    );
  }

  // eslint-disable-next-line no-console
  console.log('[auto-git-pull] installing backend and app dependencies...');

  await installNodeProjectDependencies(repoDir, {
    useRequirementsFile: true,
    includeDevDependencies: false,
  });

  if (isMonorepoLikeSetup && fs.existsSync(path.join(appRootDir, 'package.json'))) {
    // Expo/app layer may require dev-time SDK/CLI tooling to run successfully.
    await installNodeProjectDependencies(appRootDir, {
      useRequirementsFile: false,
      includeDevDependencies: true,
    });
  }
}

async function runGitPull() {
  const repoDir = path.resolve(__dirname, '..');
  const gitArgs = ['pull', 'origin', 'main'];

  try {
    const { stdout, stderr } = await runGit(gitArgs, repoDir);
    if (stderr) {
      // eslint-disable-next-line no-console
      console.warn('[auto-git-pull] stderr:', stderr.trim());
    }
    if (stdout) {
      // eslint-disable-next-line no-console
      console.log('[auto-git-pull] success:', stdout.trim());
    }

    const output = `${stdout || ''}\n${stderr || ''}`;
    const hasNewCommits =
      /Updating\s+[0-9a-f]+\.\.[0-9a-f]+/i.test(output) ||
      /Fast-forward/i.test(output) ||
      /files changed/i.test(output);

    if (hasNewCommits) {
      // eslint-disable-next-line no-console
      console.log('[auto-git-pull] new commits pulled. Installing dependencies before restart...');
      await installDependencies(repoDir);
      // eslint-disable-next-line no-console
      console.log('[auto-git-pull] Restarting to apply updates...');
      restartCurrentProcess(repoDir);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[auto-git-pull] failed:', error.message);
  }
}

function startAutoGitPull() {
  const intervalMs = 10 * 60 * 1000;
  if (intervalMs < 60 * 1000) {
    // eslint-disable-next-line no-console
    console.warn('[auto-git-pull] interval too small, minimum is 60000ms');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[auto-git-pull] enabled, running every ${intervalMs}ms`);
  runGitPull();
  setInterval(runGitPull, intervalMs);
}

module.exports = { startAutoGitPull };
