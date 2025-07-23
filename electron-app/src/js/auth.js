// Authentication manager
class AuthManager {
    constructor() {
        this.setupLoginForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e.target);
        });
    }

    async handleLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            App.showLoading();
            
            const response = await window.electronAPI.auth.login(credentials);
            
            // Store auth data using Electron storage
            await window.electronAPI.storage.setItem('auth_token', response.token);
            await window.electronAPI.storage.setItem('user_data', JSON.stringify(response.user));
            
            // Update app state
            window.App.currentUser = response.user;
            window.App.showMainApp();
            
            App.showNotification('Uspešno ste se prijavili!', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Greška pri prijavi';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            App.showNotification(errorMessage, 'error');
        } finally {
            App.hideLoading();
        }
    }

    static async changePassword(currentPassword, newPassword) {
        try {
            App.showLoading();
            
            await window.electronAPI.auth.changePassword({
                currentPassword,
                newPassword
            });
            
            App.showNotification('Šifra je uspešno promenjena!', 'success');
            return true;
            
        } catch (error) {
            console.error('Change password error:', error);
            let errorMessage = 'Greška pri promeni šifre';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            
            App.showNotification(errorMessage, 'error');
            return false;
        } finally {
            App.hideLoading();
        }
    }

    static showChangePasswordModal() {
        const modalContent = `
            <form id="change-password-form">
                <div class="form-group">
                    <label for="current-password">Trenutna šifra:</label>
                    <input type="password" id="current-password" name="currentPassword" required>
                </div>
                
                <div class="form-group">
                    <label for="new-password">Nova šifra:</label>
                    <input type="password" id="new-password" name="newPassword" required minlength="6">
                </div>
                
                <div class="form-group">
                    <label for="confirm-password">Potvrdi novu šifru:</label>
                    <input type="password" id="confirm-password" name="confirmPassword" required minlength="6">
                </div>
            </form>
        `;

        const modalFooter = `
            <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="AuthManager.handleChangePassword()">Promeni šifru</button>
        `;

        App.createModal('Promena šifre', modalContent, modalFooter);
    }

    static async handleChangePassword() {
        const form = document.getElementById('change-password-form');
        const formData = new FormData(form);
        
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Validacija
        if (newPassword !== confirmPassword) {
            App.showNotification('Nova šifra i potvrda se ne poklapaju', 'error');
            return;
        }

        if (newPassword.length < 6) {
            App.showNotification('Nova šifra mora imati najmanje 6 karaktera', 'error');
            return;
        }

        const success = await AuthManager.changePassword(currentPassword, newPassword);
        if (success) {
            App.closeModal();
        }
    }
}

// Initialize authentication manager
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
