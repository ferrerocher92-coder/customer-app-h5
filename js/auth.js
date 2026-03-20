/**
 * auth.js - Feishu OAuth 2.0 Authentication
 * 
 * Handles user authentication flow using Feishu OAuth 2.0
 * Stores and retrieves user_access_token from localStorage
 */

const Auth = {
    // Configuration
    APP_ID: 'cli_a9365221543a5ccc',
    // Note: In production, redirect_uri should be your actual H5 app URL
    // For local development, use your deployed URL
    REDIRECT_URI: window.location.origin + '/callback.html',
    AUTH_URL: 'https://open.feishu.cn/open-apis/authen/v1/authorize',
    TOKEN_URL: 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
    USER_INFO_URL: 'https://open.feishu.cn/open-apis/authen/v1/user_info',
    
    // localStorage keys
    TOKEN_KEY: 'feishu_user_access_token',
    USER_KEY: 'feishu_user_info',
    STATE_KEY: 'feishu_oauth_state',

    /**
     * Generate random state for OAuth security
     */
    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        return !!token;
    },

    /**
     * Get stored access token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Get stored user info
     */
    getUserInfo() {
        const userStr = localStorage.getItem(this.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Save token and user info to localStorage
     */
    saveTokenAndUser(tokenData, userInfo) {
        localStorage.setItem(this.TOKEN_KEY, tokenData.access_token);
        if (tokenData.refresh_token) {
            localStorage.setItem('feishu_refresh_token', tokenData.refresh_token);
        }
        if (tokenData.expires_in) {
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            localStorage.setItem('feishu_token_expires_at', expiresAt);
        }
        if (userInfo) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(userInfo));
        }
    },

    /**
     * Clear all auth data (logout)
     */
    clearAuth() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem('feishu_refresh_token');
        localStorage.removeItem('feishu_token_expires_at');
        localStorage.removeItem(this.USER_KEY);
    },

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        const expiresAt = localStorage.getItem('feishu_token_expires_at');
        if (!expiresAt) return false; // No expiry info, assume valid
        return Date.now() >= parseInt(expiresAt);
    },

    /**
     * Initiate OAuth login flow - redirect to Feishu authorization page
     */
    login() {
        const state = this.generateState();
        localStorage.setItem(this.STATE_KEY, state);

        const params = new URLSearchParams({
            app_id: this.APP_ID,
            redirect_uri: this.REDIRECT_URI,
            state: state,
            response_type: 'code'
        });

        window.location.href = `${this.AUTH_URL}?${params.toString()}`;
    },

    /**
     * Handle OAuth callback - exchange code for token
     * Called from callback.html
     */
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorCode = urlParams.get('error_code');
        const errorMsg = urlParams.get('error_description');

        // Check for OAuth errors
        if (error) {
            console.error('OAuth error:', error, errorCode, errorMsg);
            return {
                success: false,
                error: errorMsg || error || 'Authorization failed'
            };
        }

        // Verify state to prevent CSRF
        const savedState = localStorage.getItem(this.STATE_KEY);
        if (state !== savedState) {
            console.error('State mismatch, possible CSRF attack');
            return {
                success: false,
                error: 'State verification failed'
            };
        }

        // Clear state after use
        localStorage.removeItem(this.STATE_KEY);

        if (!code) {
            return {
                success: false,
                error: 'No authorization code received'
            };
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch(this.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    app_id: this.APP_ID,
                    app_secret: window.feishuAppSecret || 'o08J7194FRXuGPffPICd6cHb6gyKWjBY'
                })
            });

            const tokenData = await tokenResponse.json();
            console.log('Token response:', tokenData);

            if (tokenData.code !== 0) {
                return {
                    success: false,
                    error: tokenData.msg || 'Failed to get access token'
                };
            }

            // Get user info
            const userInfo = await this.fetchUserInfo(tokenData.data.access_token);

            // Save token and user info
            this.saveTokenAndUser(tokenData.data, userInfo);

            return {
                success: true,
                data: {
                    token: tokenData.data,
                    user: userInfo
                }
            };

        } catch (error) {
            console.error('OAuth callback error:', error);
            return {
                success: false,
                error: 'Network error during authentication'
            };
        }
    },

    /**
     * Fetch user info using access token
     */
    async fetchUserInfo(accessToken) {
        try {
            const response = await fetch(this.USER_INFO_URL, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const data = await response.json();
            if (data.code === 0) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            return null;
        }
    },

    /**
     * Ensure user is authenticated, redirect to login if not
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.login();
            return false;
        }
        if (this.isTokenExpired()) {
            console.log('Token expired, please re-login');
            this.clearAuth();
            this.login();
            return false;
        }
        return true;
    }
};

// Make Auth available globally
window.Auth = Auth;
