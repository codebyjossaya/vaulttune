import { dialog } from "electron";
export function promptHandler(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a folder',
      buttonLabel: 'Select Folder',
    }).then(result => {
      if (result.canceled) {
        resolve(null);
      } else {
        resolve(result.filePaths[0]);
      }
    }).catch(error => {
      console.error("Error showing open dialog:", error);
      reject(error);
    });
  });
}