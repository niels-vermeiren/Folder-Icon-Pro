const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Registry } = require('rage-edit');
const winattr = require('winattr');
require('events').EventEmitter.prototype._maxListeners = 70;
require('events').defaultMaxListeners = 70;

// Path helpers to resolve paths in and outside asar archive
function getRefreshExecutablePath() {
  const basePath = app.isPackaged ? path.join(process.resourcesPath, '../bin') : 
                                    path.join(__dirname, '../bin');
  return path.join(basePath, 'iconCacheRefresh.exe');
}

function getIconsFolderPath(iconFolder) {
  const basePath = app.isPackaged? path.join(process.resourcesPath, '../icons') : 
                                   path.join(__dirname, '../icons');
  return path.join(basePath, iconFolder);
}

const resolveMainExecutablePath = (...segments) => {
  const basePath = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();
  return path.join(basePath, ...segments);
};

// Create the main application window
function createWindow(chosenPath) {

  const win = new BrowserWindow({
    width: 275,
    height: 414,
    title: 'Folder Icon Pro',
    icon: path.join(__dirname, 'resources/icons/logo.ico'),
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load the icon chooser front-end
  win.loadFile(path.join(__dirname, '../app/icon-chooser.html')).then(() => {
    win.webContents.send('chosen-path', chosenPath);
  }).catch(() => {
    getFiles([], getIconsFolderPath('colored_folders')).forEach(file => {
      win.webContents.send('add-icon', file);
    });
  });

  return win;
}

// Retrieve all icon files from a specific directory
function getFiles(files = [], dirPath) {
  const listing = fs.readdirSync(dirPath, { withFileTypes: true });
  for (let f of listing) {
    const fullName = path.join(dirPath, f.name);
    if (f.isFile()) files.push(fullName);
  }
  return files;
}

// IPC handlers
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-files', (_event, dirPath) => getFiles([], dirPath));
ipcMain.handle('change-folder', async (_event, dirName) =>  getFiles([], dirName));

const checkWriteAccess = (path) => {
  try {
    fs.accessSync(path, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

ipcMain.handle('set-folder-icon', async (_event, imgSrc, folderPath) => {
  folderPath = folderPath.replace(/^"|"$/g, '').trim();
  if (!imgSrc || !folderPath) throw new Error('Invalid arguments: imgSrc or folderPath is missing');

  const sanitizedFolderPath = path.normalize(folderPath).replace(/\\+$/, '');
  const desktopiniPath = path.join(sanitizedFolderPath, 'desktop.ini');

  if (!checkWriteAccess(sanitizedFolderPath)) {
    throw new Error('Permission denied. Ensure you have write access to the folder.');
  }

  const imgSrcNormalized = imgSrc.startsWith('file:///') ? decodeURIComponent(imgSrc.replace('file:///', '')) :
                           imgSrc.replace(/\//g, '\\');

  // Content desktop.ini
  const data = `[.ShellClassInfo]\nIconResource=${imgSrcNormalized},0\nIconIndex=0`;

  // Make desktop.ini writable if it already exists
  if (fs.existsSync(desktopiniPath)) {
    winattr.setSync(desktopiniPath, { system: false, readonly: false, hidden: false });
    fs.unlinkSync(desktopiniPath);
  }

  // Write to desktop.ini and make it hidden
  fs.writeFileSync(desktopiniPath, data, 'utf-8');
  winattr.setSync(desktopiniPath, { system: true, readonly: true, hidden: true });

  // Here we spam an explorer refresh via our Windows Explorer cash clearing script
  const cacheRefreshBinary = getRefreshExecutablePath();
  const cmdCache = `"${cacheRefreshBinary}" "${sanitizedFolderPath}" "${imgSrcNormalized}"`;
  Array.from({ length: 8 }).forEach(() => exec(cmdCache, { name: 'cacheAndRefresh' }));
});

// Registry helper to add context menu commands
async function registerDirectoryCommand(options) {
  const SOFTWARE_CLASSES = 'HKCU\\Software\\Classes\\';
  const { name, icon, command, menu } = options;

  try {
    await Registry.set(`${SOFTWARE_CLASSES}Directory\\shell\\${name}`);
    await Registry.set(`${SOFTWARE_CLASSES}Directory\\shell\\${name}`, '', menu);
    if (icon) {
      await Registry.set(`${SOFTWARE_CLASSES}Directory\\shell\\${name}`, 'Icon', icon.endsWith('.exe') ? `${icon},0` : icon);
    }
    await Registry.set(`${SOFTWARE_CLASSES}Directory\\shell\\${name}\\command`, '', `${command}`);
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
}

// Add a custom command to the context menu
async function addContextMenuItemCmdToRegistry() {
  app.setAppUserModelId(app.name);

  // Define launcher paths
  const mainExecPath = path.join(resolveMainExecutablePath(), 'Folder Icon Pro.exe');

  // Command to be added to the context menu
  const cmd = `"${mainExecPath}" "%1"`;
  const logo = path.join(__dirname, 'resources/icons/logo.ico');

  new Notification({
    icon: logo,
    body: 'Right-click on a folder to get started.',
    title: 'Success configuring application!',
    timeout: 0,
  }).show();

  // Register the context menu item
  const options = {
    name: 'Folder Icon Pro',
    icon: getIconsFolderPath('logo.ico'),
    command: cmd,
    menu: 'Folder Icon Pro',
  };
  
  // Make registry changes & show notification on success
  await registerDirectoryCommand(options).catch((error) => {
    throw new Error('Error making registry changes: ' + error);
  });
}

// Application startup logic
app.whenReady().then(async () => {
  const args = process.argv;
  const folderPath = args[args.length - 1];

  if (args.length >= 2 && folderPath && folderPath !== '.' && !folderPath.endsWith('.exe')) {
    createWindow(folderPath); // Open icon chooser UI for a selected folder
  } else {
    await addContextMenuItemCmdToRegistry(); // Add context menu item
    app.quit();
  }
});

// Quit application when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});