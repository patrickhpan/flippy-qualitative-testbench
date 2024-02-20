import { app, BrowserWindow, protocol, nativeImage } from "electron"
import * as path from "path"
import * as url from "url"
import "core-js/stable"
import "regenerator-runtime/runtime"
import * as remoteMain from '@electron/remote/main';

let mainWindow: Electron.BrowserWindow | null

function createWindow() {
  const icon = nativeImage.createFromPath(path.join(__dirname, `favicon.png`))

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false, // THIS IS A POTENTIAL SECURITY VULNERABILITY -- FIX 
    },
    title: "Flippy Qualitative Testbench",
    icon,
  })

  remoteMain.initialize();
  remoteMain.enable(mainWindow.webContents);

  mainWindow.setMenuBarVisibility(false)

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(`http://localhost:4000`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true,
      })
    )
  }

  // hack to prevent compounded zooms after reloading
  mainWindow.webContents.on(`did-start-loading`, () => {
    if (mainWindow) {
      mainWindow.webContents.on(
        `zoom-changed`,
        // eslint-disable-next-line unused-imports/no-unused-vars
        (_event, _zoomDirection) => undefined
      )
    }
  })

  mainWindow.webContents.on(`did-finish-load`, () => {
    if (mainWindow) {
      mainWindow.setTitle(`Flippy Qualitative Testbench`)

      mainWindow.webContents.on("zoom-changed", (_event, zoomDirection) => {
        if (mainWindow) {
          const currentZoom = mainWindow.webContents.getZoomFactor()
          if (zoomDirection === "in" && currentZoom < 5.0) {
            mainWindow.webContents.zoomFactor = currentZoom + 0.1
          }
          if (zoomDirection === "out" && currentZoom > 0.2) {
            mainWindow.webContents.zoomFactor = currentZoom - 0.1
          }
        }
      })
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.on("ready", createWindow)
app.allowRendererProcessReuse = true

app.whenReady().then(() => {
  protocol.registerFileProtocol("file", (request, callback) => {
    const pathname = request.url.replace("file:///", "")
    callback(pathname)
  })
})
