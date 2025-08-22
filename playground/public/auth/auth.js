// API базовый URL
const API_BASE = '/api';

// Класс для управления авторизацией
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Форма регистрации
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Кнопка выхода
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    // Проверка статуса авторизации при загрузке страницы
    async checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/auth/profile`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.setAuthenticated(data.profile);
                } else {
                    this.setUnauthenticated();
                }
            } else {
                this.setUnauthenticated();
            }
        } catch (error) {
            console.error('Ошибка при проверке статуса авторизации:', error);
            this.setUnauthenticated();
        }
    }

    // Вход в систему
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showStatus('loginStatus', 'error', 'Заполните все поля');
            return;
        }

        this.setLoading('loginBtn', true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showStatus('loginStatus', 'success', data.message);
                this.setAuthenticated(data.user);
                
                // Очищаем форму
                document.getElementById('loginForm').reset();
                
                // Обновляем профиль
                await this.loadProfile();
            } else {
                this.showStatus('loginStatus', 'error', data.message);
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            this.showStatus('loginStatus', 'error', 'Ошибка сервера при входе');
        } finally {
            this.setLoading('loginBtn', false);
        }
    }

    // Регистрация пользователя
    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!username || !email || !password) {
            this.showStatus('registerStatus', 'error', 'Заполните все поля');
            return;
        }

        if (password.length < 6) {
            this.showStatus('registerStatus', 'error', 'Пароль должен содержать минимум 6 символов');
            return;
        }

        this.setLoading('registerBtn', true);

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showStatus('registerStatus', 'success', data.message);
                this.setAuthenticated(data.user);
                
                // Очищаем форму
                document.getElementById('registerForm').reset();
                
                // Обновляем профиль
                await this.loadProfile();
            } else {
                this.showStatus('registerStatus', 'error', data.message);
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            this.showStatus('registerStatus', 'error', 'Ошибка сервера при регистрации');
        } finally {
            this.setLoading('registerBtn', false);
        }
    }

    // Выход из системы
    async logout() {
        try {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.setUnauthenticated();
                this.showStatus('profileStatus', 'info', 'Вы успешно вышли из системы');
            } else {
                console.error('Ошибка при выходе:', data.message);
            }
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    }

    // Загрузка профиля пользователя
    async loadProfile() {
        try {
            const response = await fetch(`${API_BASE}/auth/profile`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateProfileDisplay(data.profile);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);
        }
    }

    // Установка состояния авторизованного пользователя
    setAuthenticated(user) {
        this.isAuthenticated = true;
        this.currentUser = user;
        
        // Обновляем UI
        document.getElementById('profileStatus').classList.add('hidden');
        document.getElementById('profileInfo').classList.remove('hidden');
        
        // Обновляем профиль
        this.updateProfileDisplay(user);
        
        // Показываем уведомление
        this.showStatus('profileStatus', 'success', `Добро пожаловать, ${user.username}!`);
        setTimeout(() => {
            document.getElementById('profileStatus').classList.add('hidden');
        }, 3000);
    }

    // Установка состояния неавторизованного пользователя
    setUnauthenticated() {
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Обновляем UI
        document.getElementById('profileStatus').classList.remove('hidden');
        document.getElementById('profileStatus').textContent = 'Войдите в систему для просмотра профиля';
        document.getElementById('profileStatus').className = 'status info';
        document.getElementById('profileInfo').classList.add('hidden');
        
        // Очищаем поля профиля
        this.clearProfileDisplay();
    }

    // Обновление отображения профиля
    updateProfileDisplay(profile) {
        document.getElementById('profileId').textContent = profile.id;
        document.getElementById('profileUsername').textContent = profile.username;
        document.getElementById('profileEmail').textContent = profile.email;
        document.getElementById('profileCreatedAt').textContent = this.formatDate(profile.createdAt);
        document.getElementById('profileUpdatedAt').textContent = this.formatDate(profile.updatedAt);
    }

    // Очистка отображения профиля
    clearProfileDisplay() {
        document.getElementById('profileId').textContent = '-';
        document.getElementById('profileUsername').textContent = '-';
        document.getElementById('profileEmail').textContent = '-';
        document.getElementById('profileCreatedAt').textContent = '-';
        document.getElementById('profileUpdatedAt').textContent = '-';
    }

    // Форматирование даты
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Показ статуса
    showStatus(elementId, type, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `status ${type}`;
        element.classList.remove('hidden');
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }

    // Установка состояния загрузки для кнопки
    setLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        const spinner = button.querySelector('.spinner');
        
        if (isLoading) {
            button.classList.add('loading');
            spinner.classList.remove('hidden');
        } else {
            button.classList.remove('loading');
            spinner.classList.add('hidden');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Дополнительные утилиты
class Utils {
    // Валидация email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Валидация пароля
    static isValidPassword(password) {
        return password.length >= 6;
    }

    // Валидация имени пользователя
    static isValidUsername(username) {
        return username.length >= 3 && username.length <= 20;
    }

    // Безопасное отображение текста
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальные функции для отладки
window.authManager = null;
window.utils = Utils;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, Utils };
}
