import React, { useState, useEffect } from 'react';
import './App.css';

// Composants
import Header from './components/Header';
import PlantList from './components/PlantList';
import AddPlant from './components/AddPlant';
import WeatherWidget from './components/WeatherWidget';
import LocationTracker from './components/LocationTracker';
import SettingsPage from './components/SettingsPage';

// Services
import { plantsService } from './services/plantsService';
import { weatherService } from './services/weatherService';
import { tavilyService } from './services/tavilyService';

// Textes bilingues
const texts = {
  fr: {
    appTitle: 'EcoPilot',
    tagline: 'Réalisez votre main verte',
    loading: 'Chargement...',
    addPlant: 'Ajouter une plante',
    myPlants: 'Mes plantes',
    weather: 'Météo',
    notifications: 'Notifications',
    settings: 'Paramètres',
    language: 'Langue',
    location: 'Localisation',
    waterReminder: 'Rappel d\'arrosage',
    plantCare: 'Soin des plantes',
    tips: 'Conseils',
    stats: 'Plus de 2 Canadiens sur 3 possèdent au moins une plante'
  },
  en: {
    appTitle: 'EcoPilot',
    tagline: 'Discover your green thumb',
    loading: 'Loading...',
    addPlant: 'Add plant',
    myPlants: 'My plants',
    weather: 'Weather',
    notifications: 'Notifications',
    settings: 'Settings',
    language: 'Language',
    location: 'Location',
    waterReminder: 'Water reminder',
    plantCare: 'Plant care',
    tips: 'Tips',
    stats: 'Over 2 out of 3 Canadians own at least one houseplant'
  }
};

function App() {
  // États principaux
  const [language, setLanguage] = useState('fr');
  const [plants, setPlants] = useState([]);
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    waterReminders: true,
    locationTracking: true,
    language: 'fr',
    theme: 'light'
  });

  // Textes selon la langue
  const t = texts[language];

  // Charger les données au démarrage
  useEffect(() => {
    initializeApp();
  }, []);

  // Surveiller la localisation
  useEffect(() => {
    if (location) {
      checkLocationBasedReminders();
    }
  }, [location, plants]);

  // Initialiser l'application
  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Charger les plantes
      const plantsData = await plantsService.getPlants(language);
      setPlants(plantsData);
      
      // Obtenir la localisation
      getCurrentLocation();
      
      // Demander permission pour les notifications
      requestNotificationPermission();
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir la localisation actuelle
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(coords);
          
          // Charger la météo
          try {
            const weatherData = await weatherService.getCurrentWeather(
              coords.latitude, 
              coords.longitude, 
              language
            );
            setWeather(weatherData);
          } catch (error) {
            console.error('Erreur météo:', error);
          }
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
          // Utiliser une localisation par défaut (Ottawa)
          setLocation({ latitude: 45.4215, longitude: -75.6972 });
        }
      );
    }
  };

  // Demander permission pour les notifications
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notifications autorisées');
        }
      });
    }
  };

  // Vérifier les rappels basés sur la localisation
  const checkLocationBasedReminders = () => {
    if (!location) return;
    
    // Simuler une "zone maison" (rayon de 100m autour de la position actuelle)
    const homeRadius = 0.001; // Approximativement 100m en degrés
    
    plants.forEach(plant => {
      if (plant.needsWater) {
        // Si près de la maison, envoyer notification
        showNotification(
          language === 'fr' 
            ? `🌱 ${plant.name} a besoin d'eau !`
            : `🌱 ${plant.name} needs water!`,
          language === 'fr'
            ? `Vous êtes à la maison, c'est le moment parfait pour arroser votre ${plant.name}.`
            : `You're home, perfect time to water your ${plant.name}.`
        );
      }
    });
  };

  // Afficher une notification
  const showNotification = (title, message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
    
    // Ajouter à la liste des notifications in-app
    const newNotification = {
      id: Date.now(),
      title,
      message,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Garder max 10
  };

  // Ajouter une nouvelle plante
  const addPlant = async (plantData) => {
    try {
      const newPlant = await plantsService.addPlant({
        ...plantData,
        lang: language
      });
      
      setPlants(prev => [...prev, newPlant]);
      
      // Rechercher des infos avec Tavily
      if (plantData.species) {
        try {
          const plantInfo = await tavilyService.searchPlantInfo(plantData.species, language);
          // Mettre à jour la plante avec les infos Tavily
          console.log('Infos Tavily:', plantInfo);
        } catch (error) {
          console.error('Erreur Tavily:', error);
        }
      }
      
      showNotification(
        language === 'fr' ? '🌿 Nouvelle plante ajoutée !' : '🌿 New plant added!',
        language === 'fr' 
          ? `${plantData.name} a été ajoutée à votre collection.`
          : `${plantData.name} has been added to your collection.`
      );
      
    } catch (error) {
      console.error('Erreur ajout plante:', error);
    }
  };

  // Arroser une plante
  const waterPlant = async (plantId) => {
    try {
      await plantsService.waterPlant(plantId, language);
      
      // Mettre à jour localement
      setPlants(prev => prev.map(plant => 
        plant.id === plantId 
          ? { ...plant, needsWater: false, lastWatered: new Date().toISOString() }
          : plant
      ));
      
      showNotification(
        language === 'fr' ? '💧 Plante arrosée !' : '💧 Plant watered!',
        language === 'fr' ? 'Votre plante vous remercie !' : 'Your plant thanks you!'
      );
      
    } catch (error) {
      console.error('Erreur arrosage:', error);
    }
  };

  // Changer de langue
  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
    
    // Recharger les données dans la nouvelle langue
    plantsService.getPlants(newLang).then(setPlants);
    
    if (location) {
      weatherService.getCurrentWeather(location.latitude, location.longitude, newLang)
        .then(setWeather)
        .catch(console.error);
    }
  };

  // Mettre à jour les paramètres
  const updateSettings = (newSettings) => {
    setUserSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    
    // Si la langue a changé, mettre à jour l'app
    if (newSettings.language && newSettings.language !== language) {
      setLanguage(newSettings.language);
    }
  };

  // Navigation
  const navigateTo = (view) => {
    setCurrentView(view);
  };

  // Rendu de l'interface
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="App" data-language={language}>
      {/* Header avec navigation */}
      <Header 
        language={language}
        onLanguageToggle={toggleLanguage}
        notifications={notifications}
        currentView={currentView}
        onViewChange={setCurrentView}
        texts={t}
      />

      {/* Contenu principal */}
      <main className="app-main">
        {currentView === 'home' && (
          <>
            {/* Widget météo */}
            <WeatherWidget 
              weather={weather}
              location={location}
              language={language}
              texts={t}
            />
            
            {/* Tracker de localisation */}
            <LocationTracker 
              location={location}
              plants={plants}
              language={language}
              onWaterPlant={waterPlant}
              texts={t}
            />
            
            {/* Liste des plantes */}
            <PlantList 
              plants={plants}
              language={language}
              onWaterPlant={waterPlant}
              texts={t}
            />
          </>
        )}
        
        {currentView === 'add' && (
          <AddPlant 
            onAddPlant={addPlant}
            language={language}
            texts={t}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'settings' && (
          <SettingsPage
            settings={userSettings}
            onUpdateSettings={updateSettings}
            onNavigate={navigateTo}
            language={language}
            texts={t}
            location={location}
            onGetLocation={getCurrentLocation}
          />
        )}
      </main>

      {/* Statistiques en bas */}
      <footer className="app-footer">
        <div className="stats-banner">
          <span className="stats-icon">📊</span>
          <span className="stats-text">{t.stats}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;