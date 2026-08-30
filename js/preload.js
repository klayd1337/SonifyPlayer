const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем безопасные API в renderer процесс
contextBridge.exposeInMainWorld('electronAPI', {
  // Управление окном
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});