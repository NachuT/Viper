const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  gitClone: (repoUrl, destPath) => ipcRenderer.invoke('git-clone', repoUrl, destPath)
});
