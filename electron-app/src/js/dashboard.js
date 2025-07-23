// Dashboard manager
class Dashboard {
    constructor() {
        this.stats = {
            totalOffers: 0,
            totalClients: 0,
            totalProducts: 0,
            totalSales: 0
        };
    }

    async load() {
        try {
            App.showLoading();
            await this.loadStats();
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            App.showNotification('Greška pri učitavanju dashboard-a', 'error');
        } finally {
            App.hideLoading();
        }
    }

    async loadStats() {
        try {
            // Load statistics from different endpoints
            const [offers, clients, products, sales] = await Promise.allSettled([
                window.electronAPI.offers.getAll({ limit: 1 }),
                window.electronAPI.clients.getAll({ limit: 1 }),
                window.electronAPI.products.getAll({ limit: 1 }),
                window.electronAPI.sales.getAll({ limit: 1 })
            ]);

            // Update stats
            if (offers.status === 'fulfilled') {
                this.stats.totalOffers = offers.value.pagination?.total || offers.value.offers?.length || 0;
            }

            if (clients.status === 'fulfilled') {
                this.stats.totalClients = clients.value.length || 0;
            }

            if (products.status === 'fulfilled') {
                this.stats.totalProducts = products.value.length || 0;
            }

            if (sales.status === 'fulfilled') {
                this.stats.totalSales = sales.value.pagination?.total || sales.value.sales?.length || 0;
            }

            this.updateStatsDisplay();

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay() {
        document.getElementById('total-offers').textContent = this.stats.totalOffers;
        document.getElementById('total-clients').textContent = this.stats.totalClients;
        document.getElementById('total-products').textContent = this.stats.totalProducts;
        document.getElementById('total-sales').textContent = this.stats.totalSales;
    }

    async loadRecentActivity() {
        try {
            // Load recent offers
            const response = await window.electronAPI.offers.getAll({ 
                limit: 10,
                page: 1
            });

            const recentOffers = response.offers || response;
            this.displayRecentOffers(recentOffers);

        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.displayRecentOffers([]);
        }
    }

    displayRecentOffers(offers) {
        const container = document.getElementById('recent-offers');
        
        if (!offers || offers.length === 0) {
            container.innerHTML = '<p class="text-muted">Nema poslednih aktivnosti</p>';
            return;
        }

        const html = offers.map(offer => `
            <div class="activity-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #e9ecef;
            ">
                <div>
                    <strong>Ponuda ${offer.offer_number}</strong>
                    <br>
                    <small class="text-muted">
                        ${offer.client_name} • ${offer.first_name} ${offer.last_name}
                    </small>
                </div>
                <div class="text-right">
                    ${App.createStatusBadge(offer.status)}
                    <br>
                    <small class="text-muted">${App.formatDate(offer.created_at)}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // Quick actions
    static createNewOffer() {
        window.App.navigateToSection('offers');
        setTimeout(() => {
            if (window.OffersManager) {
                window.OffersManager.showCreateModal();
            }
        }, 100);
    }

    static createNewClient() {
        window.App.navigateToSection('clients');
        setTimeout(() => {
            if (window.ClientsManager) {
                window.ClientsManager.showCreateModal();
            }
        }, 100);
    }

    static createNewProduct() {
        window.App.navigateToSection('products');
        setTimeout(() => {
            if (window.ProductsManager) {
                window.ProductsManager.showCreateModal();
            }
        }, 100);
    }
}

// Initialize dashboard
window.Dashboard = new Dashboard();
