/**
 * ConfigManager - Loads and provides access to game configuration
 * Singleton pattern for easy access throughout the codebase
 */
export default class ConfigManager {
    constructor() {
        this.config = null;
        this.isLoaded = false;
    }

    /**
     * Load game configuration from JSON file
     * @param {string} path - Path to config JSON file
     * @returns {Promise<void>}
     */
    async loadConfig(path = './assets/metadata/game_config.json') {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load config from ${path}: ${response.statusText}`);
            }
            this.config = await response.json();
            this.isLoaded = true;
            console.log('[ConfigManager] Game config loaded:', this.config);
        } catch (error) {
            console.error('[ConfigManager] Error loading config:', error);
            throw error;
        }
    }

    /**
     * Get a config value using dot notation path
     * @param {string} path - Dot-separated path (e.g., 'player.movement.moveSpeed')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Config value or default
     */
    get(path, defaultValue = null) {
        if (!this.isLoaded) {
            console.warn('[ConfigManager] Config not loaded yet, returning default value');
            return defaultValue;
        }

        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Get physics config
     */
    getPhysics() {
        return this.config?.physics || {};
    }

    /**
     * Get player config
     */
    getPlayer() {
        return this.config?.player || {};
    }

    /**
     * Get zombie config
     */
    getZombie() {
        return this.config?.zombie || {};
    }

    /**
     * Get character config by type
     * @param {string} characterType - 'player' or 'zombie'
     */
    getCharacter(characterType) {
        return this.config?.[characterType.toLowerCase()] || {};
    }
}

// Singleton instance
const configManager = new ConfigManager();
export { configManager };

