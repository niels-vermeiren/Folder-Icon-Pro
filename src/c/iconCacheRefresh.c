#include <windows.h>
#include <shlobj.h>
#include <stdio.h>
#include <stdlib.h>

// Helper function to convert const char* to const wchar_t*
LPWSTR convertToWideChar(const char* str) {
    size_t len = strlen(str) + 1;
    LPWSTR wStr = (LPWSTR)malloc(len * sizeof(wchar_t));
    mbstowcs(wStr, str, len);
    return wStr;
}

// Function to set the folder icon
void setFolderIcon(const char* folderPath, const char* iconPath) {
    SHFOLDERCUSTOMSETTINGS folderSettings = {0};
    folderSettings.dwSize = sizeof(folderSettings);
    folderSettings.dwMask = FCSM_ICONFILE;

    LPWSTR wideIconPath = convertToWideChar(iconPath);
    folderSettings.pszIconFile = wideIconPath;  // Assigning wide string for icon path
    folderSettings.iIconIndex = 0;

    LPWSTR wideFolderPath = convertToWideChar(folderPath);
    HRESULT hr = SHGetSetFolderCustomSettings(&folderSettings, wideFolderPath, FCS_FORCEWRITE);
    
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATH, wideFolderPath, NULL);
    SHChangeNotify(
        SHCNE_ASSOCCHANGED,         
        SHCNF_IDLIST,               
        wideFolderPath,                      
        NULL                        
    );
    
    // Free memory allocated for wide strings
    free(wideIconPath);
    free(wideFolderPath);
}

// Main function
int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage: %s <folderPath> <iconPath>\n", argv[0]);
        return 1;
    }

    const char* folderPath = argv[1];
    const char* iconPath = argv[2];

    // Set the folder icon
    setFolderIcon(folderPath, iconPath);
    printf("Icon refresh process complete.\n");

    return 0;
}
