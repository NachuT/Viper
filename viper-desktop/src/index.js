const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');
const fsPromises = fs.promises;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (ptyProcess) {
    ptyProcess.kill();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let ptyProcess;

ipcMain.handle('term:spawn', (event, { cols, rows, cwd, shell: shellOverride }) => {
  if (ptyProcess) {
    ptyProcess.kill();
  }
  const useShell = shellOverride || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
  ptyProcess = pty.spawn(useShell, [], {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: cwd || process.env.HOME,
    env: process.env
  });

  const window = BrowserWindow.fromWebContents(event.sender);
  
  ptyProcess.onData(data => {
    if (!window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send('term:data', data);
    }
  });
  
  ptyProcess.onExit(() => {
    ptyProcess = null;
    if (!window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send('term:exit');
    }
  });

  return { pid: ptyProcess.pid };
});

ipcMain.on('term:write', (_event, data) => {
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.on('term:resize', (_event, { cols, rows }) => {
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
});

ipcMain.on('term:kill', () => {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
});

ipcMain.handle('choose-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      console.warn('[choose-folder] User canceled or no folder selected');
      return null;
    }
    console.log('[choose-folder] Folder selected:', result.filePaths[0]);
    return result.filePaths[0];
  } catch (err) {
    console.error('[choose-folder] Error:', err);
    return null;
  }
});

ipcMain.handle('git-clone', async (_event, params) => {
  try {
    let repoUrl, targetDir;
    if (typeof params === 'object' && params !== null) {
      repoUrl = params.url;
      targetDir = params.folder;
    } else {
      repoUrl = params;
      targetDir = undefined;
    }
    if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
      return { success: false, error: 'No repository URL provided.' };
    }
    if (!targetDir || typeof targetDir !== 'string' || !targetDir.trim()) {
      return { success: false, error: 'No target directory provided.' };
    }
    // Check if directory is empty or contains only hidden files
    const files = fs.readdirSync(targetDir);
    const nonHidden = files.filter(f => !f.startsWith('.'));
    if (nonHidden.length > 0) {
      return { success: false, error: 'Selected directory is not empty.' };
    }
    // Remove all files (including hidden) from the directory
    for (const f of files) {
      const fullPath = path.join(targetDir, f);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    // Log the git clone command for debugging
    console.log('[git-clone] Running: git clone', repoUrl, 'in', targetDir);
    // Run git clone into the selected directory
    return await new Promise((resolve) => {
      const git = spawn('git', ['clone', repoUrl, '.'], { cwd: targetDir });
      let stdout = '';
      let stderr = '';
      git.stdout.on('data', data => { stdout += data.toString(); });
      git.stderr.on('data', data => { stderr += data.toString(); });
      git.on('close', code => {
        if (code === 0) {
          resolve({ success: true, stdout, folder: targetDir });
        } else {
          resolve({ success: false, error: stderr || stdout || 'git clone failed.' });
        }
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Verilog Files', extensions: ['v', 'sv'] }, { name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      console.warn('[open-file] User canceled or no file selected');
      return null;
    }
    const filePath = result.filePaths[0];
    console.log('[open-file] File selected:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  } catch (err) {
    console.error('[open-file] Error:', err);
    return null;
  }
});

ipcMain.handle('save-file', async (_event, content) => {
  try {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'Verilog Files', extensions: ['v', 'sv'] }, { name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) {
      console.warn('[save-file] User canceled or no file path');
      return { success: false };
    }
    fs.writeFileSync(result.filePath, content, 'utf-8');
    console.log('[save-file] File saved:', result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('[save-file] Error:', err);
    return { success: false };
  }
});

ipcMain.handle('read-dir', async (_event, dirPath) => {
  console.log('[read-dir] Reading directory:', dirPath);
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    console.log('[read-dir] Files found:', files.map(f => f.name));
    return files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      isFile: f.isFile()
    }));
  } catch (e) {
    console.error('[read-dir] Error reading directory:', dirPath, e);
    return [];
  }
});

ipcMain.handle('open-file-from-path', async (_event, filePath) => {
  try {
    console.log('[open-file-from-path] Opening file:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content };
  } catch (e) {
    console.error('[open-file-from-path] Error opening file:', filePath, e);
    return { content: '' };
  }
});

ipcMain.handle('save-file-direct', async (_event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('[save-file-direct] File saved:', filePath);
    return { success: true, filePath };
  } catch (err) {
    console.error('[save-file-direct] Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('verilog-syntax-check', async (_event, filePath) => {
  return new Promise((resolve) => {
    exec(`iverilog -tnull "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('choose-file', async (_event, options) => {
  const result = await dialog.showOpenDialog({
    title: options?.title || 'Select File',
    defaultPath: options?.defaultPath,
    filters: options?.filters,
    properties: options?.properties || ['openFile']
  });
  return result.filePaths;
});

ipcMain.handle('apio-build', async (_event, { projectDir, topFile, topModule, board }) => {
  try {
    // Always write a clean apio.ini with only [env] section
    const iniContent = `[env]\nboard = ${board}\ntop-module = ${topModule}\n`;
    const apioIniPath = path.join(projectDir, 'apio.ini');
    await fsPromises.writeFile(apioIniPath, iniContent, 'utf8');

    // 2. Run 'apio build' in the project directory
    return await new Promise((resolve) => {
      const build = spawn('apio', ['build'], { cwd: projectDir });
      let output = '';
      let error = '';
      build.stdout.on('data', (data) => { output += data.toString(); });
      build.stderr.on('data', (data) => { error += data.toString(); });
      build.on('close', (code) => {
        if (code === 0) {
          // Try to find the .bin file
          fsPromises.readdir(projectDir).then(files => {
            const bin = files.find(f => f.endsWith('.bin'));
            resolve({ success: true, bitstream: bin ? path.join(projectDir, bin) : null, output });
          });
        } else {
          resolve({
            success: false,
            error: error || output || 'apio build failed.',
            output: output + error
          });
        }
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('apio-board-list', async () => {
  return new Promise((resolve) => {
    exec('apio boards --list', (error, stdout, stderr) => {
      if (error) {
        resolve([]);
      } else {
        const boards = stdout.split('\n').map(line => line.trim()).filter(Boolean);
        resolve(boards);
      }
    });
  });
});
