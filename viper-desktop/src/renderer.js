window.onload = function() {
  const openFolderBtn = document.getElementById('open-folder');
  const cloneGitBtn = document.getElementById('clone-git');
  const gitUrlInput = document.getElementById('git-url');
  const statusDiv = document.getElementById('status');

  openFolderBtn.onclick = async () => {
    const folder = await window.electronAPI.chooseFolder();
    if (folder) statusDiv.textContent = 'Selected folder: ' + folder;
  };

  cloneGitBtn.onclick = async () => {
    const url = gitUrlInput.value;
    if (!url) return;
    const dest = await window.electronAPI.chooseFolder();
    if (!dest) return;
    statusDiv.textContent = 'Cloning...';
    const result = await window.electronAPI.gitClone(url, dest);
    if (result.success) {
      statusDiv.textContent = 'Cloned successfully!';
    } else {
      statusDiv.textContent = 'Clone failed: ' + result.error;
    }
  };
}; 