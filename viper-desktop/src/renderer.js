window.onload = function() {
  console.log("window.onload fired");
  const openFolderBtn = document.getElementById('open-folder');
  const cloneGitBtn = document.getElementById('clone-git');
  const gitUrlInput = document.getElementById('git-url');
  const statusDiv = document.getElementById('status');
  const selectedFolderDiv = document.getElementById('selected-folder');

  openFolderBtn && (openFolderBtn.onclick = async () => {
    const folder = await window.electronAPI.chooseFolder();
    if (folder) {
      localStorage.setItem('viper-selected-folder', folder);
      window.location = 'editor.html';
    }
  });

  cloneGitBtn && (cloneGitBtn.onclick = async () => {
    let url = gitUrlInput.value;
    if (!url) url = prompt('Enter Git repository URL:');
    if (!url) return;
    const dest = await window.electronAPI.chooseFolder();
    if (!dest) return;
    statusDiv.textContent = 'Cloning...';
    const result = await window.electronAPI.gitClone(url, dest);
    if (result.success) {
      const folderName = url.split('/').pop().replace(/\.git$/, '');
      const fullPath = dest + '/' + folderName;
      let waited = 0;
      const maxWait = 10000;
      const poll = async () => {
        const exists = await window.electronAPI.readDir(fullPath).then(() => true).catch(() => false);
        if (exists) {
          localStorage.setItem('viper-selected-folder', fullPath);
          statusDiv.textContent = 'Cloned successfully!';
          window.location = 'editor.html';
        } else if (waited < maxWait) {
          waited += 200;
          setTimeout(poll, 200);
        } else {
          statusDiv.textContent = 'Clone finished but folder not found.';
        }
      };
      poll();
    } else {
      statusDiv.textContent = 'Clone failed: ' + result.error;
    }
  });

  const syntaxBtn = document.getElementById('syntax-check-btn');
  const syntaxResult = document.getElementById('syntax-check-result');
  if (syntaxBtn) {
    syntaxBtn.onclick = async () => {
      if (!window.getActiveFilePath) return;
      await window.saveActiveFile && window.saveActiveFile();
      const filePath = window.getActiveFilePath();
      if (!filePath) return;
      syntaxResult.textContent = 'Checking...';
      const result = await window.electronAPI.verilogSyntaxCheck(filePath);
      if (result && result.success) {
        syntaxResult.style.color = '#7fff7f';
        syntaxResult.textContent = 'No syntax errors.';
      } else {
        syntaxResult.style.color = '#ff5c5c';
        syntaxResult.textContent = result && result.error ? result.error : 'Syntax error.';
      }
    };
  }

  const toolchainBanner = document.getElementById('toolchain-banner');
  const toolchainInstructions = document.getElementById('toolchain-instructions');
  const copyToolchainCmd = document.getElementById('copy-toolchain-cmd');
  const toolchainCmdBox = document.getElementById('toolchain-cmd-box');
  let toolchainCmd = '';
  const platform = (typeof process !== 'undefined' && process.platform) ? process.platform : navigator.platform;
  if (platform.startsWith('Win') || platform === 'win32') {
    toolchainCmd = 'pacman -Syu\npacman -S mingw-w64-x86_64-yosys mingw-w64-x86_64-icestorm mingw-w64-x86_64-nextpnr-ice40';
    toolchainInstructions.textContent = 'On Windows (MSYS2): Install MSYS2, then run if you haven\'t already:';
  } else if (platform === 'darwin' || platform.toLowerCase().includes('mac')) {
    toolchainCmd = 'brew tap cloud-v/icestorm\nbrew install yosys icestorm nextpnr-ice40';
    toolchainInstructions.textContent = 'On macOS: Run this if you haven\'t already:';
  }
  toolchainCmdBox.value = toolchainCmd;
  copyToolchainCmd.onclick = () => {
    navigator.clipboard.writeText(toolchainCmd);
    copyToolchainCmd.textContent = 'Copied!';
    setTimeout(() => { copyToolchainCmd.textContent = 'Copy Command'; }, 1500);
  };
}; 