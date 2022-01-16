const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {
    start: function() {
        ipcRenderer.send("start");
    },
    stop: function() {
        ipcRenderer.send("stop");
    },
    openExternal: function(url) {
        shell.openExternal(url);
    },
    getUrls: function(cb) {
        return ipcRenderer.invoke("getUrls")
    }
})

