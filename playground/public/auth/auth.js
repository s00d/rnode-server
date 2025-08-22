// API base URL
const API_BASE = '/api';

// Class for managing authorization
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
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Registration form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    // Check authorization status on page load
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
            console.error('Error checking authorization status:', error);
            this.setUnauthenticated();
        }
    }

    // Login to system
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showStatus('loginStatus', 'error', 'Fill in all fields');
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
                
                // Clear form
                document.getElementById('loginForm').reset();
                
                // Update profile
                await this.loadProfile();
            } else {
                this.showStatus('loginStatus', 'error', data.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus('loginStatus', 'error', 'Server error during login');
        } finally {
            this.setLoading('loginBtn', false);
        }
    }

    // User registration
    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!username || !email || !password) {
            this.showStatus('registerStatus', 'error', 'Fill in all fields');
            return;
        }

        if (password.length < 6) {
            this.showStatus('registerStatus', 'error', 'Password must contain at least 6 characters');
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
                
                // Clear form
                document.getElementById('registerForm').reset();
                
                // Update profile
                await this.loadProfile();
            } else {
                this.showStatus('registerStatus', 'error', data.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showStatus('registerStatus', 'error', 'Server error during registration');
        } finally {
            this.setLoading('registerBtn', false);
        }
    }

    // Logout from system
    async logout() {
        try {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                this.setUnauthenticated();
                this.showStatus('profileStatus', 'info', 'You have successfully logged out');
            } else {
                console.error('Logout error:', data.message);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Load user profile
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
            console.error('Profile loading error:', error);
        }
    }

    // Set authenticated user state
    setAuthenticated(user) {
        this.isAuthenticated = true;
        this.currentUser = user;
        
        // Update UI
        document.getElementById('profileStatus').classList.add('hidden');
        document.getElementById('profileInfo').classList.remove('hidden');
        
        // Update profile
        this.updateProfileDisplay(user);
        
        // Show notification
        this.showStatus('profileStatus', 'success', `Welcome, ${user.username}!`);
        setTimeout(() => {
            document.getElementById('profileStatus').classList.add('hidden');
        }, 3000);
    }

    // Set unauthenticated user state
    setUnauthenticated() {
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Update UI
        document.getElementById('profileStatus').classList.remove('hidden');
        document.getElementById('profileStatus').textContent = 'Please log in to view profile';
        document.getElementById('profileStatus').className = 'status info';
        document.getElementById('profileInfo').classList.add('hidden');
        
        // Clear profile fields
        this.clearProfileDisplay();
    }

    // Update profile display
    updateProfileDisplay(profile) {
        document.getElementById('profileId').textContent = profile.id;
        document.getElementById('profileUsername').textContent = profile.username;
        document.getElementById('profileEmail').textContent = profile.email;
        document.getElementById('profileCreatedAt').textContent = this.formatDate(profile.createdAt);
        document.getElementById('profileUpdatedAt').textContent = this.formatDate(profile.updatedAt);
    }

    // Clear profile display
    clearProfileDisplay() {
        document.getElementById('profileId').textContent = '-';
        document.getElementById('profileUsername').textContent = '-';
        document.getElementById('profileEmail').textContent = '-';
        document.getElementById('profileCreatedAt').textContent = '-';
        document.getElementById('profileUpdatedAt').textContent = '-';
    }

    // Date formatting
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

    // Show status
    showStatus(elementId, type, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `status ${type}`;
        element.classList.remove('hidden');
        
        // Automatically hide after 5 seconds
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }

    // Set loading state for button
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Additional utilities
class Utils {
    // Email validation
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Password validation
    static isValidPassword(password) {
        return password.length >= 6;
    }

    // Username validation
    static isValidUsername(username) {
        return username.length >= 3 && username.length <= 20;
    }

    // Safe text display
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for debugging
window.authManager = null;
window.utils = Utils;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, Utils };
}
