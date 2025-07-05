import React, { useState, useEffect, useCallback } from 'react';

const LocationTracker = ({ location, plants, language, onWaterPlant, texts, userSettings, onShowNotification }) => {
  const [isAtHome, setIsAtHome] = useState(false);
  const [distanceFromHome, setDistanceFromHome] = useState(null);
  const [homeLocation, setHomeLocation] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchId, setWatchId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState({});

  // Configuration de géolocalisation PRÉCISE
  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000 // 30 secondes max pour les données cached
  };

  // Définir la "maison" (première position ou paramètres utilisateur)
  useEffect(() => {
    if (location && !homeLocation) {
      // Utiliser l'adresse des paramètres ou la position actuelle
      const home = userSettings?.homeCoordinates || {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        source: 'auto-detected'
      };
      
      setHomeLocation(home);
      localStorage.setItem('ecopilot_home_location', JSON.stringify(home));
    }

    // Charger la maison sauvegardée
    const savedHome = localStorage.getItem('ecopilot_home_location');
    if (savedHome && !homeLocation) {
      setHomeLocation(JSON.parse(savedHome));
    }
  }, [location, homeLocation, userSettings]);

  // Surveillance GPS continue et PRÉCISE
  useEffect(() => {
    if (userSettings?.notifications?.locationBased && 'geolocation' in navigator) {
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [userSettings]);

  // Calculer distance et statut RÉEL quand la position change
  useEffect(() => {
    if (currentLocation && homeLocation) {
      const distance = calculatePreciseDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        homeLocation.latitude,
        homeLocation.longitude
      );
      
      setDistanceFromHome(distance);
      
      // Définir les zones (configurable)
      const homeRadius = userSettings?.homeRadius || 0.1; // 100m par défaut
      const newIsAtHome = distance <= homeRadius;
      
      // Détecter changement de zone
      if (newIsAtHome !== isAtHome) {
        setIsAtHome(newIsAtHome);
        handleLocationZoneChange(newIsAtHome, distance);
      }
      
      // Sauvegarder l'historique
      addToLocationHistory(currentLocation, distance, newIsAtHome);
    }
  }, [currentLocation, homeLocation, isAtHome, userSettings]);

  // Démarrer la surveillance GPS CONTINUE
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      onShowNotification?.(
        texts?.error || 'Error',
        language === 'fr' ? 'Géolocalisation non supportée' : 'Geolocation not supported',
        'error'
      );
      return;
    }

    setIsTracking(true);

    // Surveillance continue avec watchPosition
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          speed: position.coords.speed,
          heading: position.coords.heading
        };
        
        setCurrentLocation(newLocation);
        
        // Debug en développement
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 Position mise à jour:', {
            lat: newLocation.latitude.toFixed(6),
            lng: newLocation.longitude.toFixed(6),
            accuracy: `${newLocation.accuracy}m`
          });
        }
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        setIsTracking(false);
        
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = language === 'fr' ? 'Permission refusée' : 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = language === 'fr' ? 'Position indisponible' : 'Position unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = language === 'fr' ? 'Délai dépassé' : 'Timeout';
            break;
          default:
            errorMessage = language === 'fr' ? 'Erreur inconnue' : 'Unknown error';
        }
        
        onShowNotification?.(
          texts?.warning || 'Warning',
          errorMessage,
          'warning'
        );
      },
      geoOptions
    );

    setWatchId(id);
  }, [language, onShowNotification, texts]);

  // Arrêter la surveillance
  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Calcul de distance PRÉCIS avec formule Haversine
  const calculatePreciseDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en km
  };

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  // Gérer les changements de zone (maison/extérieur)
  const handleLocationZoneChange = (atHome, distance) => {
    const plantsNeedingWater = plants.filter(plant => plant.needsWater);
    
    if (atHome && plantsNeedingWater.length > 0) {
      // Arrivée à la maison avec plantes à arroser
      sendLocationNotification(
        '🏠 ' + (language === 'fr' ? 'Vous êtes rentré !' : 'You\'re home!'),
        language === 'fr' 
          ? `${plantsNeedingWater.length} plante(s) ont besoin d'eau.`
          : `${plantsNeedingWater.length} plant(s) need water.`,
        'home-arrival'
      );
    } else if (!atHome && plantsNeedingWater.length > 0) {
      // Sortie de la maison avec plantes à arroser
      const distanceText = distance > 1 
        ? `${distance.toFixed(1)} km` 
        : `${Math.round(distance * 1000)}m`;
        
      sendLocationNotification(
        '🚶 ' + (language === 'fr' ? 'Vous vous éloignez' : 'You\'re leaving'),
        language === 'fr'
          ? `À ${distanceText} de chez vous. N'oubliez pas vos plantes !`
          : `${distanceText} from home. Don't forget your plants!`,
        'home-departure'
      );
    }
  };

  // Envoyer notification intelligente (évite le spam)
  const sendLocationNotification = (title, message, type) => {
    const now = Date.now();
    const lastNotification = lastNotificationTime[type] || 0;
    
    // Éviter les notifications répétées (min 5 minutes)
    if (now - lastNotification < 5 * 60 * 1000) return;
    
    setLastNotificationTime(prev => ({ ...prev, [type]: now }));
    
    // Notification système
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: type // Remplace les notifications du même type
      });
    }
    
    // Notification in-app
    const notification = {
      id: `location-${type}-${now}`,
      type: 'location',
      title: title,
      message: message,
      timestamp: new Date(),
      read: false,
      data: {
        distance: distanceFromHome,
        isAtHome: isAtHome,
        plantsCount: plants.filter(p => p.needsWater).length
      }
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    onShowNotification?.(title, message, 'info');
  };

  // Ajouter à l'historique de localisation
  const addToLocationHistory = (location, distance, atHome) => {
    const entry = {
      ...location,
      distance: distance,
      isAtHome: atHome,
      id: Date.now()
    };
    
    setLocationHistory(prev => [entry, ...prev.slice(0, 99)]); // Max 100 entrées
  };

  // Suggestion d'action intelligente selon la distance RÉELLE
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
          ? `Parfait ! Vous êtes à la maison (${Math.round(distanceFromHome * 1000)}m). ${plantsNeedingWater.length} plante(s) ont besoin d'eau.`
          : `Perfect! You're home (${Math.round(distanceFromHome * 1000)}m). ${plantsNeedingWater.length} plant(s) need water.`,
        action: 'water',
        plants: plantsNeedingWater
      };
    } else {
      const distanceText = distanceFromHome > 1 
        ? `${distanceFromHome.toFixed(1)} km`
        : `${Math.round(distanceFromHome * 1000)}m`;
        
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

  // Générer message d'aide INTELLIGENT
  const generateHelpMessage = () => {
    const plantsNeedingWater = plants.filter(plant => plant.needsWater);
    const plantNames = plantsNeedingWater.map(p => p.name).join(', ');
    const currentTime = new Date().toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const distanceText = distanceFromHome > 1 
      ? `${distanceFromHome.toFixed(1)} km`
      : `${Math.round(distanceFromHome * 1000)}m`;
    
    if (language === 'fr') {
      return `Salut ! Je suis actuellement à ${distanceText} de chez moi (${currentTime}) et mes plantes ont besoin d'eau : ${plantNames}. Peux-tu passer les arroser s'il te plaît ? L'app EcoPilot m'a alerté 🌱 Merci beaucoup !`;
    } else {
      return `Hi! I'm currently ${distanceText} from home (${currentTime}) and my plants need water: ${plantNames}. Could you please water them? EcoPilot app alerted me 🌱 Thank you so much!`;
    }
  };

  // Partager demande d'aide (gardez l'existant)
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
        window.open(`mailto:?subject=${encodeURIComponent(language === 'fr' ? 'Aide urgente pour mes plantes 🌱' : 'Urgent help for my plants 🌱')}&body=${encodeURIComponent(message)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(message);
        alert(language === 'fr' ? 'Message copié !' : 'Message copied!');
        break;
    }
  };

  // Définir manuellement la maison
  const setCurrentLocationAsHome = () => {
    if (currentLocation) {
      const newHome = {
        ...currentLocation,
        source: 'manual',
        name: language === 'fr' ? 'Défini manuellement' : 'Set manually'
      };
      
      setHomeLocation(newHome);
      localStorage.setItem('ecopilot_home_location', JSON.stringify(newHome));
      
      onShowNotification?.(
        texts?.success || 'Success',
        language === 'fr' ? 'Position "maison" mise à jour !' : 'Home location updated!',
        'success'
      );
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
          {isTracking && <span className="tracking-indicator">📡</span>}
          {isAtHome 
            ? (language === 'fr' ? '🏠 À la maison' : '🏠 At home')
            : (language === 'fr' ? '🚶 Absent' : '🚶 Away')
          }
        </div>
      </div>

      {/* Statut de localisation PRÉCIS */}
      <div className="location-info">
        {currentLocation && (
          <div className="location-details">
            <div className="coordinates">
              📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </div>
            <div className="accuracy">
              🎯 {language === 'fr' ? 'Précision' : 'Accuracy'}: {Math.round(currentLocation.accuracy)}m
            </div>
            {distanceFromHome !== null && (
              <div className="distance">
                🏠 {language === 'fr' ? 'Distance maison' : 'Distance home'}: {
                  distanceFromHome > 1 
                    ? `${distanceFromHome.toFixed(2)} km`
                    : `${Math.round(distanceFromHome * 1000)} m`
                }
              </div>
            )}
          </div>
        )}

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

        {/* Contrôles de géolocalisation */}
        <div className="location-controls">
          {!isTracking ? (
            <button className="btn btn-primary" onClick={startLocationTracking}>
              <span>📡</span>
              {language === 'fr' ? 'Activer géolocalisation' : 'Enable location tracking'}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopLocationTracking}>
              <span>⏹️</span>
              {language === 'fr' ? 'Arrêter suivi' : 'Stop tracking'}
            </button>
          )}
          
          {currentLocation && (
            <button className="btn btn-outline" onClick={setCurrentLocationAsHome}>
              <span>🏠</span>
              {language === 'fr' ? 'Définir comme maison' : 'Set as home'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications récentes */}
      {notifications.length > 0 && (
        <div className="location-notifications">
          <h4 className="notifications-title">
            {language === 'fr' ? 'Alertes récentes' : 'Recent alerts'}
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

      {/* Debug info amélioré (développement) */}
      {process.env.NODE_ENV === 'development' && currentLocation && (
        <div className="debug-info">
          <details>
            <summary>🐛 Debug GPS</summary>
            <div className="debug-details">
              <div>Lat: {currentLocation.latitude.toFixed(8)}</div>
              <div>Lng: {currentLocation.longitude.toFixed(8)}</div>
              <div>Accuracy: {currentLocation.accuracy}m</div>
              <div>Speed: {currentLocation.speed || 'N/A'}</div>
              <div>Heading: {currentLocation.heading || 'N/A'}</div>
              <div>Tracking: {isTracking ? '✅' : '❌'}</div>
              <div>Watch ID: {watchId}</div>
              <div>History: {locationHistory.length} points</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;