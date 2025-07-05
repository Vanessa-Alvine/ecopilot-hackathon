import React, { useState, useEffect } from 'react';

const LocationTracker = ({ location, plants, language, onWaterPlant, texts }) => {
  const [isAtHome, setIsAtHome] = useState(false);
  const [distanceFromHome, setDistanceFromHome] = useState(null);
  const [homeLocation, setHomeLocation] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Coordonnées "maison" simulées (première position détectée)
  useEffect(() => {
    if (location && !homeLocation) {
      setHomeLocation(location);
      setIsAtHome(true);
    }
  }, [location, homeLocation]);

  // Calculer la distance et détecter si on est à la maison
  useEffect(() => {
    if (location && homeLocation) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        homeLocation.latitude,
        homeLocation.longitude
      );
      
      setDistanceFromHome(distance);
      setIsAtHome(distance < 0.1); // 100 mètres = "à la maison"
      
      // Vérifier les notifications géolocalisées
      checkLocationBasedNotifications(distance < 0.1);
    }
  }, [location, homeLocation, plants]);

  // Calculer la distance entre deux points GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Vérifier les notifications basées sur la localisation
  const checkLocationBasedNotifications = (atHome) => {
    const plantsNeedingWater = plants.filter(plant => plant.needsWater);
    
    if (atHome && plantsNeedingWater.length > 0) {
      const newNotifications = plantsNeedingWater.map(plant => ({
        id: `location-${plant.id}`,
        type: 'location',
        plant: plant,
        message: language === 'fr' 
          ? `🏠 Vous êtes à la maison ! ${plant.name} a besoin d'eau.`
          : `🏠 You're home! ${plant.name} needs water.`,
        timestamp: new Date()
      }));
      
      setNotifications(prev => {
        const existingIds = prev.map(n => n.id);
        const reallyNew = newNotifications.filter(n => !existingIds.includes(n.id));
        return [...prev, ...reallyNew];
      });
    }
  };

  // Suggestion d'action selon la distance
  const getLocationSuggestion = () => {
    const plantsNeedingWater = plants.filter(plant => plant.needsWater);
    
    if (plantsNeedingWater.length === 0) {
      return {
        icon: '✅',
        message: language === 'fr' 
          ? 'Toutes vos plantes sont heureuses !'
          : 'All your plants are happy!',
        action: null
      };
    }

    if (isAtHome) {
      return {
        icon: '🏠',
        message: language === 'fr' 
          ? `Parfait ! Vous êtes à la maison et ${plantsNeedingWater.length} plante(s) ont besoin d'eau.`
          : `Perfect! You're home and ${plantsNeedingWater.length} plant(s) need water.`,
        action: 'water',
        plants: plantsNeedingWater
      };
    } else {
      const distanceText = distanceFromHome 
        ? `${distanceFromHome.toFixed(1)} km`
        : 'loin';
        
      return {
        icon: '📱',
        message: language === 'fr' 
          ? `Vous êtes à ${distanceText} de chez vous. Contactez quelqu'un pour arroser vos ${plantsNeedingWater.length} plante(s) ?`
          : `You're ${distanceText} from home. Contact someone to water your ${plantsNeedingWater.length} plant(s)?`,
        action: 'contact',
        plants: plantsNeedingWater
      };
    }
  };

  // Générer un message pour demander de l'aide
  const generateHelpMessage = () => {
    const plantsNeedingWater = plants.filter(plant => plant.needsWater);
    const plantNames = plantsNeedingWater.map(p => p.name).join(', ');
    
    if (language === 'fr') {
      return `Salut ! Je suis absent(e) et mes plantes ont besoin d'eau : ${plantNames}. Peux-tu passer les arroser s'il te plaît ? Merci beaucoup ! 🌱`;
    } else {
      return `Hi! I'm away and my plants need water: ${plantNames}. Could you please water them? Thank you so much! 🌱`;
    }
  };

  // Partager via différents moyens
  const shareHelpRequest = (method) => {
    const message = generateHelpMessage();
    
    switch (method) {
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(message)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(language === 'fr' ? 'Aide pour mes plantes' : 'Help with my plants')}&body=${encodeURIComponent(message)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(message);
        alert(language === 'fr' ? 'Message copié !' : 'Message copied!');
        break;
    }
  };

  const suggestion = getLocationSuggestion();

  return (
    <div className="card location-tracker">
      <div className="card-header">
        <h3 className="card-title">
          <span className="card-icon">📍</span>
          {language === 'fr' ? 'Assistant Géolocalisé' : 'Location Assistant'}
        </h3>
        <div className={`location-status ${isAtHome ? 'at-home' : 'away'}`}>
          {isAtHome 
            ? (language === 'fr' ? '🏠 À la maison' : '🏠 At home')
            : (language === 'fr' ? '🚶 Absent' : '🚶 Away')
          }
        </div>
      </div>

      {/* Statut de localisation */}
      <div className="location-info">
        <div className="location-suggestion">
          <span className="suggestion-icon">{suggestion.icon}</span>
          <p>{suggestion.message}</p>
        </div>

        {/* Actions basées sur la localisation */}
        {suggestion.action === 'water' && (
          <div className="location-actions">
            <p className="action-prompt">
              {language === 'fr' ? 'Actions suggérées :' : 'Suggested actions:'}
            </p>
            <div className="action-buttons">
              {suggestion.plants.map(plant => (
                <button
                  key={plant.id}
                  className="btn btn-water"
                  onClick={() => onWaterPlant(plant.id)}
                >
                  <span>💧</span>
                  {language === 'fr' ? `Arroser ${plant.name}` : `Water ${plant.name}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestion.action === 'contact' && (
          <div className="location-actions">
            <p className="action-prompt">
              {language === 'fr' ? 'Demander de l\'aide :' : 'Ask for help:'}
            </p>
            <div className="contact-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => shareHelpRequest('sms')}
              >
                <span>💬</span>
                SMS
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => shareHelpRequest('whatsapp')}
              >
                <span>📱</span>
                WhatsApp
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => shareHelpRequest('email')}
              >
                <span>📧</span>
                Email
              </button>
              <button
                className="btn btn-primary"
                onClick={() => shareHelpRequest('copy')}
              >
                <span>📋</span>
                {language === 'fr' ? 'Copier' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications récentes */}
      {notifications.length > 0 && (
        <div className="location-notifications">
          <h4 className="notifications-title">
            {language === 'fr' ? 'Notifications récentes' : 'Recent notifications'}
          </h4>
          <div className="notifications-list">
            {notifications.slice(0, 3).map(notification => (
              <div key={notification.id} className="notification-item">
                <span className="notification-time">
                  {notification.timestamp.toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="notification-message">{notification.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug info (seulement en développement) */}
      {process.env.NODE_ENV === 'development' && location && (
        <div className="debug-info">
          <small>
            🐛 Debug: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            {distanceFromHome && ` | Distance: ${(distanceFromHome * 1000).toFixed(0)}m`}
          </small>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;