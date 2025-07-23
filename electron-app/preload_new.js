const { contextBridge, ipcRenderer } = require('electron');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// API konfiguracija
const API_BASE_URL = 'http://localhost:3000/api';

// HTTP Client funkcija
function makeHttpRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlParts = new URL(url);
      const isHttps = urlParts.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: urlParts.hostname,
        port: urlParts.port || (isHttps ? 443 : 80),
        path: urlParts.pathname + urlParts.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
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
            const jsonResponse = responseData ? JSON.parse(responseData) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ 
                data: jsonResponse, 
                status: res.statusCode,
                headers: res.headers
              });
            } else {
              reject({ 
                response: { 
                  data: jsonResponse, 
                  status: res.statusCode,
                  headers: res.headers
                },
                message: `HTTP ${res.statusCode}`
              });
            }
          } catch (error) {
            reject({ 
              message: 'Invalid JSON response', 
              response: { 
                data: responseData, 
                status: res.statusCode,
                headers: res.headers
              } 
            });
          }
        });
      });

      req.on('error', (error) => {
        reject({ message: error.message });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject({ message: 'Request timeout' });
      });

      if (data && typeof data === 'object') {
        req.write(JSON.stringify(data));
      }

      req.end();
    } catch (error) {
      reject({ message: error.message });
    }
  });
}

// API helper function sa auth
async function apiRequest(method, endpoint, data = null) {
  try {
    const token = await ipcRenderer.invoke('storage-get', 'auth_token');
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await makeHttpRequest(method, url, data, headers);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token je istekao
      await ipcRenderer.invoke('storage-remove', 'auth_token');
      await ipcRenderer.invoke('storage-remove', 'user_data');
      // Emit logout event
      ipcRenderer.send('user-logout');
    }
    throw error;
  }
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC komunikacija
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Menu eventi
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  
  // Storage API
  storage: {
    setItem: (key, value) => ipcRenderer.invoke('storage-set', key, value),
    getItem: (key) => ipcRenderer.invoke('storage-get', key),
    removeItem: (key) => ipcRenderer.invoke('storage-remove', key),
    clear: () => ipcRenderer.invoke('storage-clear')
  },
  
  // API pozivi
  auth: {
    login: async (credentials) => {
      return await apiRequest('POST', '/auth/login', credentials);
    },
    me: async () => {
      return await apiRequest('GET', '/auth/me');
    },
    changePassword: async (data) => {
      return await apiRequest('POST', '/auth/change-password', data);
    }
  },
  
  users: {
    getAll: async () => {
      return await apiRequest('GET', '/users');
    },
    getById: async (id) => {
      return await apiRequest('GET', `/users/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/users', data);
    },
    update: async (id, data) => {
      return await apiRequest('PUT', `/users/${id}`, data);
    },
    deactivate: async (id) => {
      return await apiRequest('PATCH', `/users/${id}/deactivate`);
    },
    activate: async (id) => {
      return await apiRequest('PATCH', `/users/${id}/activate`);
    },
    resetPassword: async (id, data) => {
      return await apiRequest('POST', `/users/${id}/reset-password`, data);
    }
  },
  
  clients: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/clients?${queryString}` : '/clients';
      return await apiRequest('GET', endpoint);
    },
    getById: async (id) => {
      return await apiRequest('GET', `/clients/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/clients', data);
    },
    update: async (id, data) => {
      return await apiRequest('PUT', `/clients/${id}`, data);
    },
    delete: async (id) => {
      return await apiRequest('DELETE', `/clients/${id}`);
    },
    deactivate: async (id) => {
      return await apiRequest('PATCH', `/clients/${id}/deactivate`);
    },
    activate: async (id) => {
      return await apiRequest('PATCH', `/clients/${id}/activate`);
    }
  },
  
  products: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/products?${queryString}` : '/products';
      return await apiRequest('GET', endpoint);
    },
    getById: async (id) => {
      return await apiRequest('GET', `/products/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/products', data);
    },
    update: async (id, data) => {
      return await apiRequest('PUT', `/products/${id}`, data);
    },
    delete: async (id) => {
      return await apiRequest('DELETE', `/products/${id}`);
    },
    deactivate: async (id) => {
      return await apiRequest('PATCH', `/products/${id}/deactivate`);
    },
    activate: async (id) => {
      return await apiRequest('PATCH', `/products/${id}/activate`);
    },
    getAllGroups: async () => {
      return await apiRequest('GET', '/products/groups');
    },
    createGroup: async (data) => {
      return await apiRequest('POST', '/products/groups', data);
    },
    updateGroup: async (id, data) => {
      return await apiRequest('PUT', `/products/groups/${id}`, data);
    },
    deleteGroup: async (id) => {
      return await apiRequest('DELETE', `/products/groups/${id}`);
    }
  },
  
  offers: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/offers?${queryString}` : '/offers';
      return await apiRequest('GET', endpoint);
    },
    getById: async (id) => {
      return await apiRequest('GET', `/offers/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/offers', data);
    },
    addItem: async (id, data) => {
      return await apiRequest('POST', `/offers/${id}/items`, data);
    },
    updateItem: async (id, itemId, data) => {
      return await apiRequest('PUT', `/offers/${id}/items/${itemId}`, data);
    },
    removeItem: async (id, itemId) => {
      return await apiRequest('DELETE', `/offers/${id}/items/${itemId}`);
    },
    lock: async (id) => {
      return await apiRequest('PATCH', `/offers/${id}/lock`);
    },
    updateStatus: async (id, data) => {
      return await apiRequest('PATCH', `/offers/${id}/status`, data);
    },
    createRevision: async (id) => {
      return await apiRequest('POST', `/offers/${id}/revision`);
    },
    generatePDF: async (id) => {
      // Za PDF, možda treba posebno rukovanje
      return await apiRequest('GET', `/offers/${id}/pdf`);
    }
  },
  
  sales: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/sales?${queryString}` : '/sales';
      return await apiRequest('GET', endpoint);
    },
    getById: async (id) => {
      return await apiRequest('GET', `/sales/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/sales', data);
    },
    update: async (id, data) => {
      return await apiRequest('PUT', `/sales/${id}`, data);
    },
    delete: async (id) => {
      return await apiRequest('DELETE', `/sales/${id}`);
    },
    getStats: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/sales/stats?${queryString}` : '/sales/stats';
      return await apiRequest('GET', endpoint);
    }
  },
  
  company: {
    get: async () => {
      return await apiRequest('GET', '/company');
    },
    update: async (data) => {
      return await apiRequest('PUT', '/company', data);
    }
  },
  
  incomingDocuments: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/incoming-documents?${queryString}` : '/incoming-documents';
      return await apiRequest('GET', endpoint);
    },
    getById: async (id) => {
      return await apiRequest('GET', `/incoming-documents/${id}`);
    },
    create: async (data) => {
      return await apiRequest('POST', '/incoming-documents', data);
    },
    update: async (id, data) => {
      return await apiRequest('PUT', `/incoming-documents/${id}`, data);
    },
    delete: async (id) => {
      return await apiRequest('DELETE', `/incoming-documents/${id}`);
    },
    getStats: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/incoming-documents/stats?${queryString}` : '/incoming-documents/stats';
      return await apiRequest('GET', endpoint);
    }
  },
  
  // Utility funkcije
  utils: {
    formatCurrency: (amount) => {
      return new Intl.NumberFormat('sr-RS', {
        style: 'currency',
        currency: 'RSD',
        minimumFractionDigits: 2
      }).format(amount);
    },
    formatDate: (date) => {
      return new Date(date).toLocaleDateString('sr-RS');
    },
    formatDateTime: (date) => {
      return new Date(date).toLocaleString('sr-RS');
    }
  }
});

// App utilities
contextBridge.exposeInMainWorld('appUtils', {
  showLoading: () => {
    const existingLoader = document.getElementById('global-loader');
    if (!existingLoader) {
      const loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        ">
          <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          ">
            <div style="
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 10px;
            "></div>
            <p>Učitava...</p>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loader);
    }
  },
  
  hideLoading: () => {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.remove();
    }
  },
  
  showNotification: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      z-index: 10001;
      max-width: 400px;
      word-wrap: break-word;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animacija pojavljivanja
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Uklanjanje nakon 5 sekundi
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
});
