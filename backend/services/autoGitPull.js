const { spawn } = require('child_process');
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
      console.log('[auto-git-pull] new commits pulled. Restarting to apply updates...');
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
