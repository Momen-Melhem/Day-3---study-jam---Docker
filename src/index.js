// src/index.js  (MAIN PROCESS)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

let logProcess = null;

// Helper: build docker run command based on preset mode
function buildRunCommand(mode) {
  // shared flags
  const baseFlags = '--network sandbox-net --read-only --tmpfs /tmp';

  // resource limits (just for flavor)
  let resourceFlags = '';
  switch (mode) {
    case 'safe':
      resourceFlags = '--cpus=1 --memory=1g';
      break;
    case 'malware':
      resourceFlags = '--cpus=2 --memory=2g';
      break;
    case 'full':
      resourceFlags = '--cpus=3 --memory=3g';
      break;
    case 'proxy':
      resourceFlags = '--cpus=1.5 --memory=1.5g';
      break;
    default:
      resourceFlags = '';
  }

  const envFlag = mode ? `-e SANDBOX_MODE=${mode}` : '';

  // --rm ensures auto-delete when the container stops
  return (
    'docker run -d --rm --name sandbox-browser ' +
    `${resourceFlags} ${envFlag} ${baseFlags} browser`
  );
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout || stderr || 'OK');
    });
  });
}

async function startSandboxInternal(mode) {
  // best-effort: stop any old one
  try {
    await runCommand('docker stop sandbox-browser');
  } catch (err) {
    // ignore if not running
  }

  const cmd = buildRunCommand(mode);
  return runCommand(cmd);
}

// Create the main window
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// -------- IPC: Sandbox control --------

// Start sandbox with default mode
ipcMain.handle('sandbox:start', async () => {
  return startSandboxInternal(undefined);
});

// Start sandbox with preset
ipcMain.handle('sandbox:startPreset', async (_event, mode) => {
  return startSandboxInternal(mode);
});

// Stop sandbox container (ignore if not running)
ipcMain.handle('sandbox:stop', async () => {
  try {
    return await runCommand('docker stop sandbox-browser');
  } catch (err) {
    return 'already stopped or not found';
  }
});

// Reset = stop old container then start default
ipcMain.handle('sandbox:reset', async () => {
  try {
    await runCommand('docker stop sandbox-browser');
  } catch (err) {
    // ignore
  }
  return startSandboxInternal(undefined);
});

// -------- IPC: Log streaming --------

ipcMain.on('sandbox:logs:start', (event) => {
  if (logProcess) return; // already streaming

  logProcess = spawn('docker', ['logs', '-f', 'sandbox-browser']);

  logProcess.stdout.on('data', (data) => {
    event.sender.send('sandbox:logs:data', data.toString());
  });

  logProcess.stderr.on('data', (data) => {
    event.sender.send('sandbox:logs:data', data.toString());
  });

  logProcess.on('close', () => {
    event.sender.send('sandbox:logs:data', '\n[log stream ended]\n');
    logProcess = null;
  });
});

ipcMain.on('sandbox:logs:stop', () => {
  if (logProcess) {
    logProcess.kill();
    logProcess = null;
  }
});

// -------- App lifecycle --------

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Auto-stop container when app is closing
app.on('before-quit', () => {
  exec('docker stop sandbox-browser', () => {
    // ignore result: container might not exist
  });
});

// Standard behavior for non-macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});