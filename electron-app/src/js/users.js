// Users manager (admin only)
class UsersManager {
    constructor() {
        this.users = [];
        this.filters = {
            search: '',
            role: '',
            is_active: 'true'
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New user button
        const newUserBtn = document.getElementById('new-user-btn');
        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => this.showCreateUserModal());
        }

        // Search and filters
        const searchInput = document.getElementById('users-search');
        const roleFilter = document.getElementById('users-role-filter');
        const activeFilter = document.getElementById('users-active-filter');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.load();
            }, 300));
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.filters.role = roleFilter.value;
                this.load();
            });
        }

        if (activeFilter) {
            activeFilter.addEventListener('change', () => {
                this.filters.is_active = activeFilter.value;
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

            this.users = await window.electronAPI.users.getAll(params);
            this.renderTable();
            
        } catch (error) {
            console.error('Error loading users:', error);
            App.showNotification('Greška pri učitavanju korisnika', 'error');
        } finally {
            App.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.querySelector('#users-table tbody');
        
        if (!this.users || this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">Nema pronađenih korisnika</td>
                </tr>
            `;
            return;
        }

        const currentUserId = Auth.getCurrentUser()?.id;

        const html = this.users.map(user => `
            <tr ${user.id === currentUserId ? 'class="table-info"' : ''}>
                <td>
                    <strong>${user.username}</strong>
                    ${user.id === currentUserId ? '<span class="badge badge-info ml-1">Vi</span>' : ''}
                </td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${this.createRoleBadge(user.role)}</td>
                <td>${App.formatDateTime(user.last_login_at)}</td>
                <td>${App.createStatusBadge(user.is_active ? 'active' : 'inactive')}</td>
                <td>
                    ${this.createUserActionButtons(user, currentUserId)}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createRoleBadge(role) {
        const roleConfig = {
            'admin': { text: 'Administrator', class: 'badge-danger' },
            'user': { text: 'Korisnik', class: 'badge-primary' }
        };

        const config = roleConfig[role] || { text: role, class: 'badge-secondary' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    }

    createUserActionButtons(user, currentUserId) {
        const actions = [
            {
                text: 'Uredi',
                icon: 'fas fa-edit',
                className: 'btn-primary',
                onclick: `UsersManager.showEditUserModal(${user.id})`
            }
        ];

        if (user.id !== currentUserId) {
            if (user.is_active) {
                actions.push({
                    text: 'Deaktiviraj',
                    icon: 'fas fa-ban',
                    className: 'btn-warning',
                    onclick: `UsersManager.deactivateUser(${user.id})`
                });
            } else {
                actions.push({
                    text: 'Aktiviraj',
                    icon: 'fas fa-check',
                    className: 'btn-success',
                    onclick: `UsersManager.activateUser(${user.id})`
                });
            }

            actions.push({
                text: 'Resetuj lozinku',
                icon: 'fas fa-key',
                className: 'btn-info',
                onclick: `UsersManager.resetPassword(${user.id})`
            });

            actions.push({
                text: 'Obriši',
                icon: 'fas fa-trash',
                className: 'btn-danger',
                onclick: `UsersManager.deleteUser(${user.id})`
            });
        }

        return App.createActionButtons(actions);
    }

    showCreateUserModal() {
        this.showUserModal();
    }

    static async showEditUserModal(userId) {
        try {
            App.showLoading();
            const user = await window.electronAPI.users.getById(userId);
            window.UsersManager.showUserModal(user);
        } catch (error) {
            console.error('Error loading user:', error);
            App.showNotification('Greška pri učitavanju korisnika', 'error');
        } finally {
            App.hideLoading();
        }
    }

    showUserModal(user = null) {
        const isEdit = !!user;
        
        const modalContent = `
            <form id="user-form">
                <div class="form-grid">
                    <div class="form-group required">
                        <label for="username">Korisničko ime:</label>
                        <input type="text" id="username" name="username" 
                               value="${user?.username || ''}" required ${isEdit ? 'readonly' : ''}>
                        ${isEdit ? '<small class="text-muted">Korisničko ime se ne može menjati</small>' : ''}
                    </div>
                    
                    <div class="form-group required">
                        <label for="full-name">Ime i prezime:</label>
                        <input type="text" id="full-name" name="full_name" 
                               value="${user?.full_name || ''}" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" 
                               value="${user?.email || ''}" required>
                    </div>
                    
                    <div class="form-group required">
                        <label for="role">Uloga:</label>
                        <select id="role" name="role" required>
                            <option value="user" ${user?.role === 'user' ? 'selected' : ''}>Korisnik</option>
                            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrator</option>
                        </select>
                    </div>
                </div>
                
                ${!isEdit ? `
                    <div class="form-grid">
                        <div class="form-group required">
                            <label for="password">Lozinka:</label>
                            <input type="password" id="password" name="password" required minlength="6">
                        </div>
                        
                        <div class="form-group required">
                            <label for="confirm-password">Potvrdi lozinku:</label>
                            <input type="password" id="confirm-password" name="confirm_password" required minlength="6">
                        </div>
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="is-active" name="is_active" 
                               ${user?.is_active !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="is-active">
                            Aktivan korisnik
                        </label>
                    </div>
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="UsersManager.handleSubmitUser(${user?.id || null})">
                ${isEdit ? 'Ažuriraj' : 'Kreiraj'} korisnika
            </button>
        `;

        App.createModal(isEdit ? 'Uredi korisnika' : 'Novi korisnik', modalContent, modalFooter);

        // Add password confirmation validation for new users
        if (!isEdit) {
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            
            const validatePasswords = () => {
                if (passwordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity('Lozinke se ne poklapaju');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
            };
            
            passwordInput.addEventListener('input', validatePasswords);
            confirmPasswordInput.addEventListener('input', validatePasswords);
        }
    }

    static async handleSubmitUser(userId = null) {
        const form = document.getElementById('user-form');
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            role: formData.get('role'),
            is_active: formData.has('is_active')
        };

        if (!userId) {
            userData.password = formData.get('password');
        }

        try {
            App.showLoading();
            
            if (userId) {
                await window.electronAPI.users.update(userId, userData);
                App.showNotification('Korisnik je uspešno ažuriran!', 'success');
            } else {
                await window.electronAPI.users.create(userData);
                App.showNotification('Korisnik je uspešno kreiran!', 'success');
            }
            
            App.closeModal();
            window.UsersManager.load();
            
        } catch (error) {
            console.error('Error saving user:', error);
            let errorMessage = 'Greška pri čuvanju korisnika';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async deactivateUser(userId) {
        const confirmed = await App.confirmAction('Da li ste sigurni da želite da deaktivirate ovog korisnika?');
        if (!confirmed) return;

        try {
            await window.electronAPI.users.deactivate(userId);
            App.showNotification('Korisnik je uspešno deaktiviran!', 'success');
            window.UsersManager.load();
        } catch (error) {
            console.error('Error deactivating user:', error);
            App.showNotification('Greška pri deaktivaciji korisnika', 'error');
        }
    }

    static async activateUser(userId) {
        try {
            await window.electronAPI.users.activate(userId);
            App.showNotification('Korisnik je uspešno aktiviran!', 'success');
            window.UsersManager.load();
        } catch (error) {
            console.error('Error activating user:', error);
            App.showNotification('Greška pri aktivaciji korisnika', 'error');
        }
    }

    static async resetPassword(userId) {
        const modalContent = `
            <form id="reset-password-form">
                <div class="form-group required">
                    <label for="new-password">Nova lozinka:</label>
                    <input type="password" id="new-password" name="password" required minlength="6">
                </div>
                
                <div class="form-group required">
                    <label for="confirm-new-password">Potvrdi novu lozinku:</label>
                    <input type="password" id="confirm-new-password" name="confirm_password" required minlength="6">
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="UsersManager.handleResetPassword(${userId})">
                Resetuj lozinku
            </button>
        `;

        App.createModal('Resetuj lozinku', modalContent, modalFooter);

        // Add password confirmation validation
        const passwordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');
        
        const validatePasswords = () => {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity('Lozinke se ne poklapaju');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        };
        
        passwordInput.addEventListener('input', validatePasswords);
        confirmPasswordInput.addEventListener('input', validatePasswords);
    }

    static async handleResetPassword(userId) {
        const form = document.getElementById('reset-password-form');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const newPassword = formData.get('password');

        try {
            App.showLoading();
            await window.electronAPI.users.resetPassword(userId, { password: newPassword });
            App.showNotification('Lozinka je uspešno resetovana!', 'success');
            App.closeModal();
        } catch (error) {
            console.error('Error resetting password:', error);
            App.showNotification('Greška pri resetovanju lozinke', 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async deleteUser(userId) {
        const confirmed = await App.confirmAction(
            'Da li ste sigurni da želite da obrišete ovog korisnika? Ova akcija se ne može poništiti.',
            'Brisanje korisnika'
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.users.delete(userId);
            App.showNotification('Korisnik je uspešno obrisan!', 'success');
            window.UsersManager.load();
        } catch (error) {
            console.error('Error deleting user:', error);
            let errorMessage = 'Greška pri brisanju korisnika';
            
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

// Initialize users manager
window.UsersManager = new UsersManager();
