const { contextBridge, ipcRenderer } = require('electron');
const { rootPath } = require('electron-root-path');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
 
  onAddIcon: (callback) => ipcRenderer.on('add-icon', (_event, value) => {
    if ($.isFunction(callback)) callback(value);
  }),

  changeFolder: (folderPath) => ipcRenderer.invoke('change-folder', folderPath),

  setFolderIcon: (imgSrc, folderPath) => ipcRenderer.invoke('set-folder-icon', imgSrc, folderPath),

  getFolderPath: () => ipcRenderer.invoke('handle-folder-path'),

  getRootPath: () => rootPath,

  getProcessPath: () => process.resourcesPath,

  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  getFiles: (dirPath) => ipcRenderer.invoke('get-files', dirPath),

  path: {
    join: (...segments) => path.join(...segments),
    resolve: (...segments) => path.resolve(...segments),
    normalize: (p) => path.normalize(p),
  },

  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),

    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

    on: (channel, listener) => {
        ipcRenderer.on(channel, listener);
    },
  },
});
