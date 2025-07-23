// Sales manager
class SalesManager {
    constructor() {
        this.sales = [];
        this.filters = {
            search: '',
            status: '',
            date_from: '',
            date_to: ''
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search and filters
        const searchInput = document.getElementById('sales-search');
        const statusFilter = document.getElementById('sales-status-filter');
        const dateFromInput = document.getElementById('sales-date-from');
        const dateToInput = document.getElementById('sales-date-to');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.load();
            }, 300));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filters.status = statusFilter.value;
                this.load();
            });
        }

        if (dateFromInput) {
            dateFromInput.addEventListener('change', () => {
                this.filters.date_from = dateFromInput.value;
                this.load();
            });
        }

        if (dateToInput) {
            dateToInput.addEventListener('change', () => {
                this.filters.date_to = dateToInput.value;
                this.load();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-sales-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
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

            this.sales = await window.electronAPI.sales.getAll(params);
            this.renderTable();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Error loading sales:', error);
            App.showNotification('Greška pri učitavanju prodaja', 'error');
        } finally {
            App.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.querySelector('#sales-table tbody');
        
        if (!this.sales || this.sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Nema pronađenih prodaja</td>
                </tr>
            `;
            return;
        }

        const html = this.sales.map(sale => `
            <tr>
                <td><strong>${sale.number}</strong></td>
                <td>${App.formatDate(sale.sale_date)}</td>
                <td>
                    <a href="#" onclick="event.preventDefault(); SalesManager.showClientDetails(${sale.client_id})">
                        ${sale.client_name}
                    </a>
                </td>
                <td class="text-right">${App.formatCurrency(sale.total_amount)}</td>
                <td class="text-right">${App.formatCurrency(sale.tax_amount || 0)}</td>
                <td class="text-right">${App.formatCurrency(sale.total_with_tax)}</td>
                <td>${this.createStatusBadge(sale.status)}</td>
                <td>
                    ${this.createSaleActionButtons(sale)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createStatusBadge(status) {
        const statusConfig = {
            'pending': { text: 'Na čekanju', class: 'badge-warning' },
            'completed': { text: 'Završeno', class: 'badge-success' },
            'cancelled': { text: 'Otkazano', class: 'badge-danger' },
            'invoiced': { text: 'Fakturisano', class: 'badge-info' }
        };

        const config = statusConfig[status] || { text: status, class: 'badge-secondary' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    }

    createSaleActionButtons(sale) {
        const actions = [
            {
                text: 'Detalji',
                icon: 'fas fa-eye',
                className: 'btn-info',
                onclick: `SalesManager.showSaleDetails(${sale.id})`
            }
        ];

        if (sale.status === 'pending') {
            actions.push({
                text: 'Završi',
                icon: 'fas fa-check',
                className: 'btn-success',
                onclick: `SalesManager.completeSale(${sale.id})`
            });
            
            actions.push({
                text: 'Otkaži',
                icon: 'fas fa-times',
                className: 'btn-warning',
                onclick: `SalesManager.cancelSale(${sale.id})`
            });
        }

        if (sale.status === 'completed') {
            actions.push({
                text: 'Fakturiši',
                icon: 'fas fa-file-invoice',
                className: 'btn-primary',
                onclick: `SalesManager.createInvoice(${sale.id})`
            });
        }

        return App.createActionButtons(actions);
    }

    static async showSaleDetails(saleId) {
        try {
            App.showLoading();
            const sale = await window.electronAPI.sales.getById(saleId);
            window.SalesManager.showSaleDetailsModal(sale);
        } catch (error) {
            console.error('Error loading sale details:', error);
            App.showNotification('Greška pri učitavanju detalja prodaje', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showSaleDetailsModal(sale) {
        const itemsHtml = sale.items?.map(item => `
            <tr>
                <td>${item.product_code}</td>
                <td>${item.product_name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${App.formatCurrency(item.unit_price)}</td>
                <td class="text-right">${App.formatCurrency(item.total_price)}</td>
            </tr>
        `).join('') || '';

        const modalContent = `
            <div class="sale-details">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6>Informacije o prodaji</h6>
                        <p><strong>Broj:</strong> ${sale.number}</p>
                        <p><strong>Datum:</strong> ${App.formatDate(sale.sale_date)}</p>
                        <p><strong>Status:</strong> ${this.createStatusBadge(sale.status)}</p>
                        ${sale.notes ? `<p><strong>Napomene:</strong> ${sale.notes}</p>` : ''}
                    </div>
                    <div class="col-md-6">
                        <h6>Klijent</h6>
                        <p><strong>${sale.client_name}</strong></p>
                        ${sale.client_contact ? `<p>Kontakt: ${sale.client_contact}</p>` : ''}
                        ${sale.client_email ? `<p>Email: ${sale.client_email}</p>` : ''}
                    </div>
                </div>
                
                <h6>Stavke prodaje</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Šifra</th>
                                <th>Proizvod</th>
                                <th class="text-center">Količina</th>
                                <th class="text-right">Cena</th>
                                <th class="text-right">Ukupno</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
                
                <div class="sale-totals mt-3">
                    <div class="row">
                        <div class="col-md-6 offset-md-6">
                            <table class="table table-sm">
                                <tr>
                                    <td><strong>Ukupno bez PDV:</strong></td>
                                    <td class="text-right"><strong>${App.formatCurrency(sale.total_amount)}</strong></td>
                                </tr>
                                ${sale.tax_amount ? `
                                <tr>
                                    <td>PDV (${sale.tax_rate}%):</td>
                                    <td class="text-right">${App.formatCurrency(sale.tax_amount)}</td>
                                </tr>
                                <tr class="table-info">
                                    <td><strong>Ukupno sa PDV:</strong></td>
                                    <td class="text-right"><strong>${App.formatCurrency(sale.total_with_tax)}</strong></td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Zatvori</button>
            ${sale.status === 'pending' ? `
                <button type="button" class="btn btn-warning" onclick="SalesManager.cancelSale(${sale.id}); App.closeModal();">Otkaži prodaju</button>
                <button type="button" class="btn btn-success" onclick="SalesManager.completeSale(${sale.id}); App.closeModal();">Završi prodaju</button>
            ` : ''}
            ${sale.status === 'completed' ? `
                <button type="button" class="btn btn-primary" onclick="SalesManager.createInvoice(${sale.id}); App.closeModal();">Kreiraj fakturu</button>
            ` : ''}
        `;

        App.createModal(`Prodaja ${sale.number}`, modalContent, modalFooter, 'modal-lg');
    }

    static async completeSale(saleId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da završite ovu prodaju?');
        if (!confirmed) return;

        try {
            await window.electronAPI.sales.updateStatus(saleId, 'completed');
            App.showNotification('Prodaja je uspešno završena!', 'success');
            window.SalesManager.load();
        } catch (error) {
            console.error('Error completing sale:', error);
            App.showNotification('Greška pri završavanju prodaje', 'error');
        }
    }

    static async cancelSale(saleId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da otkažete ovu prodaju?');
        if (!confirmed) return;

        try {
            await window.electronAPI.sales.updateStatus(saleId, 'cancelled');
            App.showNotification('Prodaja je uspešno otkazana!', 'success');
            window.SalesManager.load();
        } catch (error) {
            console.error('Error cancelling sale:', error);
            App.showNotification('Greška pri otkazivanju prodaje', 'error');
        }
    }

    static async createInvoice(saleId) {
        try {
            App.showLoading();
            const result = await window.electronAPI.sales.createInvoice(saleId);
            
            if (result.success) {
                App.showNotification('Faktura je uspešno kreirana!', 'success');
                window.SalesManager.load();
                
                // Optionally open the invoice
                const openInvoice = await App.confirmAction('Da li želite da otvorite kreiranu fakturu?');
                if (openInvoice && result.invoicePath) {
                    await window.electronAPI.system.openFile(result.invoicePath);
                }
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            App.showNotification('Greška pri kreiranju fakture', 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async showClientDetails(clientId) {
        try {
            const client = await window.electronAPI.clients.getById(clientId);
            
            const modalContent = `
                <div class="client-info">
                    <h6>Osnovne informacije</h6>
                    <p><strong>Naziv:</strong> ${client.name}</p>
                    <p><strong>PIB:</strong> ${client.pib || 'N/A'}</p>
                    <p><strong>Matični broj:</strong> ${client.mb || 'N/A'}</p>
                    
                    <h6 class="mt-3">Kontakt informacije</h6>
                    <p><strong>Kontakt osoba:</strong> ${client.contact_person || 'N/A'}</p>
                    <p><strong>Telefon:</strong> ${client.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
                    
                    <h6 class="mt-3">Adresa</h6>
                    <p>${client.address || 'N/A'}</p>
                    <p>${client.city || ''} ${client.postal_code || ''}</p>
                </div>
            `;

            App.createModal(`Klijent: ${client.name}`, modalContent, 
                '<button type="button" class="btn btn-secondary" onclick="App.closeModal()">Zatvori</button>');
        } catch (error) {
            console.error('Error loading client details:', error);
            App.showNotification('Greška pri učitavanju podataka o klijentu', 'error');
        }
    }

    updateStatistics() {
        if (!this.sales) return;

        const stats = {
            total_sales: this.sales.length,
            total_amount: this.sales.reduce((sum, sale) => sum + parseFloat(sale.total_with_tax || sale.total_amount), 0),
            pending_sales: this.sales.filter(sale => sale.status === 'pending').length,
            completed_sales: this.sales.filter(sale => sale.status === 'completed').length
        };

        // Update statistics cards if they exist
        const totalSalesEl = document.getElementById('total-sales-count');
        const totalAmountEl = document.getElementById('total-sales-amount');
        const pendingSalesEl = document.getElementById('pending-sales-count');
        const completedSalesEl = document.getElementById('completed-sales-count');

        if (totalSalesEl) totalSalesEl.textContent = stats.total_sales;
        if (totalAmountEl) totalAmountEl.textContent = App.formatCurrency(stats.total_amount);
        if (pendingSalesEl) pendingSalesEl.textContent = stats.pending_sales;
        if (completedSalesEl) completedSalesEl.textContent = stats.completed_sales;
    }

    clearFilters() {
        this.filters = {
            search: '',
            status: '',
            date_from: '',
            date_to: ''
        };

        // Clear UI elements
        const searchInput = document.getElementById('sales-search');
        const statusFilter = document.getElementById('sales-status-filter');
        const dateFromInput = document.getElementById('sales-date-from');
        const dateToInput = document.getElementById('sales-date-to');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';

        this.load();
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

// Initialize sales manager
window.SalesManager = new SalesManager();
