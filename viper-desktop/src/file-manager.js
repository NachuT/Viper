
class FileManager {
  constructor() {
    this.contextMenu = document.getElementById('context-menu');
    this.fileList = document.getElementById('file-list');
    this.draggedElement = null;
    this.currentFolderPath = null;
    
    this.initContextMenu();
    this.initDragAndDrop();
    this.initTouchGestures();
    this.initModalDialogs();
  }

  initModalDialogs() {
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalMessage = document.getElementById('modal-message');
    this.modalInput = document.getElementById('modal-input');
    this.modalCancel = document.getElementById('modal-cancel');
    this.modalConfirm = document.getElementById('modal-confirm');
  
    this.modalCancel.addEventListener('click', () => {
      this.hideModal();
    });
    
  
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.hideModal();
      }
    });
    

    this.modalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.modalConfirm.click();
      }
    });
  }

  showModal(title, message, defaultValue = '', isConfirmation = false) {
    return new Promise((resolve) => {
      this.modalTitle.textContent = title;
      this.modalMessage.textContent = message;
      
      if (isConfirmation) {
        this.modalInput.style.display = 'none';
        this.modalConfirm.textContent = 'Yes';
        this.modalCancel.textContent = 'No';
      } else {
        this.modalInput.style.display = 'block';
        this.modalInput.value = defaultValue;
        this.modalConfirm.textContent = 'Confirm';
        this.modalCancel.textContent = 'Cancel';
        this.modalInput.focus();
        this.modalInput.select();
      }
      
      this.modalOverlay.style.display = 'flex';
      
      const handleConfirm = () => {
        this.hideModal();
        if (isConfirmation) {
          resolve(true);
        } else {
          resolve(this.modalInput.value.trim());
        }
        this.modalConfirm.removeEventListener('click', handleConfirm);
      };
      
      const handleCancel = () => {
        this.hideModal();
        resolve(null);
        this.modalCancel.removeEventListener('click', handleCancel);
      };
      
      this.modalConfirm.addEventListener('click', handleConfirm);
      this.modalCancel.addEventListener('click', handleCancel);
    });
  }

  hideModal() {
    this.modalOverlay.style.display = 'none';
    this.modalInput.style.display = 'block';
    this.modalConfirm.textContent = 'Confirm';
    this.modalCancel.textContent = 'Cancel';
  }

  initContextMenu() {
    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    this.contextMenu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action);
      }
    });
    
   
    this.fileList.addEventListener('contextmenu', (e) => {
      
      if (e.target === this.fileList || e.target.tagName === 'UL') {
        e.preventDefault();
        this.showContextMenu(e, { dataset: { filePath: '' }, querySelector: () => null });
      }
    });
    
   

    document.addEventListener('contextmenu', (e) => {
      const li = e.target.closest('#file-list li');
      if (li && li.dataset.filePath) {
        e.preventDefault();
        this.showContextMenu(e, li);
      }
    });
  }

  initDragAndDrop() {
    this.fileList.addEventListener('dragstart', (e) => {
      const li = e.target.closest('li');
      if (li && li.dataset.filePath) {
        this.draggedElement = li;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', li.dataset.filePath);
      }
    });

    this.fileList.addEventListener('dragend', (e) => {
      if (this.draggedElement) {
        this.draggedElement.classList.remove('dragging');
        this.draggedElement = null;
      }
    });

    this.fileList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('li');
      if (li && li !== this.draggedElement) {
        li.classList.add('drag-over');
      }
    });

    this.fileList.addEventListener('dragleave', (e) => {
      const li = e.target.closest('li');
      if (li) {
        li.classList.remove('drag-over');
      }
    });

    this.fileList.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetLi = e.target.closest('li');
      if (targetLi && this.draggedElement && this.draggedElement !== targetLi) {
        await this.handleDrop(this.draggedElement, targetLi);
      }

      this.fileList.querySelectorAll('li').forEach(li => {
        li.classList.remove('drag-over');
      });
    });
  }

  initTouchGestures() {
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    this.fileList.addEventListener('touchstart', (e) => {
      const li = e.target.closest('li');
      if (li) {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    });

    this.fileList.addEventListener('touchend', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
   
        if (touchDuration > 500) {
          e.preventDefault();
          this.showContextMenu(e, li);
        }
      }
    });
  }

  showContextMenu(e, element) {
    console.log('[File Manager] showContextMenu called with:', {
      element: element,
      filePath: element.dataset.filePath,
      isDirectory: element.querySelector && element.querySelector('span')?.textContent === '📁'
    });
    

    this.fileList.querySelectorAll('li').forEach(li => {
      li.classList.remove('context-menu-target');
    });
    

    if (element.dataset.filePath) {
      element.classList.add('context-menu-target');
    }
    
    let rect;
    
    if (element.dataset.filePath) {
    
      rect = element.getBoundingClientRect();
      this.contextMenu.style.left = rect.right + 'px';
      this.contextMenu.style.top = rect.top + 'px';
    } else {
     
      this.contextMenu.style.left = e.clientX + 'px';
      this.contextMenu.style.top = e.clientY + 'px';
    }
    
    this.contextMenu.style.display = 'block';
    
    const targetPath = element.dataset.filePath || '';
    this.contextMenu.dataset.targetElement = targetPath;
    
    const isDirectory = element.querySelector && element.querySelector('span')?.textContent === '📁';
    
    console.log('[File Manager] Context menu settings:', {
      targetPath: targetPath,
      isDirectory: isDirectory,
      menuPosition: { left: this.contextMenu.style.left, top: this.contextMenu.style.top }
    });
    
    const menuItems = this.contextMenu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
      const action = item.dataset.action;
      if (action === 'new-file' || action === 'new-folder') {
        item.style.display = (isDirectory || !targetPath) ? 'block' : 'none';
      } else if (action === 'rename' || action === 'delete') {
        item.style.display = targetPath ? 'block' : 'none';
      }
    });
  }

  hideContextMenu() {
    this.contextMenu.style.display = 'none';
    this.contextMenu.dataset.targetElement = '';
    

    this.fileList.querySelectorAll('li').forEach(li => {
      li.classList.remove('context-menu-target');
    });
  }

  async handleContextMenuAction(action) {
    const targetPath = this.contextMenu.dataset.targetElement;
    this.hideContextMenu();

    switch (action) {
      case 'rename':
        await this.renameFile(targetPath);
        break;
      case 'new-file':
        await this.createNewFile(targetPath);
        break;
      case 'new-folder':
        await this.createNewFolder(targetPath);
        break;
      case 'delete':
        await this.deleteFile(targetPath);
        break;
    }
  }

  async handleDrop(sourceElement, targetElement) {
    const sourcePath = sourceElement.dataset.filePath;
    const targetPath = targetElement.dataset.filePath;
    
    if (!sourcePath || !targetPath) return;

    try {
      const targetStats = await window.electronAPI.readDir(targetPath);
      const targetIsDirectory = targetStats.length > 0 || targetPath.endsWith('/');
      
      if (targetIsDirectory) {
        const fileName = sourcePath.split('/').pop();
        const newPath = targetPath + '/' + fileName;
        
        const result = await window.electronAPI.moveFile(sourcePath, newPath);
        if (result.success) {
          this.refreshFileTree();
        } else {
          alert('Move failed: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  }

  async renameFile(filePath) {
    if (!filePath) return;
    
    const currentName = filePath.split('/').pop();
    const newName = await this.showModal('Rename', 'Enter new name:', currentName);
    
    if (newName && newName !== currentName) {
      try {
        const result = await window.electronAPI.renameFile(filePath, newName);
        if (result.success) {
          this.refreshFileTree();
        } else {
          alert('Rename failed: ' + result.error);
        }
      } catch (error) {
        console.error('Rename error:', error);
      }
    }
  }

  async createNewFile(parentPath) {
  
    let actualParentPath = parentPath;

    if (parentPath && !parentPath.endsWith('/')) {
      try {
      
        const files = await window.electronAPI.readDir(parentPath);
  
        actualParentPath = parentPath;
      } catch (error) {
      
        actualParentPath = parentPath.substring(0, parentPath.lastIndexOf('/'));
      }
    }
 
    if (!actualParentPath) {
      actualParentPath = localStorage.getItem('viper-selected-folder');
    }
    
    const fileName = await this.showModal('New File', 'Enter file name:');
    if (fileName) {
      try {
        const result = await window.electronAPI.createFile(actualParentPath, fileName);
        if (result.success) {
          this.refreshFileTree();
        } else {
          alert('Create file failed: ' + result.error);
        }
      } catch (error) {
        console.error('Create file error:', error);
      }
    }
  }

  async createNewFolder(parentPath) {
    
    let actualParentPath = parentPath;
    
  
    if (parentPath && !parentPath.endsWith('/')) {
      try {
       
        const files = await window.electronAPI.readDir(parentPath);
     
        actualParentPath = parentPath;
      } catch (error) {
       
        actualParentPath = parentPath.substring(0, parentPath.lastIndexOf('/'));
      }
    }
    

    if (!actualParentPath) {
      actualParentPath = localStorage.getItem('viper-selected-folder');
    }
    
    const folderName = await this.showModal('New Folder', 'Enter folder name:');
    if (folderName) {
      try {
        const result = await window.electronAPI.createFolder(actualParentPath, folderName);
        if (result.success) {
          this.refreshFileTree();
        } else {
          alert('Create folder failed: ' + result.error);
        }
      } catch (error) {
        console.error('Create folder error:', error);
      }
    }
  }

  async deleteFile(filePath) {
    if (!filePath) return;
    
    const fileName = filePath.split('/').pop();
    const confirmed = await this.showModal('Delete', `Are you sure you want to delete "${fileName}"?`, '', true);
    
    if (confirmed) {
      try {
        const result = await window.electronAPI.deleteFile(filePath);
        if (result.success) {
          this.refreshFileTree();
        } else {
          alert('Delete failed: ' + result.error);
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  }

  refreshFileTree() {
  
    if (window.refreshFileTree) {
      window.refreshFileTree();
    }
  }

  setCurrentFolder(folderPath) {
    this.currentFolderPath = folderPath;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.fileManager = new FileManager();
}); 