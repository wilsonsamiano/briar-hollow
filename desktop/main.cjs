const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { startStatic, PORT } = require("./serve.cjs");

const HOME = `http://127.0.0.1:${PORT}/`;

function wwwRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "www") : path.join(__dirname, "www");
}

let server;
let win;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(openGame);

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("will-quit", () => {
    if (server) server.close();
  });
}

async function openGame() {
  const root = wwwRoot();
  if (!fs.existsSync(path.join(root, "index.html"))) {
    dialog.showErrorBox("Briar Hollow", "The game files are missing from this build.");
    app.exit(1);
    return;
  }
  try {
    server = await startStatic(root);
  } catch {
    dialog.showErrorBox(
      "Briar Hollow",
      "Could not open the game. Close any other copy of Briar Hollow, then start it again.",
    );
    app.exit(1);
    return;
  }

  Menu.setApplicationMenu(buildMenu());
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Briar Hollow",
    backgroundColor: "#241910",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(HOME)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(HOME)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  if (process.env.BRIAR_SMOKE === "1") {
    win.webContents.on("did-finish-load", () => {
      win.webContents
        .executeJavaScript("document.body ? document.body.innerText.slice(0, 500) : ''")
        .then((text) => {
          console.log("SMOKE_TEXT", JSON.stringify(text));
          app.exit(typeof text === "string" && text.includes("Briar Hollow") ? 0 : 2);
        })
        .catch((err) => {
          console.error(err);
          app.exit(3);
        });
    });
    setTimeout(() => app.exit(4), 25000);
  }

  void win.loadURL(HOME);
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Briar Hollow",
      submenu: [
        {
          label: "About Briar Hollow",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "About Briar Hollow",
              message: "Briar Hollow",
              detail: "Version 0.1.2-beta\nA quiet fen farm.",
            });
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "togglefullscreen" }],
    },
  ]);
}
