import { notificationService } from './notificationService';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.isTracking = false;
    this.callbacks = new Set();
    this.lastNotificationTimes = new Map();
    
    // Configuration par défaut
    this.options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };
  }

  // Obtenir position actuelle
  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      const geoOptions = { ...this.options, ...options };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.formatPosition(position);
          this.currentPosition = location;
          resolve(location);
        },
        (error) => {
          reject(this.formatError(error));
        },
        geoOptions
      );
    });
  }

  // Démarrer surveillance continue
  startWatching(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Géolocalisation non supportée');
    }

    if (this.isTracking) {
      this.stopWatching();
    }

    const geoOptions = { ...this.options, ...options };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.formatPosition(position);
        this.currentPosition = location;
        
        // Notifier tous les callbacks
        this.callbacks.forEach(cb => {
          try {
            cb(location);
          } catch (error) {
            console.error('Erreur callback géolocalisation:', error);
          }
        });
        
        if (callback) callback(location);
      },
      (error) => {
        const formattedError = this.formatError(error);
        console.error('Erreur géolocalisation:', formattedError);
        
        if (callback) callback(null, formattedError);
      },
      geoOptions
    );

    this.isTracking = true;
    return this.watchId;
  }

  // Arrêter surveillance
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.callbacks.clear();
  }

  // Ajouter callback pour changements de position
  addLocationCallback(callback) {
    this.callbacks.add(callback);
    
    // Si déjà en cours de tracking, envoyer position actuelle
    if (this.currentPosition && this.isTracking) {
      callback(this.currentPosition);
    }
  }

  // Supprimer callback
  removeLocationCallback(callback) {
    this.callbacks.delete(callback);
  }

  // Calculer distance entre deux points (Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Vérifier les tâches basées sur la localisation
  checkLocationBasedTasks(currentLocation, plants, userSettings, notificationCallback) {
    if (!currentLocation || !userSettings.homeLocation) return;

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      userSettings.homeLocation.latitude,
      userSettings.homeLocation.longitude
    );

    const homeRadius = userSettings.homeRadius || 0.1; // 100m par défaut
    const isAtHome = distance <= homeRadius;
    const plantsNeedingWater = plants.filter(p => p.needsWater);

    // Notifications d'arrivée à la maison
    if (isAtHome && plantsNeedingWater.length > 0) {
      this.sendLocationNotification(
        'home-arrival',
        userSettings.language,
        plantsNeedingWater,
        notificationCallback
      );
    }

    // Notifications de départ
    if (!isAtHome && distance > homeRadius * 2 && plantsNeedingWater.length > 0) {
      this.sendLocationNotification(
        'home-departure',
        userSettings.language,
        plantsNeedingWater,
        notificationCallback,
        distance
      );
    }

    return {
      isAtHome,
      distance,
      plantsNeedingWater: plantsNeedingWater.length
    };
  }

  // Envoyer notification de localisation
  sendLocationNotification(type, language, plants, callback, distance = null) {
    const now = Date.now();
    const lastNotification = this.lastNotificationTimes.get(type) || 0;
    
    // Éviter spam (minimum 10 minutes entre notifications du même type)
    if (now - lastNotification < 10 * 60 * 1000) return;
    
    this.lastNotificationTimes.set(type, now);

    let title, message;
    
    if (type === 'home-arrival') {
      title = language === 'fr' ? '🏠 Vous êtes rentré !' : '🏠 You\'re home!';
      message = language === 'fr' 
        ? `${plants.length} plante(s) ont besoin d'eau.`
        : `${plants.length} plant(s) need water.`;
    } else if (type === 'home-departure') {
      const distanceText = distance > 1 
        ? `${distance.toFixed(1)} km`
        : `${Math.round(distance * 1000)}m`;
      
      title = language === 'fr' ? '🚶 Vous vous éloignez' : '🚶 You\'re leaving';
      message = language === 'fr'
        ? `À ${distanceText} de chez vous. ${plants.length} plante(s) ont besoin d'eau !`
        : `${distanceText} from home. ${plants.length} plant(s) need water!`;
    }

    // Notification système
    notificationService.showLocationAlert(message, language, distance);
    
    // Callback in-app
    if (callback) {
      callback(title, message, 'location');
    }
  }

  // Obtenir adresse approximative (reverse geocoding basique)
  async getApproximateAddress(latitude, longitude, language = 'fr') {
    try {
      // Utiliser un service de reverse geocoding gratuit
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${language}`
      );
      
      if (!response.ok) throw new Error('Erreur geocoding');
      
      const data = await response.json();
      
      return {
        address: data.display_name || 'Adresse inconnue',
        city: data.address?.city || data.address?.town || 'Ville inconnue',
        country: data.address?.country || 'Pays inconnu',
        formatted: this.formatAddress(data.address, language)
      };
    } catch (error) {
      console.error('Erreur reverse geocoding:', error);
      return {
        address: language === 'fr' ? 'Adresse non disponible' : 'Address unavailable',
        city: language === 'fr' ? 'Ville inconnue' : 'Unknown city',
        country: language === 'fr' ? 'Pays inconnu' : 'Unknown country',
        formatted: language === 'fr' ? 'Localisation approximative' : 'Approximate location'
      };
    }
  }

  // Utilitaires
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  formatPosition(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString()
    };
  }

  formatError(error) {
    const errorMessages = {
      fr: {
        1: 'Permission de géolocalisation refusée',
        2: 'Position indisponible',
        3: 'Délai de géolocalisation dépassé'
      },
      en: {
        1: 'Geolocation permission denied',
        2: 'Position unavailable',
        3: 'Geolocation timeout'
      }
    };

    return {
      code: error.code,
      message: error.message,
      localizedMessage: errorMessages.fr[error.code] || error.message
    };
  }

  formatAddress(address, language) {
    if (!address) return language === 'fr' ? 'Adresse inconnue' : 'Unknown address';
    
    const parts = [];
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.city || address.town) parts.push(address.city || address.town);
    
    return parts.join(', ') || (language === 'fr' ? 'Adresse incomplète' : 'Incomplete address');
  }

  // Obtenir statut
  getStatus() {
    return {
      isSupported: 'geolocation' in navigator,
      isTracking: this.isTracking,
      watchId: this.watchId,
      currentPosition: this.currentPosition,
      callbackCount: this.callbacks.size
    };
  }
}

// Instance singleton
export const locationService = new LocationService();
export default locationService;