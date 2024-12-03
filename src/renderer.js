const $ = jQuery;

// Icon Management
const IconManager = {
  container: $('#icon-container'),

  addIcon(iconPath) {
    const img = $('<img>', {
      class: 'icon-item',
      alt: 'Folder Icon',
      src: iconPath,
    });
    this.container.append(img);
  },

  clearIcons() {
    this.container.empty();
  },

  selectIcon(event) {
    $('.icon-item').removeClass('selected'); // Deselect all icons
    $(event.target).addClass('selected'); // Select the clicked icon
  },

  getSelectedIcon() {
    return $('.icon-item.selected').get(0)?.src || null;
  },
};

// Folder Path Management
const FolderPathManager = {
  inputField: $('#folder-path'),

  updatePath(path) {
    this.inputField.val(path);
  },

  getPath() {
    return this.inputField.val().trim();
  },
};

// Folder Icon Setting
const FolderIconSetter = {
  async setIcon(imgSrc, folderPath) {
    if (imgSrc && folderPath) {
      try {
        await window.electronAPI.setFolderIcon(imgSrc, folderPath);
      } catch (err) {
        console.error('Error setting folder icon:', err);
      }
    } else {
      throw new Error('Missing icon source or folder path');
    }
  },
};

// Folder Selection
const FolderSelector = {
  async handleSelection(event) {

    const folderPath = $(event.target).val().trim();
    if (!folderPath) return;

    const resolvedDirPath = window.electronAPI.path.join(
      window.electronAPI.getProcessPath(),
      '../icons',
      folderPath
    );

    IconManager.clearIcons();

    try {
      const icons = await window.electronAPI.changeFolder(resolvedDirPath);
      icons.forEach((icon) => IconManager.addIcon(`file://${icon}`));
    } catch (err) {
      console.error('Error changing folder:', err);
    }
  },
};

// Timeout for first time icon change bug
const asyncTimeout = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

// Event Handlers
const EventHandlers = {
  hasClickedExtra: false,
  onSetIconClick() {
    const selectedIcon = IconManager.getSelectedIcon();
    const folderPath = FolderPathManager.getPath();
  
    if (selectedIcon && folderPath) {
      FolderIconSetter.setIcon(selectedIcon, folderPath);
      if(!this.hasClickedExtra) {
        asyncTimeout(4000).then(() => {
          this.hasClickedExtra = true;
          EventHandlers.onSetIconClick();
        });
      }
    } else {
      console.error('No icon or folder selected!');
    }
  },

  onIconClick(event) {
    IconManager.selectIcon(event);
  },

  onFolderSelectorChange(event) {
    FolderSelector.handleSelection(event);
  },
};

// IPC Communication
const IPCHandlers = {
  setup() {
    window.electronAPI.ipcRenderer.on('chosen-path', (_event, path) => {
      FolderPathManager.updatePath(path);
    });

    window.electronAPI.ipcRenderer.on('add-icon', (_event, iconPath) => {
      IconManager.addIcon(`file://${iconPath}`);
    });
  },
};

// Initialization
function initialize() {
  // Attach event listeners
  $(document).on('click', '.icon-item', EventHandlers.onIconClick);
  $('#set-icon-btn').on('click', EventHandlers.onSetIconClick);
  $('#folder-selector').on('change', EventHandlers.onFolderSelectorChange);
  $('#folder-selector').val('colored_folders');
  $('#folder-selector').change();
  // Setup IPC handlers
  IPCHandlers.setup();
}

// Initialize when the document is ready
$(document).ready(initialize);
