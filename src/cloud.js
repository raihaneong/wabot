import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import config from "./config.json" with {type:"json"}


let RCLONE_PATH = null;

function resolveRclonePath() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'where rclone' : 'which rclone';

  try {
    const output = execSync(command, { encoding: 'utf8' });
    const firstPath = output.trim().split(/\r?\n/)[0];

    if (!firstPath) {
      throw new Error('empty output');
    }

    return firstPath;
  } catch (err) {
    throw new Error('rclone not found in PATH. Install it or set RCLONE_BIN.');
  }
}

/**
 * Move files from local temp folder to a remote via rclone.
 * Uses `rclone move` so source files are removed after successful transfer.
 */
function moveToRemote(localDir = TEMP_DIR, remoteTarget = REMOTE) {
  return new Promise((resolve, reject) => {
    if (!RCLONE_PATH) {
      return reject(new Error('rclone path not resolved yet — call resolveRclonePath() at startup.'));
    }

    const args = [
      'move',
      localDir,
      remoteTarget,        // e.g. 'myremote:backups/media'
      '--transfers', '4',
      '--checkers', '8',
      '--min-age', '10m',  // safety: skip files still being written
      '--log-level', 'INFO',
    ];

    const proc = spawn(RCLONE_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = '';
    proc.stdout.on('data', (data) => {
      console.log(`[rclone] ${data.toString().trim()}`);
    });
    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log(`[rclone] ${output.trim()}`);
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn rclone: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rclone exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

// --- Bot startup ---
const TEMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/temp');
const REMOTE = config.remote // configure via rclone.conf
const INTERVAL_MS = 60 * 60 * 1000; // e.g. every hour

let moveInProgress = false;
let scheduledMovesStarted = false;

async function runMove() {
  if (moveInProgress) {
    console.log('Skipping move - another move is already running.');
    return false;
  }

  moveInProgress = true;
  try {
    await moveToRemote(TEMP_DIR, REMOTE);
    return true;
  } finally {
    moveInProgress = false;
  }
}

async function startScheduledMoves() {
  if (scheduledMovesStarted) {
    return;
  }

  try {
    RCLONE_PATH = resolveRclonePath();
    console.log(`Resolved rclone at: ${RCLONE_PATH}`);
  } catch (err) {
    console.error('Startup check failed:', err.message);
    process.exit(1); // fail fast, don't let the bot run without rclone available
  }

  scheduledMovesStarted = true;

  setInterval(async () => {
    try {
      console.log('Starting scheduled rclone move...');
      const started = await runMove();
      if (started) {
        console.log('Move completed.');
      }
    } catch (err) { 
      console.error('Move failed:', err.message);
    }
  }, INTERVAL_MS);
}

export { moveToRemote, runMove, startScheduledMoves };