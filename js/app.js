/**
 * app.js - Main Application Router
 * 
 * Hash-based routing for the H5 app
 * Routes: #/ (home), #/list (customer list), #/add (add customer)
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Show logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = 'block';
        logoutBtn.addEventListener('click', () => {
            Auth.clearAuth();
            window.location.href = 'login.html';
        });
    }

    // Initialize router
    Router.init();

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        Router.handleRoute();
    });
});

/**
 * Simple Hash Router
 */
const Router = {
    routes: {},

    /**
     * Register a route
     */
    register(path, handler) {
        this.routes[path] = handler;
    },

    /**
     * Initialize the router
     */
    init() {
        // Register default routes
        this.register('/', this.renderHome.bind(this));
        this.register('/list', this.renderCustomerList.bind(this));
        this.register('/add', this.renderAddCustomer.bind(this));
        this.register('/edit/:id', this.renderEditCustomer.bind(this));
        this.register('/detail/:id', this.renderCustomerDetail.bind(this));

        // Handle initial route
        this.handleRoute();
    },

    /**
     * Handle current route
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const container = document.getElementById('mainContent');

        // Find matching route
        let handler = null;
        let params = {};

        for (const [path, routeHandler] of Object.entries(this.routes)) {
            const match = this.matchRoute(path, hash);
            if (match) {
                handler = routeHandler;
                params = match.params;
                break;
            }
        }

        if (handler) {
            handler(params);
        } else {
            this.render404();
        }
    },

    /**
     * Match route pattern against actual path
     */
    matchRoute(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                // Parameter
                params[patternParts[i].slice(1)] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return { params };
    },

    /**
     * Navigate to a route
     */
    navigate(path) {
        window.location.hash = path;
    },

    // ==================== Page Renderers ====================

    /**
     * Render home page
     */
    renderHome() {
        const user = Auth.getUserInfo();
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="welcome-section" style="text-align: center; padding: 40px 20px;">
                <h2 style="margin-bottom: 8px;">欢迎使用客户录入助手</h2>
                ${user ? `<p style="color: var(--text-secondary); margin-bottom: 24px;">当前用户: ${user.name || user.en_name || '未知'}</p>` : ''}
                
                <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px; margin: 0 auto;">
                    <button class="btn btn-primary btn-block" onclick="Router.navigate('/list')">
                        客户列表
                    </button>
                    <button class="btn btn-primary btn-block" onclick="Router.navigate('/add')">
                        新增客户
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render customer list page
     */
    renderCustomerList() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">客户列表</h1>
                <button class="btn btn-primary" onclick="Router.navigate('/add')">新增</button>
            </div>
            <div id="customerListContainer">
                <div class="loading">加载中</div>
            </div>
        `;

        // Load customer list
        this.loadCustomerList();
    },

    async loadCustomerList() {
        const container = document.getElementById('customerListContainer');
        
        try {
            // Demo data for testing - replace with actual API call
            const customers = [
                { customer_id: '1', name: '张三公司', phone: '13800138000', created_at: '2024-01-15' },
                { customer_id: '2', name: '李四企业', phone: '13900139000', created_at: '2024-01-16' },
                { customer_id: '3', name: '王五集团', phone: '13700137000', created_at: '2024-01-17' }
            ];

            if (customers.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>暂无客户数据</p>
                        <button class="btn btn-primary mt-16" onclick="Router.navigate('/add')">添加第一个客户</button>
                    </div>
                `;
                return;
            }

            container.innerHTML = customers.map(c => `
                <div class="card" onclick="Router.navigate('/detail/${c.customer_id}')">
                    <div class="list-item-title">${c.name}</div>
                    <div class="list-item-desc">${c.phone} · ${c.created_at}</div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `
                <div class="card" style="color: #ff4d4f;">
                    <p>加载失败: ${error.message}</p>
                    <button class="btn btn-primary mt-16" onclick="Router.loadCustomerList()">重试</button>
                </div>
            `;
        }
    },

    /**
     * Render add customer page
     */
    renderAddCustomer() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">新增客户</h1>
            </div>
            <div class="card">
                <form id="customerForm">
                    <div class="form-group">
                        <label class="form-label">客户名称 *</label>
                        <input type="text" class="form-input" name="name" placeholder="请输入客户名称" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">联系电话</label>
                        <input type="tel" class="form-input" name="phone" placeholder="请输入联系电话">
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注</label>
                        <textarea class="form-input" name="remark" rows="3" placeholder="请输入备注信息"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">保存</button>
                </form>
            </div>
        `;

        document.getElementById('customerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const customerData = Object.fromEntries(formData.entries());
            
            try {
                // API call would go here
                // await API.createCustomer(customerData);
                alert('客户创建成功！');
                Router.navigate('/list');
            } catch (error) {
                alert('创建失败: ' + error.message);
            }
        });
    },

    /**
     * Render edit customer page
     */
    renderEditCustomer(params) {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">编辑客户</h1>
            </div>
            <div class="card">
                <form id="customerForm">
                    <div class="form-group">
                        <label class="form-label">客户名称 *</label>
                        <input type="text" class="form-input" name="name" placeholder="请输入客户名称" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">联系电话</label>
                        <input type="tel" class="form-input" name="phone" placeholder="请输入联系电话">
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注</label>
                        <textarea class="form-input" name="remark" rows="3" placeholder="请输入备注信息"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">保存</button>
                </form>
            </div>
        `;

        // Load customer data for editing
        this.loadCustomerForEdit(params.id);
    },

    async loadCustomerForEdit(customerId) {
        try {
            // Demo data - replace with actual API call
            const customer = { name: '示例客户', phone: '13800138000', remark: '' };
            const form = document.getElementById('customerForm');
            form.name.value = customer.name;
            form.phone.value = customer.phone;
            form.remark.value = customer.remark || '';

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const customerData = Object.fromEntries(formData.entries());
                
                try {
                    // await API.updateCustomer(customerId, customerData);
                    alert('客户更新成功！');
                    Router.navigate('/list');
                } catch (error) {
                    alert('更新失败: ' + error.message);
                }
            });
        } catch (error) {
            alert('加载客户数据失败: ' + error.message);
        }
    },

    /**
     * Render customer detail page
     */
    renderCustomerDetail(params) {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">客户详情</h1>
            </div>
            <div id="customerDetailContent">
                <div class="loading">加载中</div>
            </div>
        `;

        this.loadCustomerDetail(params.id);
    },

    async loadCustomerDetail(customerId) {
        const container = document.getElementById('customerDetailContent');
        
        try {
            // Demo data - replace with actual API call
            const customer = {
                customer_id: customerId,
                name: '示例客户',
                phone: '13800138000',
                remark: '这是一条备注信息',
                created_at: '2024-01-15 10:30:00',
                updated_at: '2024-01-16 14:20:00'
            };

            container.innerHTML = `
                <div class="card">
                    <div style="margin-bottom: 12px;">
                        <label class="form-label">客户名称</label>
                        <div>${customer.name}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="form-label">联系电话</label>
                        <div>${customer.phone}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="form-label">备注</label>
                        <div>${customer.remark || '-'}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label class="form-label">创建时间</label>
                        <div>${customer.created_at}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="Router.navigate('/edit/${customerId}')">编辑</button>
                    <button class="btn" style="flex: 1; background: #ff4d4f; color: #fff;" onclick="Router.deleteCustomer('${customerId}')">删除</button>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `
                <div class="card" style="color: #ff4d4f;">
                    <p>加载失败: ${error.message}</p>
                </div>
            `;
        }
    },

    async deleteCustomer(customerId) {
        if (!confirm('确定要删除该客户吗？')) return;
        
        try {
            // await API.deleteCustomer(customerId);
            alert('删除成功');
            Router.navigate('/list');
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    },

    /**
     * Render 404 page
     */
    render404() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h2>页面未找到</h2>
                <p style="margin: 16px 0;">您访问的页面不存在</p>
                <button class="btn btn-primary" onclick="Router.navigate('/')">返回首页</button>
            </div>
        `;
    }
};

// Make Router available globally
window.Router = Router;
