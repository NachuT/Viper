const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  gitClone: (repoUrl, destPath) => ipcRenderer.invoke('git-clone', repoUrl, destPath),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  openFileFromPath: (filePath) => ipcRenderer.invoke('open-file-from-path', filePath)
});
