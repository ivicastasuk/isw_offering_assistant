const { contextBridge, ipcRenderer } = require('electron');

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
  
  // API pozivi - sve će ići preko main procesa
  auth: {
    login: async (credentials) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/auth/login', credentials);
    },
    me: async () => {
      return await ipcRenderer.invoke('api-request', 'GET', '/auth/me');
    },
    changePassword: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/auth/change-password', data);
    }
  },
  
  users: {
    getAll: async () => {
      return await ipcRenderer.invoke('api-request', 'GET', '/users');
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/users/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/users', data);
    },
    update: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/users/${id}`, data);
    },
    deactivate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/users/${id}/deactivate`);
    },
    activate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/users/${id}/activate`);
    },
    resetPassword: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'POST', `/users/${id}/reset-password`, data);
    }
  },
  
  clients: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/clients?${queryString}` : '/clients';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/clients/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/clients', data);
    },
    update: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/clients/${id}`, data);
    },
    delete: async (id) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/clients/${id}`);
    },
    deactivate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/clients/${id}/deactivate`);
    },
    activate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/clients/${id}/activate`);
    }
  },
  
  products: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/products?${queryString}` : '/products';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/products/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/products', data);
    },
    update: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/products/${id}`, data);
    },
    delete: async (id) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/products/${id}`);
    },
    deactivate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/products/${id}/deactivate`);
    },
    activate: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/products/${id}/activate`);
    },
    getAllGroups: async () => {
      return await ipcRenderer.invoke('api-request', 'GET', '/products/groups');
    },
    createGroup: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/products/groups', data);
    },
    updateGroup: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/products/groups/${id}`, data);
    },
    deleteGroup: async (id) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/products/groups/${id}`);
    }
  },
  
  offers: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/offers?${queryString}` : '/offers';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/offers/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/offers', data);
    },
    addItem: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'POST', `/offers/${id}/items`, data);
    },
    updateItem: async (id, itemId, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/offers/${id}/items/${itemId}`, data);
    },
    removeItem: async (id, itemId) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/offers/${id}/items/${itemId}`);
    },
    lock: async (id) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/offers/${id}/lock`);
    },
    updateStatus: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PATCH', `/offers/${id}/status`, data);
    },
    createRevision: async (id) => {
      return await ipcRenderer.invoke('api-request', 'POST', `/offers/${id}/revision`);
    },
    generatePDF: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/offers/${id}/pdf`);
    }
  },
  
  sales: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/sales?${queryString}` : '/sales';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/sales/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/sales', data);
    },
    update: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/sales/${id}`, data);
    },
    delete: async (id) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/sales/${id}`);
    },
    getStats: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/sales/stats?${queryString}` : '/sales/stats';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    }
  },
  
  company: {
    get: async () => {
      return await ipcRenderer.invoke('api-request', 'GET', '/company');
    },
    update: async (data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', '/company', data);
    }
  },
  
  incomingDocuments: {
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/incoming-documents?${queryString}` : '/incoming-documents';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
    },
    getById: async (id) => {
      return await ipcRenderer.invoke('api-request', 'GET', `/incoming-documents/${id}`);
    },
    create: async (data) => {
      return await ipcRenderer.invoke('api-request', 'POST', '/incoming-documents', data);
    },
    update: async (id, data) => {
      return await ipcRenderer.invoke('api-request', 'PUT', `/incoming-documents/${id}`, data);
    },
    delete: async (id) => {
      return await ipcRenderer.invoke('api-request', 'DELETE', `/incoming-documents/${id}`);
    },
    getStats: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/incoming-documents/stats?${queryString}` : '/incoming-documents/stats';
      return await ipcRenderer.invoke('api-request', 'GET', endpoint);
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
