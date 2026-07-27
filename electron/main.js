const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

const BACKEND_PORT = 8811;
const MONGO_PORT = 27017;

const isPackaged = app.isPackaged;
const resourcesRoot = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const backendDir = path.join(resourcesRoot, 'backend');
const backendEntry = path.join(backendDir, 'server.js');

let mongodProcess = null;
let mainWindow = null;

function waitForPort(port, host, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function attempt() {
      const socket = net.createConnection(port, host);
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`Timed out waiting for port ${port}`));
        else setTimeout(attempt, 400);
      });
    })();
  });
}

function findMongod() {
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const mongoBase = path.join(programFiles, 'MongoDB', 'Server');
  if (fs.existsSync(mongoBase)) {
    const versions = fs.readdirSync(mongoBase).sort((a, b) => {
      const partsA = a.split('.').map(Number);
      const partsB = b.split('.').map(Number);
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const diff = (partsB[i] || 0) - (partsA[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    for (const v of versions) {
      const exe = path.join(mongoBase, v, 'bin', 'mongod.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'mongod'; // fall back to PATH
}

function startMongo() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'data', 'db');
  const logDir = path.join(userData, 'data', 'log');
  fs.mkdirSync(dbPath, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  const mongodExe = findMongod();

  return new Promise((resolve, reject) => {
    try {
      mongodProcess = spawn(mongodExe, [
        '--dbpath', dbPath,
        '--logpath', path.join(logDir, 'mongod.log'),
        '--port', String(MONGO_PORT),
        '--bind_ip', '127.0.0.1',
      ], { stdio: 'ignore' });
    } catch (err) {
      reject(err);
      return;
    }

    mongodProcess.on('error', reject);
    waitForPort(MONGO_PORT, '127.0.0.1', 25000).then(resolve).catch(reject);
  });
}

function startBackend() {
  process.env.PORT = String(BACKEND_PORT);
  process.env.MONGO_URI = `mongodb://127.0.0.1:${MONGO_PORT}/ledger_app`;
  process.env.UPLOAD_DIR = path.join(app.getPath('userData'), 'uploads');
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });

  require(backendEntry);

  return waitForPort(BACKEND_PORT, '127.0.0.1', 20000);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    webPreferences: { contextIsolation: true },
  });
  await mainWindow.loadURL(`http://localhost:${BACKEND_PORT}/`);
  mainWindow.show();
  mainWindow.on('closed', () => { mainWindow = null; });
}

function cleanup() {
  if (mongodProcess) {
    try { mongodProcess.kill(); } catch { /* already gone */ }
    mongodProcess = null;
  }
}

async function boot() {
  Menu.setApplicationMenu(null);
  try {
    await startMongo();
    await startBackend();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Ledger Records failed to start',
      `${err.message}\n\nMake sure MongoDB Community Server is installed on this computer.`
    );
    cleanup();
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(boot);

  app.on('window-all-closed', () => {
    cleanup();
    app.quit();
  });

  app.on('before-quit', cleanup);
}
