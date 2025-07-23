// Clients manager
class ClientsManager {
    constructor() {
        this.clients = [];
        this.filters = {
            search: '',
            active: 'true'
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New client button
        const newClientBtn = document.getElementById('new-client-btn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => this.showCreateModal());
        }

        // Search and filters
        const searchInput = document.getElementById('clients-search');
        const activeFilter = document.getElementById('clients-active-filter');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.load();
            }, 300));
        }

        if (activeFilter) {
            activeFilter.addEventListener('change', () => {
                this.filters.active = activeFilter.value;
                this.load();
            });
        }
    }

    async load() {
        try {
            App.showLoading();
            
            const params = { ...this.filters };
            
            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '') {
                    delete params[key];
                }
            });

            this.clients = await window.electronAPI.clients.getAll(params);
            this.renderTable();
            
        } catch (error) {
            console.error('Error loading clients:', error);
            App.showNotification('Greška pri učitavanju klijenata', 'error');
        } finally {
            App.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.querySelector('#clients-table tbody');
        
        if (!this.clients || this.clients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">Nema pronađenih klijenata</td>
                </tr>
            `;
            return;
        }

        const html = this.clients.map(client => `
            <tr>
                <td><strong>${client.company_name}</strong></td>
                <td>${client.city || ''}</td>
                <td>${client.email || ''}</td>
                <td>${client.phone || ''}</td>
                <td>${client.pib || ''}</td>
                <td>${App.createStatusBadge(client.is_active ? 'active' : 'inactive')}</td>
                <td>
                    ${this.createClientActionButtons(client)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createClientActionButtons(client) {
        const actions = [
            {
                text: 'Uredi',
                icon: 'fas fa-edit',
                className: 'btn-primary',
                onclick: `ClientsManager.showEditModal(${client.id})`
            }
        ];

        if (client.is_active) {
            actions.push({
                text: 'Deaktiviraj',
                icon: 'fas fa-ban',
                className: 'btn-warning',
                onclick: `ClientsManager.deactivateClient(${client.id})`
            });
        } else {
            actions.push({
                text: 'Aktiviraj',
                icon: 'fas fa-check',
                className: 'btn-success',
                onclick: `ClientsManager.activateClient(${client.id})`
            });
        }

        actions.push({
            text: 'Obriši',
            icon: 'fas fa-trash',
            className: 'btn-danger',
            onclick: `ClientsManager.deleteClient(${client.id})`
        });

        return App.createActionButtons(actions);
    }

    showCreateModal() {
        this.showClientModal();
    }

    static async showEditModal(clientId) {
        try {
            App.showLoading();
            const client = await window.electronAPI.clients.getById(clientId);
            window.ClientsManager.showClientModal(client);
        } catch (error) {
            console.error('Error loading client:', error);
            App.showNotification('Greška pri učitavanju podataka o klijentu', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showClientModal(client = null) {
        const isEdit = !!client;
        
        const modalContent = `
            <form id="client-form">
                <div class="form-grid">
                    <div class="form-group required">
                        <label for="company-name">Naziv firme:</label>
                        <input type="text" id="company-name" name="company_name" 
                               value="${client?.company_name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="city">Grad:</label>
                        <input type="text" id="city" name="city" 
                               value="${client?.city || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" 
                               value="${client?.email || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Telefon:</label>
                        <input type="tel" id="phone" name="phone" 
                               value="${client?.phone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="pib">PIB:</label>
                        <input type="text" id="pib" name="pib" 
                               value="${client?.pib || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="mb">Matični broj:</label>
                        <input type="text" id="mb" name="mb" 
                               value="${client?.mb || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="address">Adresa:</label>
                    <textarea id="address" name="address" rows="3">${client?.address || ''}</textarea>
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="ClientsManager.handleSubmitClient(${client?.id || null})">
                ${isEdit ? 'Ažuriraj' : 'Kreiraj'} klijenta
            </button>
        `;

        App.createModal(isEdit ? 'Uredi klijenta' : 'Novi klijent', modalContent, modalFooter);
    }

    static async handleSubmitClient(clientId = null) {
        const form = document.getElementById('client-form');
        const formData = new FormData(form);
        
        const clientData = {
            company_name: formData.get('company_name'),
            address: formData.get('address'),
            city: formData.get('city'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            mb: formData.get('mb'),
            pib: formData.get('pib')
        };

        try {
            App.showLoading();
            
            if (clientId) {
                await window.electronAPI.clients.update(clientId, clientData);
                App.showNotification('Klijent je uspešno ažuriran!', 'success');
            } else {
                await window.electronAPI.clients.create(clientData);
                App.showNotification('Klijent je uspešno kreiran!', 'success');
            }
            
            App.closeModal();
            window.ClientsManager.load();
            
        } catch (error) {
            console.error('Error saving client:', error);
            let errorMessage = 'Greška pri čuvanju klijenta';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async deactivateClient(clientId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da deaktivirate ovog klijenta?');
        if (!confirmed) return;

        try {
            await window.electronAPI.clients.deactivate(clientId);
            App.showNotification('Klijent je uspešno deaktiviran!', 'success');
            window.ClientsManager.load();
        } catch (error) {
            console.error('Error deactivating client:', error);
            App.showNotification('Greška pri deaktivaciji klijenta', 'error');
        }
    }

    static async activateClient(clientId) {
        try {
            await window.electronAPI.clients.activate(clientId);
            App.showNotification('Klijent je uspešno aktiviran!', 'success');
            window.ClientsManager.load();
        } catch (error) {
            console.error('Error activating client:', error);
            App.showNotification('Greška pri aktivaciji klijenta', 'error');
        }
    }

    static async deleteClient(clientId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da obrišete ovog klijenta? Ova akcija se ne može poništiti.',
            'Brisanje klijenta'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.clients.delete(clientId);
            App.showNotification('Klijent je uspešno obrisan!', 'success');
            window.ClientsManager.load();
        } catch (error) {
            console.error('Error deleting client:', error);
            let errorMessage = 'Greška pri brisanju klijenta';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize clients manager
window.ClientsManager = new ClientsManager();
