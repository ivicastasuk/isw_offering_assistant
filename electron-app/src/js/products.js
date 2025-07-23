// Products manager
class ProductsManager {
    constructor() {
        this.products = [];
        this.productGroups = [];
        this.filters = {
            search: '',
            group_id: '',
            active: 'true'
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New product and group buttons
        const newProductBtn = document.getElementById('new-product-btn');
        const newGroupBtn = document.getElementById('new-product-group-btn');
        
        if (newProductBtn) {
            newProductBtn.addEventListener('click', () => this.showCreateProductModal());
        }
        
        if (newGroupBtn) {
            newGroupBtn.addEventListener('click', () => this.showCreateGroupModal());
        }

        // Search and filters
        const searchInput = document.getElementById('products-search');
        const groupFilter = document.getElementById('products-group-filter');
        const activeFilter = document.getElementById('products-active-filter');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.load();
            }, 300));
        }

        if (groupFilter) {
            groupFilter.addEventListener('change', () => {
                this.filters.group_id = groupFilter.value;
                this.load();
            });
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
            
            // Load products and groups in parallel
            const [productsPromise, groupsPromise] = await Promise.allSettled([
                this.loadProducts(),
                this.loadProductGroups()
            ]);

            if (productsPromise.status === 'fulfilled') {
                this.renderTable();
            }

            if (groupsPromise.status === 'fulfilled') {
                this.updateGroupFilter();
            }
            
        } catch (error) {
            console.error('Error loading products:', error);
            App.showNotification('Greška pri učitavanju proizvoda', 'error');
        } finally {
            App.hideLoading();
        }
    }

    async loadProducts() {
        const params = { ...this.filters };
        
        // Remove empty filters
        Object.keys(params).forEach(key => {
            if (params[key] === '') {
                delete params[key];
            }
        });

        this.products = await window.electronAPI.products.getAll(params);
    }

    async loadProductGroups() {
        this.productGroups = await window.electronAPI.products.getAllGroups();
    }

    updateGroupFilter() {
        const groupFilter = document.getElementById('products-group-filter');
        if (groupFilter && this.productGroups) {
            const currentValue = groupFilter.value;
            
            groupFilter.innerHTML = '<option value="">Sve grupe</option>' +
                this.productGroups.map(group => 
                    `<option value="${group.id}">${group.name} (${group.product_count})</option>`
                ).join('');
            
            groupFilter.value = currentValue;
        }
    }

    renderTable() {
        const tbody = document.querySelector('#products-table tbody');
        
        if (!this.products || this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">Nema pronađenih proizvoda</td>
                </tr>
            `;
            return;
        }

        const html = this.products.map(product => `
            <tr>
                <td><strong>${product.code}</strong></td>
                <td>${product.name}</td>
                <td>${product.manufacturer || ''}</td>
                <td>${product.group_name || 'Neraspoređeno'}</td>
                <td class="text-right">${App.formatCurrency(product.price)}</td>
                <td>${App.createStatusBadge(product.is_active ? 'active' : 'inactive')}</td>
                <td>
                    ${this.createProductActionButtons(product)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createProductActionButtons(product) {
        const actions = [
            {
                text: 'Uredi',
                icon: 'fas fa-edit',
                className: 'btn-primary',
                onclick: `ProductsManager.showEditProductModal(${product.id})`
            }
        ];

        if (product.is_active) {
            actions.push({
                text: 'Deaktiviraj',
                icon: 'fas fa-ban',
                className: 'btn-warning',
                onclick: `ProductsManager.deactivateProduct(${product.id})`
            });
        } else {
            actions.push({
                text: 'Aktiviraj',
                icon: 'fas fa-check',
                className: 'btn-success',
                onclick: `ProductsManager.activateProduct(${product.id})`
            });
        }

        actions.push({
            text: 'Obriši',
            icon: 'fas fa-trash',
            className: 'btn-danger',
            onclick: `ProductsManager.deleteProduct(${product.id})`
        });

        return App.createActionButtons(actions);
    }

    showCreateProductModal() {
        this.showProductModal();
    }

    static async showEditProductModal(productId) {
        try {
            App.showLoading();
            const product = await window.electronAPI.products.getById(productId);
            window.ProductsManager.showProductModal(product);
        } catch (error) {
            console.error('Error loading product:', error);
            App.showNotification('Greška pri učitavanju podataka o proizvodu', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showProductModal(product = null) {
        const isEdit = !!product;
        
        const groupOptions = this.productGroups?.map(group => 
            `<option value="${group.id}" ${product?.group_id === group.id ? 'selected' : ''}>${group.name}</option>`
        ).join('') || '';

        const modalContent = `
            <form id="product-form">
                <div class="form-grid">
                    <div class="form-group required">
                        <label for="product-code">Šifra proizvoda:</label>
                        <input type="text" id="product-code" name="code" 
                               value="${product?.code || ''}" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="product-name">Naziv proizvoda:</label>
                        <input type="text" id="product-name" name="name" 
                               value="${product?.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="manufacturer">Proizvođač:</label>
                        <input type="text" id="manufacturer" name="manufacturer" 
                               value="${product?.manufacturer || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="model">Model:</label>
                        <input type="text" id="model" name="model" 
                               value="${product?.model || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="product-group">Grupa proizvoda:</label>
                        <select id="product-group" name="group_id">
                            <option value="">Bez grupe</option>
                            ${groupOptions}
                        </select>
                    </div>
                    
                    <div class="form-group required">
                        <label for="price">Cena (RSD):</label>
                        <input type="number" id="price" name="price" step="0.01" min="0"
                               value="${product?.price || ''}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="description">Opis:</label>
                    <textarea id="description" name="description" rows="3">${product?.description || ''}</textarea>
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="ProductsManager.handleSubmitProduct(${product?.id || null})">
                ${isEdit ? 'Ažuriraj' : 'Kreiraj'} proizvod
            </button>
        `;

        App.createModal(isEdit ? 'Uredi proizvod' : 'Novi proizvod', modalContent, modalFooter);
    }

    static async handleSubmitProduct(productId = null) {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        const productData = {
            code: formData.get('code'),
            name: formData.get('name'),
            description: formData.get('description'),
            manufacturer: formData.get('manufacturer'),
            model: formData.get('model'),
            group_id: formData.get('group_id') ? parseInt(formData.get('group_id')) : null,
            price: parseFloat(formData.get('price'))
        };

        try {
            App.showLoading();
            
            if (productId) {
                await window.electronAPI.products.update(productId, productData);
                App.showNotification('Proizvod je uspešno ažuriran!', 'success');
            } else {
                await window.electronAPI.products.create(productData);
                App.showNotification('Proizvod je uspešno kreiran!', 'success');
            }
            
            App.closeModal();
            window.ProductsManager.load();
            
        } catch (error) {
            console.error('Error saving product:', error);
            let errorMessage = 'Greška pri čuvanju proizvoda';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async deactivateProduct(productId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da deaktivirate ovaj proizvod?');
        if (!confirmed) return;

        try {
            await window.electronAPI.products.deactivate(productId);
            App.showNotification('Proizvod je uspešno deaktiviran!', 'success');
            window.ProductsManager.load();
        } catch (error) {
            console.error('Error deactivating product:', error);
            App.showNotification('Greška pri deaktivaciji proizvoda', 'error');
        }
    }

    static async activateProduct(productId) {
        try {
            await window.electronAPI.products.activate(productId);
            App.showNotification('Proizvod je uspešno aktiviran!', 'success');
            window.ProductsManager.load();
        } catch (error) {
            console.error('Error activating product:', error);
            App.showNotification('Greška pri aktivaciji proizvoda', 'error');
        }
    }

    static async deleteProduct(productId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da obrišete ovaj proizvod? Ova akcija se ne može poništiti.',
            'Brisanje proizvoda'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.products.delete(productId);
            App.showNotification('Proizvod je uspešno obrisan!', 'success');
            window.ProductsManager.load();
        } catch (error) {
            console.error('Error deleting product:', error);
            let errorMessage = 'Greška pri brisanju proizvoda';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        }
    }

    // Product Groups
    showCreateGroupModal() {
        this.showGroupModal();
    }

    static async showEditGroupModal(groupId) {
        try {
            const group = window.ProductsManager.productGroups.find(g => g.id === groupId);
            if (group) {
                window.ProductsManager.showGroupModal(group);
            }
        } catch (error) {
            console.error('Error loading group:', error);
            App.showNotification('Greška pri učitavanju grupe', 'error');
        }
    }

    showGroupModal(group = null) {
        const isEdit = !!group;
        
        const modalContent = `
            <form id="group-form">
                <div class="form-group required">
                    <label for="group-name">Naziv grupe:</label>
                    <input type="text" id="group-name" name="name" 
                           value="${group?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="group-description">Opis:</label>
                    <textarea id="group-description" name="description" rows="3">${group?.description || ''}</textarea>
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="ProductsManager.handleSubmitGroup(${group?.id || null})">
                ${isEdit ? 'Ažuriraj' : 'Kreiraj'} grupu
            </button>
        `;

        App.createModal(isEdit ? 'Uredi grupu proizvoda' : 'Nova grupa proizvoda', modalContent, modalFooter);
    }

    static async handleSubmitGroup(groupId = null) {
        const form = document.getElementById('group-form');
        const formData = new FormData(form);
        
        const groupData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        try {
            App.showLoading();
            
            if (groupId) {
                await window.electronAPI.products.updateGroup(groupId, groupData);
                App.showNotification('Grupa je uspešno ažurirana!', 'success');
            } else {
                await window.electronAPI.products.createGroup(groupData);
                App.showNotification('Grupa je uspešno kreirana!', 'success');
            }
            
            App.closeModal();
            window.ProductsManager.load();
            
        } catch (error) {
            console.error('Error saving group:', error);
            let errorMessage = 'Greška pri čuvanju grupe';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async deleteGroup(groupId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da obrišete ovu grupu? Svi proizvodi u grupi će biti prebačeni u "Neraspoređeno".',
            'Brisanje grupe'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.products.deleteGroup(groupId);
            App.showNotification('Grupa je uspešno obrisana!', 'success');
            window.ProductsManager.load();
        } catch (error) {
            console.error('Error deleting group:', error);
            let errorMessage = 'Greška pri brisanju grupe';
            
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

// Initialize products manager
window.ProductsManager = new ProductsManager();
