import React from 'react';

const WeatherWidget = ({ weather, location, language, texts }) => {
  if (!weather) {
    return (
      <div className="card weather-widget">
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'white' }}>
            <span className="card-icon">🌤️</span>
            {texts.weather}
          </h3>
        </div>
        <div style={{ textAlign: 'center', opacity: 0.8 }}>
          {language === 'fr' ? 'Chargement de la météo...' : 'Loading weather...'}
        </div>
      </div>
    );
  }

  const getWeatherIcon = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('sunny') || desc.includes('ensoleillé')) return '☀️';
    if (desc.includes('cloudy') || desc.includes('nuageux')) return '☁️';
    if (desc.includes('rain') || desc.includes('pluie')) return '🌧️';
    if (desc.includes('snow') || desc.includes('neige')) return '❄️';
    if (desc.includes('storm') || desc.includes('orage')) return '⛈️';
    return '🌤️';
  };

  const getPlantCareAdvice = () => {
    const temp = weather.temperature;
    const humidity = weather.humidity;
    
    if (language === 'fr') {
      if (temp > 25 && humidity < 50) {
        return "🌡️ Il fait chaud et sec - vos plantes ont besoin de plus d'eau !";
      } else if (temp < 15) {
        return "🧊 Température fraîche - réduisez l'arrosage.";
      } else if (humidity > 70) {
        return "💨 Humidité élevée - vérifiez la ventilation.";
      } else {
        return "✅ Conditions parfaites pour vos plantes !";
      }
    } else {
      if (temp > 25 && humidity < 50) {
        return "🌡️ Hot and dry - your plants need more water!";
      } else if (temp < 15) {
        return "🧊 Cool temperature - reduce watering.";
      } else if (humidity > 70) {
        return "💨 High humidity - check ventilation.";
      } else {
        return "✅ Perfect conditions for your plants!";
      }
    }
  };

  return (
    <div className="card weather-widget">
      <div className="card-header">
        <h3 className="card-title" style={{ color: 'white' }}>
          <span className="card-icon">{getWeatherIcon(weather.description)}</span>
          {texts.weather}
        </h3>
        {weather.isMock && (
          <span style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '0.75rem' 
          }}>
            {language === 'fr' ? 'Démo' : 'Demo'}
          </span>
        )}
      </div>

      <div className="weather-content">
        <div className="weather-temp">
          {Math.round(weather.temperature)}°C
        </div>
        
        <div className="weather-details">
          <div className="weather-location">
            📍 {weather.city}, {weather.country}
          </div>
          <div className="weather-description">
            {weather.description}
          </div>
          <div className="weather-stats">
            <div>
              <strong>💧 {language === 'fr' ? 'Humidité' : 'Humidity'}</strong><br />
              {weather.humidity}%
            </div>
            <div>
              <strong>💨 {language === 'fr' ? 'Vent' : 'Wind'}</strong><br />
              {Math.round(weather.windSpeed)} km/h
            </div>
          </div>
        </div>
      </div>

      {/* Conseil de soin basé sur la météo */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '8px',
        fontSize: '0.875rem'
      }}>
        {getPlantCareAdvice()}
      </div>
    </div>
  );
};

export default WeatherWidget;