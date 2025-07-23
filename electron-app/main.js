const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');

// Globalne promenljive
let mainWindow;
let isDevMode = process.argv.includes('--dev');

// Simple storage object for key-value pairs
const storage = new Map();

function createWindow() {
  // Kreiraj prozor aplikacije
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Ne prikazuj dok se ne učita
    titleBarStyle: 'default'
  });

  // Učitaj aplikaciju
  mainWindow.loadFile('src/index.html');

  // Prikaži prozor kada je spreman
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDevMode) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Kreiraj meni
  createMenu();

  // Event listeneri
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Sprečavanje navigacije na spoljne linkove
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createMenu() {
  const template = [
    {
      label: 'Fajl',
      submenu: [
        {
          label: 'Novo',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new');
          }
        },
        { type: 'separator' },
        {
          label: 'Izađi',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Uredi',
      submenu: [
        { label: 'Poništi', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Ponovi', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Iseci', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Kopiraj', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Nalepi', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Izaberi sve', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'Prikaz',
      submenu: [
        { label: 'Osveži', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forsiraj osvežavanje', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Uvećaj', accelerator: 'CmdOrCtrl+Plus', role: 'zoomin' },
        { label: 'Umanji', accelerator: 'CmdOrCtrl+-', role: 'zoomout' },
        { label: 'Resetuj uvećanje', accelerator: 'CmdOrCtrl+0', role: 'resetzoom' }
      ]
    },
    {
      label: 'Pomoć',
      submenu: [
        {
          label: 'O aplikaciji',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'O aplikaciji',
              message: 'ISW Offering Assistant',
              detail: 'Desktop aplikacija za upravljanje ponudama\\nVerzija 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handleri
ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Storage IPC handleri
ipcMain.handle('storage-set', async (event, key, value) => {
  storage.set(key, value);
  return true;
});

ipcMain.handle('storage-get', async (event, key) => {
  return storage.get(key) || null;
});

ipcMain.handle('storage-remove', async (event, key) => {
  storage.delete(key);
  return true;
});

ipcMain.handle('storage-clear', async (event) => {
  storage.clear();
  return true;
});

// User logout event
ipcMain.on('user-logout', (event) => {
  // Clear auth data
  storage.delete('auth_token');
  storage.delete('user_data');
  // Optionally send to renderer
  if (mainWindow) {
    mainWindow.webContents.send('auth-logout');
  }
});

// API request handler
ipcMain.handle('api-request', async (event, method, endpoint, data = null) => {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  console.log(`API Request: ${method} ${endpoint}`, data ? JSON.stringify(data) : '');
  
  return new Promise((resolve, reject) => {
    try {
      const token = storage.get('auth_token');
      const url = `http://localhost:3000/api${endpoint}`;
      const urlParts = new URL(url);
      const isHttps = urlParts.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const options = {
        hostname: urlParts.hostname,
        port: urlParts.port || (isHttps ? 443 : 80),
        path: urlParts.pathname + urlParts.search,
        method: method.toUpperCase(),
        headers: headers
      };

      if (data && typeof data === 'object') {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            console.log(`API Response [${res.statusCode}]:`, responseData.substring(0, 200));
            
            const jsonResponse = responseData ? JSON.parse(responseData) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(jsonResponse);
            } else {
              if (res.statusCode === 401) {
                // Token expired
                storage.delete('auth_token');
                storage.delete('user_data');
                if (mainWindow) {
                  mainWindow.webContents.send('auth-logout');
                }
              }
              const errorObj = { 
                response: { 
                  data: jsonResponse, 
                  status: res.statusCode 
                },
                message: `HTTP ${res.statusCode}: ${jsonResponse.message || jsonResponse.error || 'Unknown error'}`
              };
              console.error('API Error:', errorObj);
              reject(errorObj);
            }
          } catch (parseError) {
            const errorObj = { 
              message: `Invalid JSON response: ${parseError.message}`, 
              response: { 
                data: responseData, 
                status: res.statusCode 
              } 
            };
            console.error('JSON Parse Error:', errorObj);
            reject(errorObj);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request Error:', error);
        reject({ message: `Network error: ${error.message}` });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        console.error('Request Timeout');
        reject({ message: 'Request timeout (10s)' });
      });

      if (data && typeof data === 'object') {
        req.write(JSON.stringify(data));
      }

      req.end();
    } catch (error) {
      console.error('API Request Error:', error);
      reject({ message: `Request setup error: ${error.message}` });
    }
  });
});

// App event listeneri
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Sprečavanje kreiranja novih prozora
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

module.exports = app;
