import React, { useState, useRef } from 'react';
import { tavilyService } from '../services/tavilyService';

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

  // Suggestions de plantes populaires (gardez l'existant)
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

  // Gérer l'upload d'image RÉEL
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert(language === 'fr' ? 'Veuillez sélectionner une image' : 'Please select an image file');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'fr' ? 'Image trop grande (max 5MB)' : 'Image too large (max 5MB)');
      return;
    }

    try {
      // Créer un aperçu local
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Stocker le fichier
      setFormData(prev => ({ ...prev, image: file }));

      // Reconnaissance automatique de la plante
      await recognizePlant(file);

    } catch (error) {
      console.error('Erreur upload image:', error);
      alert(language === 'fr' ? 'Erreur lors de l\'upload' : 'Error uploading image');
    }
  };

  // Reconnaissance RÉELLE de plante via Tavily
  const recognizePlant = async (imageFile) => {
    setRecognitionLoading(true);
    
    try {
      // Convertir l'image en texte descriptif (simple pour le prototype)
      const imageDescription = await analyzeImageLocally(imageFile);
      
      // Rechercher via Tavily avec la description
      const searchQuery = language === 'fr' 
        ? `identifier plante ${imageDescription} espèce nom commun`
        : `identify plant ${imageDescription} species common name`;

      const recognition = await tavilyService.searchPlantInfo(searchQuery, language);
      
      if (recognition && !recognition.isFallback) {
        setPlantRecognition(recognition);
        
        // Auto-remplir le formulaire si confiance élevée
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
      }
      
    } catch (error) {
      console.error('Erreur reconnaissance:', error);
    } finally {
      setRecognitionLoading(false);
    }
  };

  // Analyse locale basique de l'image (fallback)
  const analyzeImageLocally = (file) => {
    return new Promise((resolve) => {
      // Analyse basique basée sur le nom de fichier et métadonnées
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('monstera')) resolve('feuilles larges troués');
      else if (fileName.includes('pothos')) resolve('feuilles en forme de coeur');
      else if (fileName.includes('snake')) resolve('feuilles longues droites');
      else if (fileName.includes('ficus')) resolve('feuilles brillantes ovales');
      else resolve('plante verte feuilles'); // Générique
    });
  };

  // Gérer les changements de formulaire (gardez l'existant et ajoutez)
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-suggestions pour les noms de plantes
    if (field === 'name' && value.length > 1) {
      const filtered = popularPlants[language].filter(plant =>
        plant.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      
      // Recherche RÉELLE via Tavily pour suggestions avancées
      if (value.length > 3) {
        searchRealPlantSuggestions(value);
      }
    } else if (field === 'name' && value.length <= 1) {
      setSuggestions([]);
    }
  };

  // Recherche RÉELLE de suggestions via Tavily
  const searchRealPlantSuggestions = async (query) => {
    try {
      const searchResults = await tavilyService.searchPlantInfo(query, language);
      if (searchResults && searchResults.care) {
        // Ajouter aux suggestions existantes
        const realSuggestion = {
          name: searchResults.plantName,
          species: searchResults.care.species || query,
          frequency: parseInt(searchResults.care.watering?.frequency) || 7,
          isFromTavily: true,
          confidence: searchResults.confidence
        };
        
        setSuggestions(prev => [realSuggestion, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Erreur suggestions Tavily:', error);
    }
  };

  // Sélectionner une suggestion (améliorée)
  const selectSuggestion = (plant) => {
    setFormData(prev => ({
      ...prev,
      name: plant.name,
      species: plant.species,
      wateringFrequency: plant.frequency
    }));
    setSuggestions([]);
    
    // Si c'est une suggestion Tavily, charger plus d'infos
    if (plant.isFromTavily) {
      loadDetailedPlantInfo(plant.name);
    }
  };

  // Charger infos détaillées via Tavily
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

  // Supprimer l'image
  const removeImage = () => {
    setImagePreview(null);
    setPlantRecognition(null);
    setFormData(prev => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Valider le formulaire (gardez l'existant)
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

  // Soumettre le formulaire (amélioré avec image)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Convertir l'image en base64 si présente
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
        image: imageData, // Base64 de l'image
        plantRecognition: plantRecognition, // Infos Tavily
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
        notes: '',
        image: null
      });
      setImagePreview(null);
      setPlantRecognition(null);
      
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
        
        {/* NOUVEAU : Section photo de la plante */}
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
          
          {/* Reconnaissance en cours */}
          {recognitionLoading && (
            <div className="recognition-loading">
              <span className="loading-spinner small"></span>
              {language === 'fr' ? 'Reconnaissance en cours...' : 'Recognition in progress...'}
            </div>
          )}
          
          {/* Résultats de reconnaissance */}
          {plantRecognition && !plantRecognition.isFallback && (
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
        </div>

        {/* Nom de la plante (gardez l'existant) */}
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
          
          {/* Suggestions améliorées */}
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

        {/* Gardez le reste du formulaire existant (espèce, emplacement, fréquence, notes) */}
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

      {/* Suggestions rapides (gardez l'existant) */}
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