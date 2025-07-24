const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  gitClone: ({ url, folder }) => ipcRenderer.invoke('git-clone', { url, folder }),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  openFileFromPath: (filePath) => ipcRenderer.invoke('open-file-from-path', filePath),
  saveFileDirect: (filePath, content) => ipcRenderer.invoke('save-file-direct', filePath, content),
  verilogSyntaxCheck: (filePath) => ipcRenderer.invoke('verilog-syntax-check', filePath),
  generateBitstream: (filePath) => ipcRenderer.invoke('generate-bitstream', filePath),
  chooseFile: (options) => ipcRenderer.invoke('choose-file', options),
  apioBuild: (params) => ipcRenderer.invoke('apio-build', params),
  apioBoardList: () => ipcRenderer.invoke('apio-board-list'),

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
