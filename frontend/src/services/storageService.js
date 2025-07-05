class StorageService {
  constructor() {
    this.prefix = 'ecopilot_';
    this.version = '1.0.0';
    this.isAvailable = this.checkAvailability();
  }

  // Vérifier disponibilité localStorage
  checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.warn('localStorage non disponible:', error);
      return false;
    }
  }

  // Méthodes génériques de stockage
  set(key, data) {
    if (!this.isAvailable) return false;
    
    try {
      const storageData = {
        data: data,
        timestamp: new Date().toISOString(),
        version: this.version
      };
      
      localStorage.setItem(this.prefix + key, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return false;
    }
  }

  get(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;
    
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return defaultValue;
      
      const parsed = JSON.parse(stored);
      return parsed.data || defaultValue;
    } catch (error) {
      console.error('Erreur lecture:', error);
      return defaultValue;
    }
  }

  remove(key) {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Erreur suppression:', error);
      return false;
    }
  }

  // Méthodes spécialisées pour EcoPilot
  savePlants(plants) {
    return this.set('plants', plants);
  }

  getPlants() {
    return this.get('plants', []);
  }

  saveSettings(settings) {
    return this.set('settings', settings);
  }

  getSettings() {
    return this.get('settings', {
      userName: '',
      homeAddress: '',
      emergencyContacts: [],
      notifications: {
        enabled: true,
        sound: true,
        vibration: true,
        locationBased: true
      },
      homeRadius: 0.1, // 100m
      units: 'metric',
      theme: 'auto',
      language: 'fr'
    });
  }

  saveNotifications(notifications) {
    // Garder seulement les 50 dernières
    const limited = notifications.slice(0, 50);
    return this.set('notifications', limited);
  }

  getNotifications() {
    return this.get('notifications', []);
  }

  saveLocationHistory(history) {
    // Garder seulement les 100 dernières positions
    const limited = history.slice(0, 100);
    return this.set('location_history', limited);
  }

  getLocationHistory() {
    return this.get('location_history', []);
  }

  saveHomeLocation(location) {
    return this.set('home_location', location);
  }

  getHomeLocation() {
    return this.get('home_location', null);
  }

  // Sauvegarde complète de l'app
  exportData() {
    if (!this.isAvailable) return null;
    
    try {
      const data = {
        plants: this.getPlants(),
        settings: this.getSettings(),
        notifications: this.getNotifications(),
        locationHistory: this.getLocationHistory(),
        homeLocation: this.getHomeLocation(),
        exportDate: new Date().toISOString(),
        version: this.version
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erreur export:', error);
      return null;
    }
  }

  // Importation de données
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.plants) this.savePlants(data.plants);
      if (data.settings) this.saveSettings(data.settings);
      if (data.notifications) this.saveNotifications(data.notifications);
      if (data.locationHistory) this.saveLocationHistory(data.locationHistory);
      if (data.homeLocation) this.saveHomeLocation(data.homeLocation);
      
      return true;
    } catch (error) {
      console.error('Erreur import:', error);
      return false;
    }
  }

  // Nettoyage des données anciennes
  cleanup() {
    try {
      // Nettoyer notifications anciennes (>30 jours)
      const notifications = this.getNotifications();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cleanNotifications = notifications.filter(n => 
        new Date(n.timestamp) > thirtyDaysAgo
      );
      this.saveNotifications(cleanNotifications);

      // Nettoyer historique de localisation ancien (>7 jours)
      const locationHistory = this.getLocationHistory();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const cleanHistory = locationHistory.filter(h => 
        new Date(h.timestamp) > sevenDaysAgo
      );
      this.saveLocationHistory(cleanHistory);

      return true;
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      return false;
    }
  }

  // Obtenir statistiques de stockage
  getStorageStats() {
    if (!this.isAvailable) return null;
    
    try {
      const stats = {
        plants: this.getPlants().length,
        notifications: this.getNotifications().length,
        locationHistory: this.getLocationHistory().length,
        hasHomeLocation: !!this.getHomeLocation(),
        totalKeys: 0,
        totalSize: 0
      };

      // Calculer taille totale
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          stats.totalKeys++;
          stats.totalSize += localStorage.getItem(key).length;
        }
      }

      return stats;
    } catch (error) {
      console.error('Erreur stats:', error);
      return null;
    }
  }

  // Réinitialiser toutes les données
  reset() {
    if (!this.isAvailable) return false;
    
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Erreur reset:', error);
      return false;
    }
  }
}

// Instance singleton
export const storageService = new StorageService();
export default storageService;