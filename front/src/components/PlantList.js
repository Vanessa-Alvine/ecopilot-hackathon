import React from 'react';

const PlantList = ({ plants, language, onWaterPlant, texts }) => {
  if (plants.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🪴</div>
        <h3 className="empty-state-title">
          {language === 'fr' ? 'Aucune plante pour l\'instant' : 'No plants yet'}
        </h3>
        <p className="empty-state-description">
          {language === 'fr' 
            ? 'Ajoutez votre première plante pour commencer votre jardin intérieur !'
            : 'Add your first plant to start your indoor garden!'
          }
        </p>
        <button 
          className="btn btn-primary"
          onClick={() => window.dispatchEvent(new CustomEvent('showAddPlant'))}
        >
          <span>➕</span>
          {texts.addPlant}
        </button>
      </div>
    );
  }

  const plantsNeedingWater = plants.filter(plant => plant.needsWater);
  const healthyPlants = plants.filter(plant => !plant.needsWater);

  return (
    <div className="plants-section">
      {/* Plantes ayant besoin d'eau */}
      {plantsNeedingWater.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">💧</span>
              {language === 'fr' ? 'Plantes assoiffées' : 'Thirsty plants'}
            </h3>
            <span className="urgent-badge">
              {plantsNeedingWater.length}
            </span>
          </div>
          <div className="plants-list">
            {plantsNeedingWater.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                language={language}
                onWaterPlant={onWaterPlant}
                isUrgent={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Plantes en bonne santé */}
      {healthyPlants.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🌿</span>
              {language === 'fr' ? 'Plantes heureuses' : 'Happy plants'}
            </h3>
            <span className="healthy-badge">
              {healthyPlants.length}
            </span>
          </div>
          <div className="plants-list">
            {healthyPlants.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                language={language}
                onWaterPlant={onWaterPlant}
                isUrgent={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Composant pour chaque plante
const PlantCard = ({ plant, language, onWaterPlant, isUrgent }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return language === 'fr' ? 'Aujourd\'hui' : 'Today';
    } else if (diffDays === 1) {
      return language === 'fr' ? 'Hier' : 'Yesterday';
    } else {
      return language === 'fr' ? `Il y a ${diffDays} jours` : `${diffDays} days ago`;
    }
  };

  const getNextWateringDate = () => {
    const lastWatered = new Date(plant.lastWatered);
    const nextWatering = new Date(lastWatered);
    nextWatering.setDate(lastWatered.getDate() + plant.wateringFrequency);
    
    const now = new Date();
    const diffTime = nextWatering - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return language === 'fr' ? `En retard de ${Math.abs(diffDays)} jour(s)` : `${Math.abs(diffDays)} day(s) overdue`;
    } else if (diffDays === 0) {
      return language === 'fr' ? 'Aujourd\'hui' : 'Today';
    } else if (diffDays === 1) {
      return language === 'fr' ? 'Demain' : 'Tomorrow';
    } else {
      return language === 'fr' ? `Dans ${diffDays} jours` : `In ${diffDays} days`;
    }
  };

  return (
    <div className={`plant-card ${isUrgent ? 'needs-water' : ''} fade-in`}>
      <div className="plant-header">
        <div>
          <div className="plant-name">
            {plant.displayName || plant.name}
          </div>
          <div className="plant-species">{plant.species}</div>
        </div>
        <div className={`plant-status ${isUrgent ? 'status-water' : 'status-good'}`}>
          {isUrgent 
            ? (language === 'fr' ? 'Soif' : 'Thirsty')
            : (language === 'fr' ? 'Bien' : 'Good')
          }
        </div>
      </div>

      <div className="plant-info">
        <div>
          <strong>📍 {language === 'fr' ? 'Lieu' : 'Location'}:</strong><br />
          {plant.displayLocation || plant.location}
        </div>
        <div>
          <strong>💧 {language === 'fr' ? 'Dernier arrosage' : 'Last watered'}:</strong><br />
          {formatDate(plant.lastWatered)}
        </div>
        <div>
          <strong>⏰ {language === 'fr' ? 'Fréquence' : 'Frequency'}:</strong><br />
          {language === 'fr' ? `Tous les ${plant.wateringFrequency} jours` : `Every ${plant.wateringFrequency} days`}
        </div>
        <div>
          <strong>📅 {language === 'fr' ? 'Prochain arrosage' : 'Next watering'}:</strong><br />
          {getNextWateringDate()}
        </div>
      </div>

      {/* Conseils si disponibles */}
      {plant.currentTip && (
        <div className="plant-tip">
          <strong>💡 {language === 'fr' ? 'Conseil' : 'Tip'}:</strong>
          <p>{plant.currentTip}</p>
        </div>
      )}

      <div className="plant-actions">
        {isUrgent && (
          <button
            className="btn btn-water"
            onClick={() => onWaterPlant(plant.id)}
          >
            <span>💧</span>
            {language === 'fr' ? 'Arroser maintenant' : 'Water now'}
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => {
            // TODO: Implémenter vue détaillée
            console.log('Voir détails', plant.id);
          }}
        >
          <span>👁️</span>
          {language === 'fr' ? 'Détails' : 'Details'}
        </button>
      </div>
    </div>
  );
};

export default PlantList;