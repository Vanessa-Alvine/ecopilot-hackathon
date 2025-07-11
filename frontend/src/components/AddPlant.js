import React, { useState, useRef } from 'react';
import { tavilyService } from '../services/tavilyService';
import PlantRecognitionService from '../services/PlantRecognitionService';

const AddPlant = ({ onAddPlant, language, texts, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    wateringFrequency: 7,
    notes: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [plantRecognition, setPlantRecognition] = useState(null);
  const [recognitionLoading, setRecognitionLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [recognitionState, setRecognitionState] = useState({
    isLoading: false,
    results: null,
    error: null,
    hasScanned: false
  });
  const [previewUrl, setPreviewUrl] = useState(null); // This state isn't used in the provided code, but kept for consistency
  const [dragOver, setDragOver] = useState(false); // This state isn't used in the provided code, but kept for consistency

  const recognitionService = useRef(new PlantRecognitionService());

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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'fr' ? 'Veuillez sélectionner une image' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'fr' ? 'Image trop grande (max 5MB)' : 'Image too large (max 5MB)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      setFormData(prev => ({ ...prev, image: file }));

      await recognizePlantAI(file); // Call the advanced AI recognition function

    } catch (error) {
      console.error('Erreur upload image:', error);
      alert(language === 'fr' ? 'Erreur lors de l\'upload' : 'Error uploading image');
    }
  };

  const analyzeImageLocally = (file) => {
    return new Promise((resolve) => {
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('monstera')) resolve('feuilles larges troués');
      else if (fileName.includes('pothos')) resolve('feuilles en forme de coeur');
      else if (fileName.includes('snake')) resolve('feuilles longues droites');
      else if (fileName.includes('ficus')) resolve('feuilles brillantes ovales');
      else resolve('plante verte feuilles'); // Générique
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'name' && value.length > 1) {
      const filtered = popularPlants[language].filter(plant =>
        plant.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      
      if (value.length > 3) {
        // You had a call to searchRealPlantSuggestions here, but the function isn't defined.
        // Assuming it would be similar to loadDetailedPlantInfo or a direct Tavily search.
        // For now, I'll remove the call to avoid errors, or you can implement it.
        // searchRealPlantSuggestions(value); 
      }
    } else if (field === 'name' && value.length <= 1) {
      setSuggestions([]);
    }
  };

  // NEW: Advanced Plant Recognition with PlantRecognitionService
  const recognizePlantAI = async (imageFile) => {
    setRecognitionLoading(true);
    setRecognitionState({
      isLoading: true,
      results: null,
      error: null,
      hasScanned: true
    });
    
    try {
      const results = await recognitionService.current.identifyPlant(imageFile, language);
      
      if (results.success) {
        setRecognitionState({
          isLoading: false,
          results: results.plant,
          error: null,
          hasScanned: true
        });
        
        setFormData(prev => ({
          ...prev,
          name: results.plant.name || prev.name,
          species: results.plant.scientificName || prev.species,
          wateringFrequency: extractWateringDays(results.plant.care?.watering) || prev.wateringFrequency
        }));
        
        // Keeping the old format for compatibility with existing plantRecognition state usage
        setPlantRecognition({
          plantName: results.plant.name,
          confidence: results.plant.metadata?.confidence || 0.8,
          care: {
            watering: {
              details: results.plant.care?.watering?.frequency,
              frequency: extractWateringDays(results.plant.care?.watering)
            },
            species: results.plant.scientificName
          },
          isFallback: false
        });
        
      } else {
        setRecognitionState({
          isLoading: false,
          results: null,
          error: results.error,
          hasScanned: true
        });
        
        // Fallback to the existing Tavily method
        await recognizePlantFallback(imageFile);
      }
      
    } catch (error) {
      console.error('Erreur reconnaissance avancée:', error);
      
      // Fallback to the existing Tavily method on error
      await recognizePlantFallback(imageFile);
      
    } finally {
      setRecognitionLoading(false);
    }
  };

  // Utility function to extract watering days
  const extractWateringDays = (wateringInfo) => {
    if (!wateringInfo?.frequency) return null;
    
    const frequency = wateringInfo.frequency.toLowerCase();
    const weeklyMatch = frequency.match(/(\d+).*(?:fois|times).*(?:semaine|week)/);
    const dailyMatch = frequency.match(/(\d+).*(?:jours?|days?)/);
    
    if (weeklyMatch) {
      return Math.round(7 / parseInt(weeklyMatch[1]));
    } else if (dailyMatch) {
      return parseInt(dailyMatch[1]);
    }
    
    return null;
  };

  // Renamed from original `recognizePlant` to `recognizePlantFallback`
  const recognizePlantFallback = async (imageFile) => {
    setRecognitionLoading(true); // Ensure loading state is true for fallback
    try {
      const imageDescription = await analyzeImageLocally(imageFile);
      const searchQuery = language === 'fr' 
        ? `identifier plante ${imageDescription} espèce nom commun`
        : `identify plant ${imageDescription} species common name`;

      const recognition = await tavilyService.searchPlantInfo(searchQuery, language);
      
      if (recognition && !recognition.isFallback) {
        setPlantRecognition(recognition);
        
        if (recognition.confidence > 0.7) {
          const suggestedName = recognition.plantName || recognition.care?.plantType;
          const suggestedSpecies = recognition.care?.species || '';
          const suggestedFrequency = parseInt(recognition.care?.watering?.frequency) || 7;
          
          setFormData(prev => ({
            ...prev,
            name: suggestedName || prev.name,
            species: suggestedSpecies || prev.species,
            wateringFrequency: suggestedFrequency
          }));
        }
      } else {
        // If Tavily also fails or returns fallback, set an error for the user
        setRecognitionState(prev => ({
          ...prev,
          isLoading: false,
          error: language === 'fr' ? 'Impossible de reconnaître la plante avec les informations disponibles.' : 'Could not recognize the plant with available information.',
          hasScanned: true
        }));
      }
    } catch (error) {
      console.error('Erreur fallback Tavily:', error);
      setRecognitionState(prev => ({
        ...prev,
        isLoading: false,
        error: language === 'fr' ? 'Erreur lors de la reconnaissance (Tavily).' : 'Error during recognition (Tavily).',
        hasScanned: true
      }));
    } finally {
      setRecognitionLoading(false);
    }
  };

  const selectSuggestion = (plant) => {
    setFormData(prev => ({
      ...prev,
      name: plant.name,
      species: plant.species,
      wateringFrequency: plant.frequency
    }));
    setSuggestions([]);
    
    if (plant.isFromTavily) {
      loadDetailedPlantInfo(plant.name);
    }
  };

  const loadDetailedPlantInfo = async (plantName) => {
    try {
      const details = await tavilyService.searchPlantInfo(plantName, language);
      if (details) {
        setPlantRecognition(details);
      }
    } catch (error) {
      console.error('Erreur détails plante:', error);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setPlantRecognition(null);
    setRecognitionState({
      isLoading: false,
      results: null,
      error: null,
      hasScanned: false
    });
    setFormData(prev => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let imageData = null;
      if (formData.image) {
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(formData.image);
        });
      }

      await onAddPlant({
        ...formData,
        image: imageData,
        plantRecognition: plantRecognition,
        nameFr: language === 'en' ? '' : formData.name,
        nameEn: language === 'fr' ? '' : formData.name,
        locationFr: language === 'en' ? '' : formData.location,
        locationEn: language === 'fr' ? '' : formData.location
      });
      
      setFormData({
        name: '',
        species: '',
        location: '',
        wateringFrequency: 7,
        notes: '',
        image: null
      });
      setImagePreview(null);
      setPlantRecognition(null);
      setRecognitionState({
        isLoading: false,
        results: null,
        error: null,
        hasScanned: false
      });
      
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
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>
          <span>←</span>
        </button>
        <h2 className="page-title">
          <span>🌱</span>
          {texts.addPlant}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="add-plant-form">
        <div className="form-group">
          <label className="form-label">
            📷 {language === 'fr' ? 'Photo de la plante (optionnel)' : 'Plant photo (optional)'}
          </label>
          
          {!imagePreview ? (
            <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-prompt">
                <span className="upload-icon">📸</span>
                <p>{language === 'fr' ? 'Ajouter une photo' : 'Add photo'}</p>
                <small>{language === 'fr' ? 'Reconnaissance automatique' : 'Automatic recognition'}</small>
              </div>
            </div>
          ) : (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Plant preview" className="image-preview" />
              <button type="button" className="remove-image-btn" onClick={removeImage}>
                ❌
              </button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          
          {recognitionLoading && (
            <div className="recognition-loading">
              <span className="loading-spinner small"></span>
              {language === 'fr' ? 'Reconnaissance en cours...' : 'Recognition in progress...'}
            </div>
          )}
          
          {/* Display results from the advanced AI recognition service first */}
          {recognitionState.results && (
            <div className="ai-care-advice">
              <h4>🤖 {language === 'fr' ? 'Conseils IA avancés' : 'Advanced AI Advice'}</h4>
              
              <div className="care-grid">
                <div className="care-item">
                  <span className="care-icon">💧</span>
                  <div>
                    <strong>{language === 'fr' ? 'Arrosage' : 'Watering'}</strong>
                    <p>{recognitionState.results.care?.watering?.frequency}</p>
                  </div>
                </div>
                
                <div className="care-item">
                  <span className="care-icon">☀️</span>
                  <div>
                    <strong>{language === 'fr' ? 'Lumière' : 'Light'}</strong>
                    <p>{recognitionState.results.care?.light?.level}</p>
                  </div>
                </div>
              </div>
              
              {recognitionState.results.canadianCare && (
                <div className="canadian-tips">
                  <h5>🍁 {language === 'fr' ? 'Conseils pour le Canada' : 'Tips for Canada'}</h5>
                  <p>{recognitionState.results.canadianCare.politeReminder}</p>
                  <p><strong>Zones:</strong> {recognitionState.results.canadianCare.zones}</p>
                </div>
              )}
            </div>
          )}

          {/* Display general plant recognition (e.g., from Tavily fallback) if advanced AI didn't provide specific results or if it was a fallback */}
          {plantRecognition && !plantRecognition.isFallback && !recognitionState.results && (
            <div className="recognition-results">
              <h4>🔍 {language === 'fr' ? 'Plante reconnue' : 'Plant recognized'}</h4>
              <p><strong>{plantRecognition.plantName}</strong></p>
              {plantRecognition.care?.watering && (
                <p>💧 {plantRecognition.care.watering.details}</p>
              )}
              <small>
                {language === 'fr' ? 'Confiance' : 'Confidence'}: {Math.round(plantRecognition.confidence * 100)}%
              </small>
            </div>
          )}

          {recognitionState.error && (
            <div className="recognition-error">
              <span>⚠️</span>
              <span>{recognitionState.error}</span>
            </div>
          )}
        </div>

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
          
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((plant, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggestion-item"
                  onClick={() => selectSuggestion(plant)}
                >
                  <div className="suggestion-content">
                    <span className="suggestion-name">{plant.name}</span>
                    <span className="suggestion-species">{plant.species}</span>
                    {plant.isFromTavily && (
                      <span className="tavily-badge">🔍 Tavily</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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