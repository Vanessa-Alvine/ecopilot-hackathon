const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET - Récupérer la météo par coordonnées
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Si pas de clé API, renvoyer des données simulées
    if (!process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY === 'your-weather-key-here') {
      const mockWeather = {
        temperature: 22 + Math.random() * 10, // 22-32°C
        humidity: 40 + Math.random() * 40, // 40-80%
        description: 'Partiellement nuageux',
        windSpeed: Math.random() * 15, // 0-15 km/h
        city: 'Ottawa',
        country: 'CA',
        isMock: true
      };
      
      return res.json(mockWeather);
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=fr`
    );

    const weatherData = {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      windSpeed: response.data.wind.speed,
      city: response.data.name,
      country: response.data.sys.country,
      isMock: false
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    
    // Fallback avec données simulées en cas d'erreur
    const mockWeather = {
      temperature: 22 + Math.random() * 10,
      humidity: 40 + Math.random() * 40,
      description: 'Données météo non disponibles',
      windSpeed: Math.random() * 15,
      city: 'Ottawa',
      country: 'CA',
      isMock: true,
      error: 'API temporairement indisponible'
    };
    
    res.json(mockWeather);
  }
});

module.exports = router;