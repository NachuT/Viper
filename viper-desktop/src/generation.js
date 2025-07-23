window.onload = function() {
  const folderInput = document.getElementById('folder-input');
  const pickFolderBtn = document.getElementById('pick-folder-btn');
  const nextToFileBtn = document.getElementById('next-to-file');
  const fileInput = document.getElementById('file-input');
  const pickFileBtn = document.getElementById('pick-file-btn');
  const nextToModuleBtn = document.getElementById('next-to-module');
  const moduleInput = document.getElementById('module-input');
  const buildBtn = document.getElementById('build-btn');
  const buildResult = document.getElementById('build-result');
  const step1 = document.querySelector('.step-1');
  const step2 = document.querySelector('.step-2');
  const step3 = document.querySelector('.step-3');
  let selectedFolder = '';
  let selectedFile = '';

  // Get folder from query param if present
  const params = new URLSearchParams(window.location.search);
  const initialFolder = params.get('folder');
  if (initialFolder) {
    selectedFolder = initialFolder;
    folderInput.value = initialFolder;
    nextToFileBtn.disabled = false;
  }

  pickFolderBtn.onclick = async () => {
    const folder = await window.electronAPI.chooseFolder();
    if (folder) {
      selectedFolder = folder;
      folderInput.value = folder;
      fileInput.value = '';
      selectedFile = '';
      nextToFileBtn.disabled = false;
    }
  };

  nextToFileBtn.onclick = () => {
    step1.classList.remove('active');
    step2.classList.add('active');
  };

  pickFileBtn.onclick = async () => {
    if (!selectedFolder) {
      buildResult.style.color = '#ff5c5c';
      buildResult.textContent = 'Please pick a project folder first.';
      return;
    }
    const file = await window.electronAPI.chooseFile({
      title: 'Select Top Verilog File',
      defaultPath: selectedFolder,
      filters: [{ name: 'Verilog Files', extensions: ['v'] }],
      properties: ['openFile']
    });
    if (file && file[0]) {
      selectedFile = file[0];
      fileInput.value = selectedFile;
      // Suggest default module name
      moduleInput.value = selectedFile.split(/[\\/]/).pop().replace(/\.v$/, '');
      nextToModuleBtn.disabled = false;
    }
  };

  nextToModuleBtn.onclick = () => {
    step2.classList.remove('active');
    step3.classList.add('active');
  };

  document.getElementById('generation-form').onsubmit = async (e) => {
    e.preventDefault();
    buildResult.style.color = '#7ecfff';
    buildResult.textContent = 'Building bitstream with Apio...';
    try {
      const result = await window.electronAPI.apioBuild({
        projectDir: selectedFolder,
        topFile: selectedFile,
        topModule: moduleInput.value
      });
      if (result && result.success) {
        buildResult.style.color = '#7fff7f';
        buildResult.textContent = 'Bitstream generated: ' + (result.bitstream || 'Success!');
      } else {
        buildResult.style.color = '#ff5c5c';
        buildResult.textContent = result && result.error ? result.error : 'Bitstream generation failed.';
      }
    } catch (err) {
      buildResult.style.color = '#ff5c5c';
      buildResult.textContent = err.message || 'Bitstream generation failed.';
    }
  };
}; 