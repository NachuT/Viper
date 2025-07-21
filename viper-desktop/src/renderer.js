window.onload = function() {
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
}; 