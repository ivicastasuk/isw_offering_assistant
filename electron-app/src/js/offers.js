// Offers manager
class OffersManager {
    constructor() {
        this.offers = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.filters = {
            search: '',
            status: '',
            client_id: '',
            user_id: ''
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New offer button
        const newOfferBtn = document.getElementById('new-offer-btn');
        if (newOfferBtn) {
            newOfferBtn.addEventListener('click', () => this.showCreateModal());
        }

        // Search and filters
        const searchInput = document.getElementById('offers-search');
        const statusFilter = document.getElementById('offers-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.currentPage = 1;
                this.load();
            }, 300));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filters.status = statusFilter.value;
                this.currentPage = 1;
                this.load();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('offers-prev-page');
        const nextBtn = document.getElementById('offers-next-page');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.load();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.load();
                }
            });
        }
    }

    async load() {
        try {
            App.showLoading();
            
            const params = {
                page: this.currentPage,
                limit: 50,
                ...this.filters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '') {
                    delete params[key];
                }
            });

            const response = await window.electronAPI.offers.getAll(params);
            
            this.offers = response.offers || response;
            this.totalPages = response.pagination?.pages || 1;
            
            this.renderTable();
            this.updatePagination();
            
        } catch (error) {
            console.error('Error loading offers:', error);
            App.showNotification('Greška pri učitavanju ponuda', 'error');
        } finally {
            App.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.querySelector('#offers-table tbody');
        
        if (!this.offers || this.offers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">Nema pronađenih ponuda</td>
                </tr>
            `;
            return;
        }

        const html = this.offers.map(offer => `
            <tr>
                <td><strong>${offer.offer_number}</strong></td>
                <td>${offer.client_name}</td>
                <td>${offer.first_name} ${offer.last_name}</td>
                <td>${App.formatDate(offer.created_at)}</td>
                <td>${App.createStatusBadge(offer.status)}</td>
                <td class="text-right">${App.formatCurrency(offer.total_with_tax || 0)}</td>
                <td>
                    ${this.createOfferActionButtons(offer)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createOfferActionButtons(offer) {
        const actions = [];

        // View/Edit button
        actions.push({
            text: 'Otvori',
            icon: 'fas fa-eye',
            className: 'btn-primary',
            onclick: `OffersManager.viewOffer(${offer.id})`
        });

        // PDF button
        if (offer.is_locked) {
            actions.push({
                text: 'PDF',
                icon: 'fas fa-file-pdf',
                className: 'btn-danger',
                onclick: `OffersManager.generatePDF(${offer.id})`
            });
        }

        // Status actions
        if (!offer.is_locked) {
            actions.push({
                text: 'Zaključaj',
                icon: 'fas fa-lock',
                className: 'btn-warning',
                onclick: `OffersManager.lockOffer(${offer.id})`
            });
        }

        // Revision button
        actions.push({
            text: 'Revizija',
            icon: 'fas fa-copy',
            className: 'btn-secondary',
            onclick: `OffersManager.createRevision(${offer.id})`
        });

        return App.createActionButtons(actions);
    }

    updatePagination() {
        const prevBtn = document.getElementById('offers-prev-page');
        const nextBtn = document.getElementById('offers-next-page');
        const pageInfo = document.getElementById('offers-page-info');

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (pageInfo) pageInfo.textContent = `Strana ${this.currentPage} od ${this.totalPages}`;
    }

    async showCreateModal() {
        try {
            // Load clients for selection
            const clients = await window.electronAPI.clients.getAll({ active: true });
            
            const clientOptions = clients.map(client => 
                `<option value="${client.id}">${client.company_name}</option>`
            ).join('');

            const modalContent = `
                <form id="create-offer-form">
                    <div class="form-group required">
                        <label for="client-id">Klijent:</label>
                        <select id="client-id" name="client_id" required>
                            <option value="">Izaberite klijenta...</option>
                            ${clientOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="tax-rate">Stopa PDV-a (%):</label>
                        <input type="number" id="tax-rate" name="tax_rate" value="20" min="0" max="100" step="0.01" required>
                    </div>
                </form>
            `;

            const modalFooter = `
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
                <button type="button" class="btn btn-primary" onclick="OffersManager.handleCreateOffer()">Kreiraj ponudu</button>
            `;

            App.createModal('Nova ponuda', modalContent, modalFooter);

        } catch (error) {
            console.error('Error showing create modal:', error);
            App.showNotification('Greška pri učitavanju podataka', 'error');
        }
    }

    static async handleCreateOffer() {
        const form = document.getElementById('create-offer-form');
        const formData = new FormData(form);
        
        const offerData = {
            client_id: parseInt(formData.get('client_id')),
            tax_rate: parseFloat(formData.get('tax_rate'))
        };

        try {
            App.showLoading();
            
            const newOffer = await window.electronAPI.offers.create(offerData);
            
            App.closeModal();
            App.showNotification('Ponuda je uspešno kreirana!', 'success');
            
            // Refresh the list
            window.OffersManager.load();
            
            // Open the new offer for editing
            setTimeout(() => {
                OffersManager.viewOffer(newOffer.id);
            }, 500);
            
        } catch (error) {
            console.error('Error creating offer:', error);
            App.showNotification('Greška pri kreiranju ponude', 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async viewOffer(offerId) {
        try {
            App.showLoading();
            
            const offer = await window.electronAPI.offers.getById(offerId);
            
            OffersManager.showOfferModal(offer);
            
        } catch (error) {
            console.error('Error loading offer:', error);
            App.showNotification('Greška pri učitavanju ponude', 'error');
        } finally {
            App.hideLoading();
        }
    }

    static showOfferModal(offer) {
        const isLocked = offer.is_locked;
        const canEdit = !isLocked && (window.App.currentUser.role === 'admin' || offer.user_id === window.App.currentUser.id);

        const modalContent = `
            <div class="offer-details">
                <div class="offer-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <div>
                        <h4>Ponuda ${offer.offer_number}</h4>
                        <p class="mb-0 text-muted">${offer.client_name} • ${offer.first_name} ${offer.last_name}</p>
                    </div>
                    <div class="text-right">
                        ${App.createStatusBadge(offer.status)}
                        <br>
                        <small class="text-muted">${App.formatDate(offer.created_at)}</small>
                    </div>
                </div>

                <div class="client-info" style="margin-bottom: 20px; padding: 15px; border: 1px solid #e9ecef; border-radius: 8px;">
                    <h5>Podaci o klijentu</h5>
                    <div class="row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Adresa:</strong> ${offer.client_address || 'N/A'}<br>
                            <strong>Grad:</strong> ${offer.client_city || 'N/A'}<br>
                            <strong>Email:</strong> ${offer.client_email || 'N/A'}
                        </div>
                        <div>
                            <strong>Telefon:</strong> ${offer.client_phone || 'N/A'}<br>
                            <strong>PIB:</strong> ${offer.client_pib || 'N/A'}<br>
                            <strong>MB:</strong> ${offer.client_mb || 'N/A'}
                        </div>
                    </div>
                </div>

                ${canEdit ? `
                    <div class="add-item-section" style="margin-bottom: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                        <h5>Dodaj stavku</h5>
                        <form id="add-item-form" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
                            <div class="form-group mb-0">
                                <label for="product-select">Proizvod:</label>
                                <select id="product-select" name="product_id" required>
                                    <option value="">Izaberite proizvod...</option>
                                </select>
                            </div>
                            <div class="form-group mb-0">
                                <label for="quantity">Količina:</label>
                                <input type="number" id="quantity" name="quantity" step="0.01" min="0.01" required>
                            </div>
                            <div class="form-group mb-0">
                                <label for="unit-price">Jed. cena:</label>
                                <input type="number" id="unit-price" name="unit_price" step="0.01" min="0" required>
                            </div>
                            <div class="form-group mb-0">
                                <label for="discount">Rabat (%):</label>
                                <input type="number" id="discount" name="discount_percent" step="0.01" min="0" max="100" value="0">
                            </div>
                            <button type="submit" class="btn btn-sm btn-primary">
                                <i class="fas fa-plus"></i> Dodaj
                            </button>
                        </form>
                    </div>
                ` : ''}

                <div class="offer-items">
                    <h5>Stavke ponude</h5>
                    <div style="overflow-x: auto;">
                        <table class="table table-sm" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Šifra</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Naziv</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Količina</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Jed. cena</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Rabat %</th>
                                    <th style="padding: 10px; border: 1px solid #dee2e6;">Ukupno</th>
                                    ${canEdit ? '<th style="padding: 10px; border: 1px solid #dee2e6;">Akcije</th>' : ''}
                                </tr>
                            </thead>
                            <tbody id="offer-items-tbody">
                                ${OffersManager.renderOfferItems(offer.items || [], canEdit, offer.id)}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="offer-totals" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <div style="text-align: right;">
                        <div><strong>Ukupno bez PDV:</strong> ${App.formatCurrency(offer.total_amount || 0)}</div>
                        <div><strong>PDV (${offer.tax_rate}%):</strong> ${App.formatCurrency((offer.total_with_tax || 0) - (offer.total_amount || 0))}</div>
                        <div style="font-size: 18px; color: #27ae60;"><strong>UKUPNO SA PDV:</strong> ${App.formatCurrency(offer.total_with_tax || 0)}</div>
                    </div>
                </div>
            </div>
        `;

        const modalFooter = `
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <div>
                    ${!isLocked && canEdit ? `<button type="button" class="btn btn-warning" onclick="OffersManager.lockOffer(${offer.id})">
                        <i class="fas fa-lock"></i> Zaključaj ponudu
                    </button>` : ''}
                    ${isLocked ? `<button type="button" class="btn btn-danger" onclick="OffersManager.generatePDF(${offer.id})">
                        <i class="fas fa-file-pdf"></i> Generiši PDF
                    </button>` : ''}
                </div>
                <div>
                    <button type="button" class="btn btn-secondary" onclick="OffersManager.createRevision(${offer.id})">
                        <i class="fas fa-copy"></i> Kreiraj reviziju
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Zatvori</button>
                </div>
            </div>
        `;

        const modal = App.createModal(`Ponuda ${offer.offer_number}`, modalContent, modalFooter);
        modal.style.maxWidth = '90vw';
        modal.style.width = '1200px';

        // Load products for the add item form
        if (canEdit) {
            OffersManager.loadProductsForAddItem();
            OffersManager.setupAddItemForm(offer.id);
        }
    }

    static renderOfferItems(items, canEdit, offerId) {
        if (!items || items.length === 0) {
            return `<tr><td colspan="${canEdit ? 7 : 6}" class="text-center text-muted" style="padding: 20px;">Nema stavki u ponudi</td></tr>`;
        }

        return items.map(item => `
            <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.code}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.product_name}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${item.quantity}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${App.formatCurrency(item.unit_price)}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${item.discount_percent}%</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>${App.formatCurrency(item.line_total)}</strong></td>
                ${canEdit ? `
                    <td style="padding: 8px; border: 1px solid #dee2e6;">
                        <button class="btn btn-sm btn-danger" onclick="OffersManager.removeItem(${offerId}, ${item.id})" title="Ukloni stavku">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                ` : ''}
            </tr>
        `).join('');
    }

    static async loadProductsForAddItem() {
        try {
            const products = await window.electronAPI.products.getAll({ active: true });
            const productSelect = document.getElementById('product-select');
            
            if (productSelect) {
                productSelect.innerHTML = '<option value="">Izaberite proizvod...</option>' +
                    products.map(product => 
                        `<option value="${product.id}" data-price="${product.price}">${product.code} - ${product.name} (${App.formatCurrency(product.price)})</option>`
                    ).join('');

                // Auto-fill price when product is selected
                productSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.selectedOptions[0];
                    const priceInput = document.getElementById('unit-price');
                    if (selectedOption && priceInput) {
                        priceInput.value = selectedOption.dataset.price || '';
                    }
                });
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    static setupAddItemForm(offerId) {
        const form = document.getElementById('add-item-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await OffersManager.addItem(offerId, form);
            });
        }
    }

    static async addItem(offerId, form) {
        const formData = new FormData(form);
        
        const itemData = {
            product_id: parseInt(formData.get('product_id')),
            quantity: parseFloat(formData.get('quantity')),
            unit_price: parseFloat(formData.get('unit_price')),
            discount_percent: parseFloat(formData.get('discount_percent')) || 0
        };

        try {
            const updatedOffer = await window.electronAPI.offers.addItem(offerId, itemData);
            
            App.showNotification('Stavka je uspešno dodana!', 'success');
            
            // Reset form
            form.reset();
            
            // Refresh the offer modal
            App.closeModal();
            setTimeout(() => {
                OffersManager.viewOffer(offerId);
            }, 100);
            
        } catch (error) {
            console.error('Error adding item:', error);
            App.showNotification('Greška pri dodavanju stavke', 'error');
        }
    }

    static async removeItem(offerId, itemId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da uklonite ovu stavku?');
        if (!confirmed) return;

        try {
            await window.electronAPI.offers.removeItem(offerId, itemId);
            
            App.showNotification('Stavka je uspešno uklonjena!', 'success');
            
            // Refresh the offer modal
            App.closeModal();
            setTimeout(() => {
                OffersManager.viewOffer(offerId);
            }, 100);
            
        } catch (error) {
            console.error('Error removing item:', error);
            App.showNotification('Greška pri uklanjanju stavke', 'error');
        }
    }

    static async lockOffer(offerId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da zaključate ovu ponudu? Nakon zaključavanja nećete moći da je menjate.',
            'Zaključavanje ponude'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.offers.lock(offerId);
            
            App.showNotification('Ponuda je uspešno zaključana!', 'success');
            
            // Refresh the list and close modal
            window.OffersManager.load();
            App.closeModal();
            
        } catch (error) {
            console.error('Error locking offer:', error);
            App.showNotification('Greška pri zaključavanju ponude', 'error');
        }
    }

    static async generatePDF(offerId) {
        try {
            App.showLoading();
            
            const pdfBlob = await window.electronAPI.offers.generatePDF(offerId);
            
            // Create download link
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ponuda-${offerId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            App.showNotification('PDF je uspešno generisan!', 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            App.showNotification('Greška pri generisanju PDF-a', 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async createRevision(offerId) {
        const confirmed = await App.confirmAction(
            'Da li želite da kreirate reviziju ove ponude? Biće kreirana nova ponuda sa istim stavkama.',
            'Kreiranje revizije'
        );
        if (!confirmed) return;

        try {
            App.showLoading();
            
            const newOffer = await window.electronAPI.offers.createRevision(offerId);
            
            App.showNotification('Revizija je uspešno kreirana!', 'success');
            
            // Refresh the list and open new offer
            window.OffersManager.load();
            App.closeModal();
            
            setTimeout(() => {
                OffersManager.viewOffer(newOffer.id);
            }, 500);
            
        } catch (error) {
            console.error('Error creating revision:', error);
            App.showNotification('Greška pri kreiranju revizije', 'error');
        } finally {
            App.hideLoading();
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

// Initialize offers manager
window.OffersManager = new OffersManager();
