class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.queue = [];
    this.activeNotifications = new Map();
    this.settings = {
      enabled: true,
      sound: true,
      vibration: true,
      icon: '/favicon.ico'
    };
  }

  // Demander permission pour notifications RÉELLES
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Notifications non supportées');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        console.log('✅ Notifications autorisées');
        
        // Test de notification
        this.show(
          '🌱 EcoPilot',
          'Notifications activées ! Nous vous alerterons pour vos plantes.',
          'success'
        );
        
        return true;
      } else {
        console.log('❌ Notifications refusées');
        return false;
      }
    } catch (error) {
      console.error('Erreur permission notifications:', error);
      return false;
    }
  }

  // Afficher notification NATIVE
  show(title, body, type = 'info', options = {}) {
    if (!this.isSupported || this.permission !== 'granted' || !this.settings.enabled) {
      console.log('Notification ignorée:', title, body);
      return null;
    }

    const notificationOptions = {
      body: body,
      icon: this.settings.icon,
      badge: this.settings.icon,
      tag: options.tag || `ecopilot-${type}-${Date.now()}`,
      requireInteraction: type === 'urgent',
      silent: !this.settings.sound,
      vibrate: this.settings.vibration ? [200, 100, 200] : [],
      timestamp: Date.now(),
      data: {
        type: type,
        url: options.url || '/',
        action: options.action
      },
      ...options
    };

    try {
      const notification = new Notification(title, notificationOptions);
      
      // Gérer les événements
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (options.onClick) {
          options.onClick(event);
        }
        
        notification.close();
      };

      notification.onclose = () => {
        this.activeNotifications.delete(notification.tag);
      };

      notification.onerror = (error) => {
        console.error('Erreur notification:', error);
      };

      // Stocker pour gestion
      this.activeNotifications.set(notification.tag, notification);

      // Auto-fermeture après délai
      const autoCloseDelay = type === 'urgent' ? 30000 : 10000;
      setTimeout(() => {
        if (this.activeNotifications.has(notification.tag)) {
          notification.close();
        }
      }, autoCloseDelay);

      return notification;
    } catch (error) {
      console.error('Erreur création notification:', error);
      return null;
    }
  }

  // Notifications spécialisées pour plantes
  showPlantWaterReminder(plant, language = 'fr') {
    const title = language === 'fr' 
      ? '💧 Rappel d\'arrosage'
      : '💧 Watering reminder';
    
    const body = language === 'fr'
      ? `${plant.name} a besoin d'eau ! Dernière fois il y a ${this.getDaysSince(plant.lastWatered)} jours.`
      : `${plant.name} needs water! Last watered ${this.getDaysSince(plant.lastWatered)} days ago.`;

    return this.show(title, body, 'plant-water', {
      tag: `plant-water-${plant.id}`,
      requireInteraction: true,
      actions: [
        {
          action: 'water',
          title: language === 'fr' ? 'Marquer comme arrosée' : 'Mark as watered'
        },
        {
          action: 'snooze',
          title: language === 'fr' ? 'Rappel dans 1h' : 'Remind in 1h'
        }
      ]
    });
  }

  showLocationAlert(message, language = 'fr', distance = null) {
    const title = language === 'fr' ? '📍 EcoPilot' : '📍 EcoPilot';
    
    return this.show(title, message, 'location', {
      tag: 'location-alert',
      data: { distance: distance }
    });
  }

  showPlantHealthAlert(plant, issue, language = 'fr') {
    const title = language === 'fr' 
      ? '🚨 Alerte plante'
      : '🚨 Plant alert';
    
    const body = language === 'fr'
      ? `${plant.name}: ${issue}`
      : `${plant.name}: ${issue}`;

    return this.show(title, body, 'urgent', {
      tag: `plant-health-${plant.id}`,
      requireInteraction: true
    });
  }

  // Utilitaires
  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Fermer toutes les notifications
  closeAll() {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  // Fermer notifications par tag
  closeByTag(tag) {
    const notification = this.activeNotifications.get(tag);
    if (notification) {
      notification.close();
    }
  }

  // Mettre à jour les paramètres
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('ecopilot_notification_settings', JSON.stringify(this.settings));
  }

  // Charger paramètres sauvegardés
  loadSettings() {
    try {
      const saved = localStorage.getItem('ecopilot_notification_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Erreur chargement paramètres notifications:', error);
    }
  }

  // Obtenir le statut
  getStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      enabled: this.settings.enabled,
      activeCount: this.activeNotifications.size
    };
  }
}

// Instance singleton
export const notificationService = new NotificationService();
export default notificationService;