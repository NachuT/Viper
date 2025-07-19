let monacoEditor = null;

function createFileTree(container, folderPath, files) {
  files.forEach(f => {
    const li = document.createElement('li');
    li.className = 'py-1 px-2 rounded hover:bg-gray-700 cursor-pointer flex items-center';
    if (f.isDirectory) {
      li.innerHTML = `<span class="mr-1">📁</span>${f.name}`;
      li.onclick = async (e) => {
        e.stopPropagation();
        if (li.classList.contains('expanded')) {
          li.classList.remove('expanded');
          const ul = li.querySelector('ul');
          if (ul) ul.remove();
        } else {
          li.classList.add('expanded');
          const subPath = folderPath + '/' + f.name;
          const subFiles = await window.electronAPI.readDir(subPath);
          console.log('Subfolder:', subPath, subFiles);
          const ul = document.createElement('ul');
          ul.className = 'ml-4';
          createFileTree(ul, subPath, subFiles);
          li.appendChild(ul);
        }
      };
    } else {
      li.innerHTML = `<span class="mr-1">📄</span>${f.name}`;
      li.onclick = async (e) => {
        e.stopPropagation();
        const filePath = folderPath + '/' + f.name;
        const { content } = await window.electronAPI.openFileFromPath(filePath);
        if (monacoEditor) {
          monacoEditor.setValue(content);
        }
      };
    }
    container.appendChild(li);
  });
}

window.onload = async function() {
  const folderPath = localStorage.getItem('viper-selected-folder');
  const fileList = document.getElementById('file-list');
  if (folderPath) {
    const files = await window.electronAPI.readDir(folderPath);
    console.log('Root folder:', folderPath, files);
    fileList.innerHTML = '';
    createFileTree(fileList, folderPath, files);
  } else {
    fileList.innerHTML = '<li class="text-red-400">No folder selected</li>';
  }

  // Monaco Editor
  require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
  require(['vs/editor/editor.main'], function () {
    monacoEditor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Start coding Verilog here!\n',
      language: 'plaintext',
      theme: 'vs-dark',
      fontSize: 16,
      minimap: { enabled: false }
    });
  });
}; 