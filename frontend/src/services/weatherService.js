const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

class WeatherService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  // Récupérer la météo actuelle
  async getCurrentWeather(latitude, longitude, language = 'fr') {
    const cacheKey = `${latitude}-${longitude}-${language}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      
      if (now - cached.timestamp < this.cacheTimeout) {
        return { ...cached.data, fromCache: true };
      }
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/weather/current?lat=${latitude}&lon=${longitude}&lang=${language}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': language
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const weatherData = await response.json();
      
      // Enrichir avec des conseils pour les plantes
      const enrichedData = this.enrichWithPlantAdvice(weatherData, language);
      
      // Mettre en cache
      this.cache.set(cacheKey, {
        data: enrichedData,
        timestamp: Date.now()
      });

      return enrichedData;
    } catch (error) {
      console.error('Erreur météo:', error);
      
      // Fallback avec données simulées
      return this.getFallbackWeather(latitude, longitude, language);
    }
  }

  // Enrichir les données météo avec des conseils pour les plantes
  enrichWithPlantAdvice(weatherData, language) {
    const temp = weatherData.temperature;
    const humidity = weatherData.humidity;
    
    let plantAdvice = '';
    let careLevel = 'normal';
    
    if (language === 'fr') {
      if (temp > 25 && humidity < 50) {
        plantAdvice = 'Conditions chaudes et sèches - augmentez l\'arrosage et l\'humidité';
        careLevel = 'high';
      } else if (temp < 15) {
        plantAdvice = 'Températures fraîches - réduisez l\'arrosage et protégez du froid';
        careLevel = 'low';
      } else if (humidity > 70) {
        plantAdvice = 'Humidité élevée - vérifiez la ventilation pour éviter les champignons';
        careLevel = 'medium';
      } else if (temp >= 18 && temp <= 24 && humidity >= 40 && humidity <= 60) {
        plantAdvice = 'Conditions parfaites pour vos plantes !';
        careLevel = 'perfect';
      } else {
        plantAdvice = 'Conditions normales - continuez votre routine habituelle';
        careLevel = 'normal';
      }
    } else {
      if (temp > 25 && humidity < 50) {
        plantAdvice = 'Hot and dry conditions - increase watering and humidity';
        careLevel = 'high';
      } else if (temp < 15) {
        plantAdvice = 'Cool temperatures - reduce watering and protect from cold';
        careLevel = 'low';
      } else if (humidity > 70) {
        plantAdvice = 'High humidity - check ventilation to prevent fungus';
        careLevel = 'medium';
      } else if (temp >= 18 && temp <= 24 && humidity >= 40 && humidity <= 60) {
        plantAdvice = 'Perfect conditions for your plants!';
        careLevel = 'perfect';
      } else {
        plantAdvice = 'Normal conditions - continue your usual routine';
        careLevel = 'normal';
      }
    }

    return {
      ...weatherData,
      plantAdvice,
      careLevel,
      wateringMultiplier: this.getWateringMultiplier(temp, humidity),
      idealForPlants: careLevel === 'perfect'
    };
  }

  // Calculer le multiplicateur d'arrosage basé sur la météo
  getWateringMultiplier(temperature, humidity) {
    // Conditions chaudes et sèches = plus d'arrosage
    if (temperature > 25 && humidity < 50) return 1.3;
    
    // Conditions froides = moins d'arrosage
    if (temperature < 15) return 0.7;
    
    // Humidité très élevée = moins d'arrosage
    if (humidity > 70) return 0.8;
    
    // Conditions normales
    return 1.0;
  }

  // Données de fallback
  getFallbackWeather(latitude, longitude, language) {
    const cities = {
      ottawa: { name: 'Ottawa', country: 'CA' },
      montreal: { name: 'Montréal', country: 'CA' },
      toronto: { name: 'Toronto', country: 'CA' }
    };
    
    // Déterminer la ville basée sur les coordonnées (approximatif)
    let city = cities.ottawa;
    if (latitude > 45.6 && longitude < -73) city = cities.montreal;
    if (latitude > 43.6 && longitude > -80) city = cities.toronto;

    const mockWeather = {
      temperature: 20 + Math.random() * 10, // 20-30°C
      humidity: 40 + Math.random() * 30, // 40-70%
      description: language === 'fr' 
        ? ['Ensoleillé', 'Partiellement nuageux', 'Nuageux'][Math.floor(Math.random() * 3)]
        : ['Sunny', 'Partially cloudy', 'Cloudy'][Math.floor(Math.random() * 3)],
      windSpeed: Math.random() * 15,
      city: city.name,
      country: city.country,
      isMock: true,
      language: language,
      timestamp: new Date().toISOString()
    };

    return this.enrichWithPlantAdvice(mockWeather, language);
  }

  // Obtenir les prévisions (pour fonctionnalité future)
  async getForecast(latitude, longitude, language = 'fr', days = 5) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/weather/forecast?lat=${latitude}&lon=${longitude}&lang=${language}&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur prévisions météo:', error);
      
      // Fallback avec prévisions simulées
      return this.getMockForecast(language, days);
    }
  }

  // Prévisions simulées
  getMockForecast(language, days) {
    const forecast = [];
    const baseTemp = 20;
    const baseHumidity = 50;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString(),
        temperature: baseTemp + (Math.random() - 0.5) * 10,
        humidity: baseHumidity + (Math.random() - 0.5) * 20,
        description: language === 'fr' 
          ? ['Ensoleillé', 'Nuageux', 'Partiellement nuageux'][Math.floor(Math.random() * 3)]
          : ['Sunny', 'Cloudy', 'Partially cloudy'][Math.floor(Math.random() * 3)],
        isMock: true
      });
    }
    
    return {
      forecast,
      language,
      isMock: true
    };
  }

  // Nettoyer le cache
  clearCache() {
    this.cache.clear();
  }

  // Obtenir des alertes météo pour les plantes
  getPlantWeatherAlerts(weatherData, language) {
    const alerts = [];
    
    if (weatherData.temperature > 30) {
      alerts.push({
        type: 'heat',
        severity: 'high',
        message: language === 'fr' 
          ? '🌡️ Température très élevée - surveillez vos plantes de près'
          : '🌡️ Very high temperature - monitor your plants closely'
      });
    }
    
    if (weatherData.temperature < 10) {
      alerts.push({
        type: 'cold',
        severity: 'medium',
        message: language === 'fr'
          ? '❄️ Température basse - éloignez les plantes des fenêtres'
          : '❄️ Low temperature - move plants away from windows'
      });
    }
    
    if (weatherData.humidity < 30) {
      alerts.push({
        type: 'dry',
        severity: 'medium',
        message: language === 'fr'
          ? '💨 Air très sec - augmentez l\'humidité autour des plantes'
          : '💨 Very dry air - increase humidity around plants'
      });
    }
    
    return alerts;
  }
}

// Instance singleton
export const weatherService = new WeatherService();
export default weatherService;