// RNode Server - SQLite Users Manager
class UsersManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUsers();
        this.updateStats();
    }

    bindEvents() {
        // User form
        document.getElementById('userForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchUsers());
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
        document.getElementById('searchQuery').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });

        // Delete modal
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
    }

    // API methods
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification('API Error: ' + error.message, 'error');
            throw error;
        }
    }

    // Load users
    async loadUsers() {
        try {
            const result = await this.apiCall('/api/users');
            if (result.success) {
                this.renderUsersTable(result.users);
                this.updateStats();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Error loading users', 'error');
        }
    }

    // Create/update user
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            age: document.getElementById('userAge').value ? parseInt(document.getElementById('userAge').value) : null
        };

        if (!userData.name || !userData.email) {
            this.showNotification('Name and email are required', 'warning');
            return;
        }

        try {
            let result;
            if (this.currentUser) {
                // Update
                result = await this.apiCall(`/api/users/${this.currentUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            } else {
                // Create
                result = await this.apiCall('/api/users', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
            }

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.clearForm();
                this.loadUsers();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('User save error', 'error');
        }
    }

    // Delete user
    async deleteUser(userId, userName) {
        this.showDeleteModal(userName, userId);
    }

    async confirmDelete() {
        if (!this.deleteUserId) return;

        try {
            const result = await this.apiCall(`/api/users/${this.deleteUserId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadUsers();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Error deleting user', 'error');
        }

        this.closeDeleteModal();
    }

    // Search users
    async searchUsers() {
        const query = document.getElementById('searchQuery').value.trim();
        if (!query) {
            this.loadUsers();
            return;
        }

        try {
            const result = await this.apiCall(`/api/users/search/${encodeURIComponent(query)}`);
            if (result.success) {
                this.renderUsersTable(result.users);
                this.showNotification(`Users found: ${result.count}`, 'info');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Search error', 'error');
        }
    }

    // Clear search
    clearSearch() {
        document.getElementById('searchQuery').value = '';
        this.loadUsers();
    }

    // Edit user
    editUser(user) {
        this.currentUser = user;
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userAge').value = user.age || '';
        
        document.getElementById('submitBtn').textContent = 'Update User';
        document.getElementById('cancelBtn').style.display = 'inline-block';
    }

    // Cancel editing
    cancelEdit() {
        this.currentUser = null;
        this.clearForm();
        document.getElementById('submitBtn').textContent = 'Create User';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Clear form
    clearForm() {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        this.currentUser = null;
        document.getElementById('submitBtn').textContent = 'Create User';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Render users table
    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.name)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${user.age || '-'}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td class="actions">
                    <button class="btn-edit" onclick="usersManager.editUser(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="usersManager.deleteUser(${user.id}, '${this.escapeHtml(user.name)}')">
                        🗑️
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('usersCount').textContent = `Total users: ${users.length}`;
    }

    // Update statistics
    updateStats() {
        // Load users for statistics calculation
        this.apiCall('/api/users').then(result => {
            if (result.success) {
                const users = result.users;
                const totalUsers = users.length;
                const avgAge = users.length > 0 ? 
                    Math.round(users.reduce((sum, user) => sum + (user.age || 0), 0) / users.filter(u => u.age).length) : 0;
                
                // Users in last 24 hours
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const recentUsers = users.filter(user => new Date(user.created_at) > yesterday).length;

                document.getElementById('totalUsers').textContent = totalUsers;
                document.getElementById('avgAge').textContent = avgAge;
                document.getElementById('recentUsers').textContent = recentUsers;
            }
        });
    }

    // Delete modal
    showDeleteModal(userName, userId) {
        this.deleteUserId = userId;
        document.getElementById('deleteUserName').textContent = userName;
        document.getElementById('deleteModal').style.display = 'block';
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.deleteUserId = null;
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Helper methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize on page load
let usersManager;
document.addEventListener('DOMContentLoaded', () => {
    usersManager = new UsersManager();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('deleteModal');
    if (e.target === modal) {
        usersManager.closeDeleteModal();
    }
});
