const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  gitClone: (repoUrl, destPath) => ipcRenderer.invoke('git-clone', repoUrl, destPath),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  openFileFromPath: (filePath) => ipcRenderer.invoke('open-file-from-path', filePath),
  saveFileDirect: (filePath, content) => ipcRenderer.invoke('save-file-direct', filePath, content),
  verilogSyntaxCheck: (filePath) => ipcRenderer.invoke('verilog-syntax-check', filePath),

  // Terminal APIs
  termSpawn: (options) => ipcRenderer.invoke('term:spawn', options),
  termWrite: (data) => ipcRenderer.send('term:write', data),
  termResize: (size) => ipcRenderer.send('term:resize', size),
  termKill: () => ipcRenderer.send('term:kill'),
  onTermData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('term:data', listener);
    return () => ipcRenderer.removeListener('term:data', listener);
  },
  onTermExit: (callback) => ipcRenderer.on('term:exit', callback)
});
