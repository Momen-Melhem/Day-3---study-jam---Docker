// src/renderer.js

const startBtn = document.getElementById('btn-start');
const stopBtn = document.getElementById('btn-stop');
const resetBtn = document.getElementById('btn-reset');
const clearLogsBtn = document.getElementById('btn-clear-logs');
const startPresetBtn = document.getElementById('btn-start-preset');
const presetSelect = document.getElementById('preset-select');

const statusEl = document.getElementById('status');
const logsEl = document.getElementById('logs');
const modeLabel = document.getElementById('mode-label');

function setModeLabel(text) {
  modeLabel.textContent = text;
}

function appendLog(text, muted = false) {
  const prefix = muted ? "[info] " : "";
  logsEl.textContent += prefix + text;
  logsEl.scrollTop = logsEl.scrollHeight;
}

// Start sandbox (default)
startBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Status: starting (default)...';
  setModeLabel('default');
  try {
    const out = await window.sandboxApi.startSandbox();
    appendLog('\n[START default]\n' + out + '\n');
    statusEl.textContent = 'Status: running (default)';
    window.sandboxApi.startLogs(appendLog);
  } catch (err) {
    appendLog('\n[ERROR starting sandbox]\n' + err + '\n');
    statusEl.textContent = 'Status: error';
  }
});

// Start sandbox with preset
startPresetBtn.addEventListener('click', async () => {
  const mode = presetSelect.value;
  statusEl.textContent = `Status: starting (${mode})...`;
  setModeLabel(mode);
  try {
    const out = await window.sandboxApi.startSandboxWithPreset(mode);
    appendLog(`\n[START preset: ${mode}]\n` + out + '\n');
    statusEl.textContent = `Status: running (${mode})`;
    window.sandboxApi.startLogs(appendLog);
  } catch (err) {
    appendLog('\n[ERROR starting preset]\n' + err + '\n');
    statusEl.textContent = 'Status: error';
  }
});

// Stop sandbox
stopBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Status: stopping...';
  try {
    const out = await window.sandboxApi.stopSandbox();
    appendLog('\n[STOP]\n' + out + '\n', true);
    statusEl.textContent = 'Status: stopped';
    window.sandboxApi.stopLogs();
    setModeLabel('idle');
  } catch (err) {
    appendLog('\n[ERROR stopping sandbox]\n' + err + '\n');
    statusEl.textContent = 'Status: error';
  }
});

// Reset sandbox
resetBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Status: resetting...';
  try {
    const out = await window.sandboxApi.resetSandbox();
    appendLog('\n[RESET]\n' + out + '\n', true);
    statusEl.textContent = 'Status: running (fresh default)';
    setModeLabel('default (fresh)');
    window.sandboxApi.startLogs(appendLog);
  } catch (err) {
    appendLog('\n[ERROR resetting sandbox]\n' + err + '\n');
    statusEl.textContent = 'Status: error';
  }
});

// Clear logs
clearLogsBtn.addEventListener('click', () => {
  logsEl.textContent = '';
  appendLog('[log cleared]\n', true);
});

// Optional: try to start logs on load (in case container already running)
window.sandboxApi.startLogs((data) => appendLog(data));