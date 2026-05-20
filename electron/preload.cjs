const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mathDamo', {
  getLocalIps: () => ipcRenderer.invoke('get-local-ips'),
})
