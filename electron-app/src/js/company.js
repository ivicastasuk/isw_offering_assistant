// Company settings manager
class CompanyManager {
    constructor() {
        this.companyInfo = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Save button
        const saveBtn = document.getElementById('save-company-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveCompany());
        }

        // Logo upload
        const logoInput = document.getElementById('company-logo');
        if (logoInput) {
            logoInput.addEventListener('change', () => this.handleLogoPreview());
        }
    }

    async load() {
        try {
            App.showLoading();
            this.companyInfo = await window.electronAPI.company.getInfo();
            this.populateForm();
        } catch (error) {
            console.error('Error loading company info:', error);
            App.showNotification('Greška pri učitavanju podataka o kompaniji', 'error');
        } finally {
            App.hideLoading();
        }
    }

    populateForm() {
        if (!this.companyInfo) return;

        const fields = [
            'company-name', 'company-address', 'company-city', 'company-postal-code',
            'company-phone', 'company-email', 'company-website', 'company-pib',
            'company-mb', 'company-pdv-number', 'bank-name', 'bank-account',
            'company-description'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const fieldName = fieldId.replace('company-', '').replace('bank-', '').replace(/-/g, '_');
                element.value = this.companyInfo[fieldName] || '';
            }
        });

        // Handle logo
        if (this.companyInfo.logo_path) {
            this.displayLogo(this.companyInfo.logo_path);
        }
    }

    handleLogoPreview() {
        const logoInput = document.getElementById('company-logo');
        const file = logoInput.files[0];

        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                App.showNotification('Fajl je prevelik. Maksimalna veličina je 5MB.', 'error');
                logoInput.value = '';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                App.showNotification('Dozvoljeni su samo JPEG, PNG i GIF fajlovi.', 'error');
                logoInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.displayLogo(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    displayLogo(src) {
        const logoPreview = document.getElementById('logo-preview');
        if (logoPreview) {
            logoPreview.innerHTML = `
                <img src="${src}" alt="Logo kompanije" style="max-width: 200px; max-height: 100px; object-fit: contain;">
                <p class="text-muted mt-2">Trenutni logo</p>
            `;
        }
    }

    async handleSaveCompany() {
        const form = document.getElementById('company-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);

        try {
            App.showLoading();
            await window.electronAPI.company.updateInfo(formData);
            App.showNotification('Podaci o kompaniji su uspešno ažurirani!', 'success');
            
            // Reload to get updated data
            await this.load();
            
        } catch (error) {
            console.error('Error saving company info:', error);
            let errorMessage = 'Greška pri čuvanju podataka o kompaniji';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    // Backup and restore functionality
    async createBackup() {
        try {
            App.showLoading();
            const result = await window.electronAPI.company.createBackup();
            
            if (result.success) {
                App.showNotification('Backup je uspešno kreiran!', 'success');
                
                const openBackup = await App.confirmAction('Da li želite da otvorite folder sa backup fajlom?');
                if (openBackup && result.backupPath) {
                    await window.electronAPI.system.openFolder(result.backupPath);
                }
            }
            
        } catch (error) {
            console.error('Error creating backup:', error);
            App.showNotification('Greška pri kreiranju backup-a', 'error');
        } finally {
            App.hideLoading();
        }
    }

    async restoreFromBackup() {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da vratite podatke iz backup-a? Trenutni podaci će biti zamenjeni.',
            'Vraćanje iz backup-a'
        );
        
        if (!confirmed) return;

        try {
            const result = await window.electronAPI.system.selectFile({
                title: 'Izaberite backup fajl',
                filters: [
                    { name: 'SQL fajlovi', extensions: ['sql'] },
                    { name: 'Svi fajlovi', extensions: ['*'] }
                ]
            });

            if (result && result.filePath) {
                App.showLoading();
                const restoreResult = await window.electronAPI.company.restoreFromBackup(result.filePath);
                
                if (restoreResult.success) {
                    App.showNotification('Podaci su uspešno vraćeni iz backup-a!', 'success');
                    
                    // Reload all data
                    await this.load();
                    if (window.DashboardManager) {
                        window.DashboardManager.load();
                    }
                }
            }
            
        } catch (error) {
            console.error('Error restoring from backup:', error);
            App.showNotification('Greška pri vraćanju iz backup-a', 'error');
        } finally {
            App.hideLoading();
        }
    }

    // Export functionality
    async exportData(type) {
        try {
            App.showLoading();
            
            const result = await window.electronAPI.company.exportData(type);
            
            if (result.success) {
                App.showNotification(`${type} su uspešno eksportovani!`, 'success');
                
                const openExport = await App.confirmAction('Da li želite da otvorite folder sa eksportovanim fajlovima?');
                if (openExport && result.exportPath) {
                    await window.electronAPI.system.openFolder(result.exportPath);
                }
            }
            
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            App.showNotification(`Greška pri eksportovanju ${type}`, 'error');
        } finally {
            App.hideLoading();
        }
    }

    // System information
    async loadSystemInfo() {
        try {
            const systemInfo = await window.electronAPI.system.getInfo();
            
            const systemInfoEl = document.getElementById('system-info');
            if (systemInfoEl && systemInfo) {
                systemInfoEl.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Aplikacija</h6>
                            <p><strong>Verzija:</strong> ${systemInfo.appVersion || 'N/A'}</p>
                            <p><strong>Electron:</strong> ${systemInfo.electronVersion || 'N/A'}</p>
                            <p><strong>Node.js:</strong> ${systemInfo.nodeVersion || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Sistem</h6>
                            <p><strong>OS:</strong> ${systemInfo.platform || 'N/A'}</p>
                            <p><strong>Arhitektura:</strong> ${systemInfo.arch || 'N/A'}</p>
                            <p><strong>Memorija:</strong> ${systemInfo.memory || 'N/A'}</p>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading system info:', error);
        }
    }
}

// Global functions for button actions
window.CompanyManager = new CompanyManager();

// Backup and export functions
async function createBackup() {
    await window.CompanyManager.createBackup();
}

async function restoreFromBackup() {
    await window.CompanyManager.restoreFromBackup();
}

async function exportClients() {
    await window.CompanyManager.exportData('klijenti');
}

async function exportProducts() {
    await window.CompanyManager.exportData('proizvodi');
}

async function exportOffers() {
    await window.CompanyManager.exportData('ponude');
}

async function exportSales() {
    await window.CompanyManager.exportData('prodaje');
}
