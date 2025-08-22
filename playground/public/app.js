// RNode Server - SQLite Users Manager
class UsersManager {
    constructor() {
        this.baseUrl = 'http://localhost:4546';
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUsers();
        this.updateStats();
    }

    bindEvents() {
        // Форма пользователя
        document.getElementById('userForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());

        // Поиск
        document.getElementById('searchBtn').addEventListener('click', () => this.searchUsers());
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
        document.getElementById('searchQuery').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchUsers();
        });

        // Модальное окно удаления
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
    }

    // API методы
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
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
            this.showNotification('Ошибка API: ' + error.message, 'error');
            throw error;
        }
    }

    // Загрузка пользователей
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
            this.showNotification('Ошибка загрузки пользователей', 'error');
        }
    }

    // Создание/обновление пользователя
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('userName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            age: document.getElementById('userAge').value ? parseInt(document.getElementById('userAge').value) : null
        };

        if (!userData.name || !userData.email) {
            this.showNotification('Имя и email обязательны', 'warning');
            return;
        }

        try {
            let result;
            if (this.currentUser) {
                // Обновление
                result = await this.apiCall(`/api/users/${this.currentUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
            } else {
                // Создание
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
            this.showNotification('Ошибка сохранения пользователя', 'error');
        }
    }

    // Удаление пользователя
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
            this.showNotification('Ошибка удаления пользователя', 'error');
        }

        this.closeDeleteModal();
    }

    // Поиск пользователей
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
                this.showNotification(`Найдено пользователей: ${result.count}`, 'info');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка поиска', 'error');
        }
    }

    // Очистка поиска
    clearSearch() {
        document.getElementById('searchQuery').value = '';
        this.loadUsers();
    }

    // Редактирование пользователя
    editUser(user) {
        this.currentUser = user;
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userAge').value = user.age || '';
        
        document.getElementById('submitBtn').textContent = 'Обновить пользователя';
        document.getElementById('cancelBtn').style.display = 'inline-block';
    }

    // Отмена редактирования
    cancelEdit() {
        this.currentUser = null;
        this.clearForm();
        document.getElementById('submitBtn').textContent = 'Создать пользователя';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Очистка формы
    clearForm() {
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        this.currentUser = null;
        document.getElementById('submitBtn').textContent = 'Создать пользователя';
        document.getElementById('cancelBtn').style.display = 'none';
    }

    // Рендеринг таблицы пользователей
    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">Пользователи не найдены</td></tr>';
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

        document.getElementById('usersCount').textContent = `Всего пользователей: ${users.length}`;
    }

    // Обновление статистики
    updateStats() {
        // Загружаем пользователей для подсчета статистики
        this.apiCall('/api/users').then(result => {
            if (result.success) {
                const users = result.users;
                const totalUsers = users.length;
                const avgAge = users.length > 0 ? 
                    Math.round(users.reduce((sum, user) => sum + (user.age || 0), 0) / users.filter(u => u.age).length) : 0;
                
                // Пользователи за последние 24 часа
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const recentUsers = users.filter(user => new Date(user.created_at) > yesterday).length;

                document.getElementById('totalUsers').textContent = totalUsers;
                document.getElementById('avgAge').textContent = avgAge;
                document.getElementById('recentUsers').textContent = recentUsers;
            }
        });
    }

    // Модальное окно удаления
    showDeleteModal(userName, userId) {
        this.deleteUserId = userId;
        document.getElementById('deleteUserName').textContent = userName;
        document.getElementById('deleteModal').style.display = 'block';
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.deleteUserId = null;
    }

    // Уведомления
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Вспомогательные методы
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Инициализация при загрузке страницы
let usersManager;
document.addEventListener('DOMContentLoaded', () => {
    usersManager = new UsersManager();
});

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    const modal = document.getElementById('deleteModal');
    if (e.target === modal) {
        usersManager.closeDeleteModal();
    }
});
