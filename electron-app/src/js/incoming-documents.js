// Incoming Documents manager
class IncomingDocumentsManager {
    constructor() {
        this.documents = [];
        this.filters = {
            search: '',
            status: '',
            document_type: '',
            date_from: '',
            date_to: ''
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New document button
        const newDocumentBtn = document.getElementById('new-document-btn');
        if (newDocumentBtn) {
            newDocumentBtn.addEventListener('click', () => this.showCreateDocumentModal());
        }

        // Search and filters
        const searchInput = document.getElementById('documents-search');
        const statusFilter = document.getElementById('documents-status-filter');
        const typeFilter = document.getElementById('documents-type-filter');
        const dateFromInput = document.getElementById('documents-date-from');
        const dateToInput = document.getElementById('documents-date-to');

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

        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.filters.document_type = typeFilter.value;
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
        const clearFiltersBtn = document.getElementById('clear-documents-filters');
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

            this.documents = await window.electronAPI.incomingDocuments.getAll(params);
            this.renderTable();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Error loading documents:', error);
            App.showNotification('Greška pri učitavanju dokumenata', 'error');
        } finally {
            App.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.querySelector('#documents-table tbody');
        
        if (!this.documents || this.documents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Nema pronađenih dokumenata</td>
                </tr>
            `;
            return;
        }

        const html = this.documents.map(doc => `
            <tr>
                <td><strong>${doc.number}</strong></td>
                <td>${App.formatDate(doc.document_date)}</td>
                <td>${this.getDocumentTypeLabel(doc.document_type)}</td>
                <td>${doc.sender_name}</td>
                <td>${doc.subject}</td>
                <td>${this.createStatusBadge(doc.status)}</td>
                <td class="text-center">
                    ${doc.file_path ? `<i class="fas fa-paperclip text-success" title="Ima prilog"></i>` : ''}
                </td>
                <td>
                    ${this.createDocumentActionButtons(doc)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    getDocumentTypeLabel(type) {
        const types = {
            'invoice': 'Faktura',
            'offer': 'Ponuda',
            'order': 'Narudžbenica',
            'complaint': 'Reklamacija',
            'contract': 'Ugovor',
            'other': 'Ostalo'
        };
        return types[type] || type;
    }

    createStatusBadge(status) {
        const statusConfig = {
            'pending': { text: 'Na čekanju', class: 'badge-warning' },
            'processing': { text: 'U obradi', class: 'badge-info' },
            'completed': { text: 'Završeno', class: 'badge-success' },
            'archived': { text: 'Arhivirano', class: 'badge-secondary' }
        };

        const config = statusConfig[status] || { text: status, class: 'badge-secondary' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    }

    createDocumentActionButtons(doc) {
        const actions = [
            {
                text: 'Detalji',
                icon: 'fas fa-eye',
                className: 'btn-info',
                onclick: `IncomingDocumentsManager.showDocumentDetails(${doc.id})`
            },
            {
                text: 'Uredi',
                icon: 'fas fa-edit',
                className: 'btn-primary',
                onclick: `IncomingDocumentsManager.showEditDocumentModal(${doc.id})`
            }
        ];

        if (doc.file_path) {
            actions.push({
                text: 'Otvori',
                icon: 'fas fa-external-link-alt',
                className: 'btn-success',
                onclick: `IncomingDocumentsManager.openDocument(${doc.id})`
            });
        }

        if (doc.status !== 'archived') {
            actions.push({
                text: 'Arhiviraj',
                icon: 'fas fa-archive',
                className: 'btn-warning',
                onclick: `IncomingDocumentsManager.archiveDocument(${doc.id})`
            });
        }

        actions.push({
            text: 'Obriši',
            icon: 'fas fa-trash',
            className: 'btn-danger',
            onclick: `IncomingDocumentsManager.deleteDocument(${doc.id})`
        });

        return App.createActionButtons(actions);
    }

    showCreateDocumentModal() {
        this.showDocumentModal();
    }

    static async showEditDocumentModal(documentId) {
        try {
            App.showLoading();
            const document = await window.electronAPI.incomingDocuments.getById(documentId);
            window.IncomingDocumentsManager.showDocumentModal(document);
        } catch (error) {
            console.error('Error loading document:', error);
            App.showNotification('Greška pri učitavanju dokumenta', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showDocumentModal(document = null) {
        const isEdit = !!document;
        
        const modalContent = `
            <form id="document-form" enctype="multipart/form-data">
                <div class="form-grid">
                    <div class="form-group required">
                        <label for="document-number">Broj dokumenta:</label>
                        <input type="text" id="document-number" name="number" 
                               value="${document?.number || ''}" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="document-date">Datum dokumenta:</label>
                        <input type="date" id="document-date" name="document_date" 
                               value="${document?.document_date?.split('T')[0] || ''}" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="document-type">Tip dokumenta:</label>
                        <select id="document-type" name="document_type" required>
                            <option value="">Izaberite tip</option>
                            <option value="invoice" ${document?.document_type === 'invoice' ? 'selected' : ''}>Faktura</option>
                            <option value="offer" ${document?.document_type === 'offer' ? 'selected' : ''}>Ponuda</option>
                            <option value="order" ${document?.document_type === 'order' ? 'selected' : ''}>Narudžbenica</option>
                            <option value="complaint" ${document?.document_type === 'complaint' ? 'selected' : ''}>Reklamacija</option>
                            <option value="contract" ${document?.document_type === 'contract' ? 'selected' : ''}>Ugovor</option>
                            <option value="other" ${document?.document_type === 'other' ? 'selected' : ''}>Ostalo</option>
                        </select>
                    </div>
                    
                    <div class="form-group required">
                        <label for="sender-name">Pošaljilac:</label>
                        <input type="text" id="sender-name" name="sender_name" 
                               value="${document?.sender_name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="sender-contact">Kontakt pošaljioca:</label>
                        <input type="text" id="sender-contact" name="sender_contact" 
                               value="${document?.sender_contact || ''}">
                    </div>
                    
                    <div class="form-group required">
                        <label for="status">Status:</label>
                        <select id="status" name="status" required>
                            <option value="pending" ${document?.status === 'pending' ? 'selected' : ''}>Na čekanju</option>
                            <option value="processing" ${document?.status === 'processing' ? 'selected' : ''}>U obradi</option>
                            <option value="completed" ${document?.status === 'completed' ? 'selected' : ''}>Završeno</option>
                            <option value="archived" ${document?.status === 'archived' ? 'selected' : ''}>Arhivirano</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group required">
                    <label for="subject">Predmet:</label>
                    <input type="text" id="subject" name="subject" 
                           value="${document?.subject || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="description">Opis:</label>
                    <textarea id="description" name="description" rows="3">${document?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="document-file">Priloženi dokument:</label>
                    <input type="file" id="document-file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                    ${document?.file_name ? `<p class="text-muted mt-1">Trenutni fajl: ${document.file_name}</p>` : ''}
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="IncomingDocumentsManager.handleSubmitDocument(${document?.id || null})">
                ${isEdit ? 'Ažuriraj' : 'Kreiraj'} dokument
            </button>
        `;

        App.createModal(isEdit ? 'Uredi dokument' : 'Novi dokument', modalContent, modalFooter);
    }

    static async handleSubmitDocument(documentId = null) {
        const form = document.getElementById('document-form');
        const formData = new FormData(form);

        try {
            App.showLoading();
            
            if (documentId) {
                await window.electronAPI.incomingDocuments.update(documentId, formData);
                App.showNotification('Dokument je uspešno ažuriran!', 'success');
            } else {
                await window.electronAPI.incomingDocuments.create(formData);
                App.showNotification('Dokument je uspešno kreiran!', 'success');
            }
            
            App.closeModal();
            window.IncomingDocumentsManager.load();
            
        } catch (error) {
            console.error('Error saving document:', error);
            let errorMessage = 'Greška pri čuvanju dokumenta';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async showDocumentDetails(documentId) {
        try {
            App.showLoading();
            const document = await window.electronAPI.incomingDocuments.getById(documentId);
            window.IncomingDocumentsManager.showDocumentDetailsModal(document);
        } catch (error) {
            console.error('Error loading document details:', error);
            App.showNotification('Greška pri učitavanju detalja dokumenta', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showDocumentDetailsModal(document) {
        const modalContent = `
            <div class="document-details">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6>Osnovne informacije</h6>
                        <p><strong>Broj:</strong> ${document.number}</p>
                        <p><strong>Datum:</strong> ${App.formatDate(document.document_date)}</p>
                        <p><strong>Tip:</strong> ${this.getDocumentTypeLabel(document.document_type)}</p>
                        <p><strong>Status:</strong> ${this.createStatusBadge(document.status)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Pošaljilac</h6>
                        <p><strong>${document.sender_name}</strong></p>
                        ${document.sender_contact ? `<p>Kontakt: ${document.sender_contact}</p>` : ''}
                    </div>
                </div>
                
                <div class="mb-3">
                    <h6>Predmet</h6>
                    <p>${document.subject}</p>
                </div>
                
                ${document.description ? `
                    <div class="mb-3">
                        <h6>Opis</h6>
                        <p>${document.description}</p>
                    </div>
                ` : ''}
                
                ${document.file_name ? `
                    <div class="mb-3">
                        <h6>Priloženi dokument</h6>
                        <p>
                            <i class="fas fa-paperclip"></i> 
                            ${document.file_name}
                            <button type="button" class="btn btn-sm btn-primary ml-2" 
                                    onclick="IncomingDocumentsManager.openDocument(${document.id})">
                                <i class="fas fa-external-link-alt"></i> Otvori
                            </button>
                        </p>
                    </div>
                ` : ''}
                
                <div class="document-timeline">
                    <h6>Vremenska linija</h6>
                    <p><strong>Kreiran:</strong> ${App.formatDateTime(document.created_at)}</p>
                    ${document.updated_at !== document.created_at ? 
                        `<p><strong>Poslednje ažuriranje:</strong> ${App.formatDateTime(document.updated_at)}</p>` : ''}
                </div>
            </div>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Zatvori</button>
            <button type="button" class="btn btn-primary" onclick="IncomingDocumentsManager.showEditDocumentModal(${document.id}); App.closeModal();">Uredi</button>
            ${document.status !== 'archived' ? `
                <button type="button" class="btn btn-warning" onclick="IncomingDocumentsManager.archiveDocument(${document.id}); App.closeModal();">Arhiviraj</button>
            ` : ''}
        `;

        App.createModal(`Dokument ${document.number}`, modalContent, modalFooter, 'modal-lg');
    }

    static async openDocument(documentId) {
        try {
            const result = await window.electronAPI.incomingDocuments.openFile(documentId);
            if (!result.success) {
                App.showNotification('Greška pri otvaranju dokumenta', 'error');
            }
        } catch (error) {
            console.error('Error opening document:', error);
            App.showNotification('Greška pri otvaranju dokumenta', 'error');
        }
    }

    static async archiveDocument(documentId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da arhivirate ovaj dokument?');
        if (!confirmed) return;

        try {
            await window.electronAPI.incomingDocuments.updateStatus(documentId, 'archived');
            App.showNotification('Dokument je uspešno arhiviran!', 'success');
            window.IncomingDocumentsManager.load();
        } catch (error) {
            console.error('Error archiving document:', error);
            App.showNotification('Greška pri arhiviranju dokumenta', 'error');
        }
    }

    static async deleteDocument(documentId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da obrišete ovaj dokument? Ova akcija se ne može poništiti.',
            'Brisanje dokumenta'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.incomingDocuments.delete(documentId);
            App.showNotification('Dokument je uspešno obrisan!', 'success');
            window.IncomingDocumentsManager.load();
        } catch (error) {
            console.error('Error deleting document:', error);
            let errorMessage = 'Greška pri brisanju dokumenta';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        }
    }

    updateStatistics() {
        if (!this.documents) return;

        const stats = {
            total_documents: this.documents.length,
            pending_documents: this.documents.filter(doc => doc.status === 'pending').length,
            processing_documents: this.documents.filter(doc => doc.status === 'processing').length,
            completed_documents: this.documents.filter(doc => doc.status === 'completed').length
        };

        // Update statistics cards if they exist
        const totalDocsEl = document.getElementById('total-documents-count');
        const pendingDocsEl = document.getElementById('pending-documents-count');
        const processingDocsEl = document.getElementById('processing-documents-count');
        const completedDocsEl = document.getElementById('completed-documents-count');

        if (totalDocsEl) totalDocsEl.textContent = stats.total_documents;
        if (pendingDocsEl) pendingDocsEl.textContent = stats.pending_documents;
        if (processingDocsEl) processingDocsEl.textContent = stats.processing_documents;
        if (completedDocsEl) completedDocsEl.textContent = stats.completed_documents;
    }

    clearFilters() {
        this.filters = {
            search: '',
            status: '',
            document_type: '',
            date_from: '',
            date_to: ''
        };

        // Clear UI elements
        const searchInput = document.getElementById('documents-search');
        const statusFilter = document.getElementById('documents-status-filter');
        const typeFilter = document.getElementById('documents-type-filter');
        const dateFromInput = document.getElementById('documents-date-from');
        const dateToInput = document.getElementById('documents-date-to');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (typeFilter) typeFilter.value = '';
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

// Initialize incoming documents manager
window.IncomingDocumentsManager = new IncomingDocumentsManager();
