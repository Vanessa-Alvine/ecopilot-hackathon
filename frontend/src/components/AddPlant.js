import React, { useState } from 'react';

const AddPlant = ({ onAddPlant, language, texts, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    wateringFrequency: 7,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Suggestions de plantes populaires
  const popularPlants = {
    fr: [
      { name: 'Monstera Deliciosa', species: 'Monstera deliciosa', frequency: 7 },
      { name: 'Pothos Doré', species: 'Epipremnum aureum', frequency: 10 },
      { name: 'Sansevieria', species: 'Sansevieria trifasciata', frequency: 14 },
      { name: 'Ficus Lyrata', species: 'Ficus lyrata', frequency: 7 },
      { name: 'Philodendron', species: 'Philodendron hederaceum', frequency: 8 },
      { name: 'Caoutchouc', species: 'Ficus elastica', frequency: 10 }
    ],
    en: [
      { name: 'Monstera Deliciosa', species: 'Monstera deliciosa', frequency: 7 },
      { name: 'Golden Pothos', species: 'Epipremnum aureum', frequency: 10 },
      { name: 'Snake Plant', species: 'Sansevieria trifasciata', frequency: 14 },
      { name: 'Fiddle Leaf Fig', species: 'Ficus lyrata', frequency: 7 },
      { name: 'Heartleaf Philodendron', species: 'Philodendron hederaceum', frequency: 8 },
      { name: 'Rubber Plant', species: 'Ficus elastica', frequency: 10 }
    ]
  };

  // Suggestions de lieux
  const locationSuggestions = {
    fr: [
      'Salon près de la fenêtre',
      'Cuisine',
      'Chambre',
      'Bureau',
      'Salle de bain',
      'Balcon',
      'Entrée',
      'Salle à manger'
    ],
    en: [
      'Living room near window',
      'Kitchen',
      'Bedroom',
      'Office',
      'Bathroom',
      'Balcony',
      'Entrance',
      'Dining room'
    ]
  };

  // Gérer les changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-suggestions pour les noms de plantes
    if (field === 'name' && value.length > 1) {
      const filtered = popularPlants[language].filter(plant =>
        plant.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else if (field === 'name' && value.length <= 1) {
      setSuggestions([]);
    }
  };

  // Sélectionner une suggestion
  const selectSuggestion = (plant) => {
    setFormData(prev => ({
      ...prev,
      name: plant.name,
      species: plant.species,
      wateringFrequency: plant.frequency
    }));
    setSuggestions([]);
  };

  // Valider le formulaire
  const validateForm = () => {
    if (!formData.name.trim()) {
      alert(language === 'fr' ? 'Le nom de la plante est requis' : 'Plant name is required');
      return false;
    }
    if (!formData.location.trim()) {
      alert(language === 'fr' ? 'L\'emplacement est requis' : 'Location is required');
      return false;
    }
    return true;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      await onAddPlant({
        ...formData,
        nameFr: language === 'en' ? '' : formData.name,
        nameEn: language === 'fr' ? '' : formData.name,
        locationFr: language === 'en' ? '' : formData.location,
        locationEn: language === 'fr' ? '' : formData.location
      });
      
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        species: '',
        location: '',
        wateringFrequency: 7,
        notes: ''
      });
      
      // Retourner à l'accueil
      setTimeout(() => {
        onBack();
      }, 1000);
      
    } catch (error) {
      console.error('Erreur ajout plante:', error);
      alert(language === 'fr' ? 'Erreur lors de l\'ajout' : 'Error adding plant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-plant-container">
      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>
          <span>←</span>
        </button>
        <h2 className="page-title">
          <span>🌱</span>
          {texts.addPlant}
        </h2>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="add-plant-form">
        {/* Nom de la plante */}
        <div className="form-group">
          <label className="form-label">
            {language === 'fr' ? 'Nom de la plante *' : 'Plant name *'}
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={language === 'fr' ? 'Ex: Monstera de Marie' : 'Ex: Marie\'s Monstera'}
            required
          />
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((plant, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggestion-item"
                  onClick={() => selectSuggestion(plant)}
                >
                  <span className="suggestion-name">{plant.name}</span>
                  <span className="suggestion-species">{plant.species}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Espèce */}
        <div className="form-group">
          <label className="form-label">
            {language === 'fr' ? 'Espèce (optionnel)' : 'Species (optional)'}
          </label>
          <input
            type="text"
            className="form-input"
            value={formData.species}
            onChange={(e) => handleInputChange('species', e.target.value)}
            placeholder={language === 'fr' ? 'Ex: Monstera deliciosa' : 'Ex: Monstera deliciosa'}
          />
        </div>

        {/* Emplacement */}
        <div className="form-group">
          <label className="form-label">
            {language === 'fr' ? 'Emplacement dans la maison *' : 'Location in house *'}
          </label>
          <select
            className="form-input form-select"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            required
          >
            <option value="">
              {language === 'fr' ? 'Choisissez un emplacement' : 'Choose a location'}
            </option>
            {locationSuggestions[language].map((location, index) => (
              <option key={index} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Fréquence d'arrosage */}
        <div className="form-group">
          <label className="form-label">
            {language === 'fr' ? 'Fréquence d\'arrosage' : 'Watering frequency'}
          </label>
          <div className="frequency-selector">
            <input
              type="range"
              min="1"
              max="21"
              value={formData.wateringFrequency}
              onChange={(e) => handleInputChange('wateringFrequency', parseInt(e.target.value))}
              className="frequency-slider"
            />
            <div className="frequency-display">
              <span className="frequency-value">{formData.wateringFrequency}</span>
              <span className="frequency-label">
                {language === 'fr' 
                  ? (formData.wateringFrequency === 1 ? 'jour' : 'jours')
                  : (formData.wateringFrequency === 1 ? 'day' : 'days')
                }
              </span>
            </div>
          </div>
          <div className="frequency-guide">
            {language === 'fr' ? (
              <small>💡 Conseil: La plupart des plantes d'intérieur ont besoin d'eau tous les 7-10 jours</small>
            ) : (
              <small>💡 Tip: Most houseplants need water every 7-10 days</small>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">
            {language === 'fr' ? 'Notes personnelles (optionnel)' : 'Personal notes (optional)'}
          </label>
          <textarea
            className="form-input"
            rows="3"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder={language === 'fr' 
              ? 'Ex: Cadeau de ma grand-mère, aime beaucoup de lumière...'
              : 'Ex: Gift from grandma, loves lots of light...'
            }
          />
        </div>

        {/* Boutons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner small"></span>
                {language === 'fr' ? 'Ajout...' : 'Adding...'}
              </>
            ) : (
              <>
                <span>🌱</span>
                {language === 'fr' ? 'Ajouter la plante' : 'Add plant'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestions rapides */}
      <div className="quick-suggestions">
        <h3 className="suggestions-title">
          {language === 'fr' ? 'Plantes populaires' : 'Popular plants'}
        </h3>
        <div className="suggestions-grid">
          {popularPlants[language].slice(0, 4).map((plant, index) => (
            <button
              key={index}
              type="button"
              className="quick-suggestion"
              onClick={() => selectSuggestion(plant)}
            >
              <div className="suggestion-name">{plant.name}</div>
              <div className="suggestion-frequency">
                {language === 'fr' 
                  ? `Tous les ${plant.frequency} jours`
                  : `Every ${plant.frequency} days`
                }
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddPlant;