// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sandboxApi', {
  // Control the sandbox
  startSandbox: () => ipcRenderer.invoke('sandbox:start'),
  startSandboxWithPreset: (mode) => ipcRenderer.invoke('sandbox:startPreset', mode),
  stopSandbox: () => ipcRenderer.invoke('sandbox:stop'),
  resetSandbox: () => ipcRenderer.invoke('sandbox:reset'),

  // Log streaming
  startLogs: (callback) => {
    ipcRenderer.on('sandbox:logs:data', (_event, data) => {
      callback(data);
    });

    ipcRenderer.send('sandbox:logs:start');
  },

  stopLogs: () => {
    ipcRenderer.send('sandbox:logs:stop');
  },
});