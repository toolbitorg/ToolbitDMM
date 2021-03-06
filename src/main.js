// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const ipc = require('electron').ipcMain
const log = require('electron-log');
const {autoUpdater} = require("electron-updater");

// Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 450, height: 76, minWidth: 450, minHeight: 76, maxHeight: 900,
//    width: 850, height: 575, minWidth: 450, minHeight: 75, maxHeight: 900,
    autoHideMenuBar: true,
    title: "Toolbit DMM " + app.getVersion()
  })
  //mainWindow = new BrowserWindow({width: 270, height: 250,
  //  resizable: false, autoHideMenuBar: true})

  // and load the index.html of the app.
  mainWindow.loadFile('app/index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

}

// Second-instance is not allowed for now
if(!app.requestSingleInstanceLock()) {
  app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  app.quit();
  /*
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
  */
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
});

ipc.on('get-app-version', function(event) {
  event.sender.send('got-app-version', app.getVersion())
})
