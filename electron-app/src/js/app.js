// Main application controller
class App {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.loadingOverlay = null;
        this.notificationContainer = null;
        this.init();
    }

    async init() {
        // Initialize UI elements
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.notificationContainer = document.getElementById('notification-container');
        
        // Check authentication on load
        await this.checkAuth();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup menu handlers
        this.setupMenuHandlers();
        
        // Setup logout
        this.setupLogout();
    }

    async checkAuth() {
        const token = await window.electronAPI.storage.getItem('auth_token');
        const userData = await window.electronAPI.storage.getItem('user_data');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showMainApp();
                this.loadCurrentUser();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    async loadCurrentUser() {
        try {
            const user = await window.electronAPI.auth.me();
            this.currentUser = user;
            this.updateUserDisplay();
            this.updateUIForRole();
        } catch (error) {
            console.error('Error loading current user:', error);
            this.logout();
        }
    }

    updateUserDisplay() {
        const userElement = document.getElementById('current-user');
        if (userElement && this.currentUser) {
            userElement.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }
    }

    updateUIForRole() {
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdmin = this.currentUser?.role === 'admin';
        
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });
    }

    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('main-screen').classList.remove('active');
    }

    showMainApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        // Load dashboard by default
        this.navigateToSection('dashboard');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });
    }

    navigateToSection(section) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update active content section
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${section}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
            this.currentSection = section;
            
            // Load section-specific data
            this.loadSectionData(section);
        }
    }

    loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                if (window.Dashboard) {
                    window.Dashboard.load();
                }
                break;
            case 'offers':
                if (window.OffersManager) {
                    window.OffersManager.load();
                }
                break;
            case 'clients':
                if (window.ClientsManager) {
                    window.ClientsManager.load();
                }
                break;
            case 'products':
                if (window.ProductsManager) {
                    window.ProductsManager.load();
                }
                break;
            case 'sales':
                // Sales manager to be implemented
                break;
            case 'incoming-documents':
                // Incoming documents manager to be implemented
                break;
            case 'users':
                // Users manager to be implemented
                break;
            case 'company':
                // Company manager to be implemented
                break;
        }
    }

    setupMenuHandlers() {
        // Listen for menu actions from main process
        window.electronAPI.onMenuAction((event, action) => {
            switch (action) {
                case 'new':
                    this.handleNewAction();
                    break;
            }
        });
    }

    handleNewAction() {
        // Handle "New" menu action based on current section
        switch (this.currentSection) {
            case 'offers':
                if (window.OffersManager) {
                    window.OffersManager.showCreateModal();
                }
                break;
            case 'clients':
                if (window.ClientsManager) {
                    window.ClientsManager.showCreateModal();
                }
                break;
            case 'products':
                if (window.ProductsManager) {
                    window.ProductsManager.showCreateModal();
                }
                break;
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => {
            this.logout();
        });
    }

    async logout() {
        await window.electronAPI.storage.removeItem('auth_token');
        await window.electronAPI.storage.removeItem('user_data');
        this.currentUser = null;
        this.showLogin();
        window.appUtils.showNotification('Uspešno ste se odjavili', 'info');
    }

    // Utility methods
    static formatCurrency(amount) {
        return window.electronAPI.utils.formatCurrency(amount);
    }

    static formatDate(date) {
        return window.electronAPI.utils.formatDate(date);
    }

    static formatDateTime(date) {
        return window.electronAPI.utils.formatDateTime(date);
    }

    static showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle', 
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="notification-icon ${iconMap[type]}"></i>
            <div class="notification-content">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    static showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Modal utilities
    static createModal(title, content, footer = '') {
        const modalHtml = `
            <div class="modal-backdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;
        
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = modalHtml;
        
        // Setup close handlers
        const closeBtn = modalContainer.querySelector('.modal-close');
        const backdrop = modalContainer.querySelector('.modal-backdrop');
        
        const closeModal = () => {
            modalContainer.innerHTML = '';
        };
        
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal();
            }
        });
        
        return modalContainer.querySelector('.modal');
    }

    static closeModal() {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = '';
    }

    static async confirmAction(message, title = 'Potvrda') {
        const result = await window.electronAPI.showMessageBox({
            type: 'question',
            buttons: ['Otkaži', 'Potvrdi'],
            defaultId: 1,
            title: title,
            message: message
        });
        
        return result.response === 1;
    }

    static async showError(message, title = 'Greška') {
        await window.electronAPI.showMessageBox({
            type: 'error',
            buttons: ['OK'],
            title: title,
            message: message
        });
    }

    static async showInfo(message, title = 'Informacija') {
        await window.electronAPI.showMessageBox({
            type: 'info',
            buttons: ['OK'],
            title: title,
            message: message
        });
    }

    // Status badge helper
    static createStatusBadge(status) {
        const statusTexts = {
            draft: 'Nacrt',
            locked: 'Zaključano',
            past: 'Prošla',
            rejected: 'Odbijena',
            questionable: 'Pod znakom pitanja',
            active: 'Aktivno',
            inactive: 'Neaktivno'
        };
        
        return `<span class="status-badge ${status}">${statusTexts[status] || status}</span>`;
    }

    // Table helpers
    static createActionButtons(actions) {
        return actions.map(action => {
            const { text, icon, className, onclick } = action;
            return `<button class="btn btn-sm ${className}" onclick="${onclick}">
                ${icon ? `<i class="${icon}"></i>` : ''} ${text}
            </button>`;
        }).join(' ');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = new App();
});

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    App.showNotification('Došlo je do neočekivane greške', 'error');
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    App.showNotification('Došlo je do greške u aplikaciji', 'error');
});
