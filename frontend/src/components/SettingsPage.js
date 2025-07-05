import React, { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';

const SettingsPage = ({ 
  settings, 
  onUpdateSettings, 
  onNavigate, 
  language, 
  texts, 
  location, 
  onGetLocation 
}) => {
  const [formData, setFormData] = useState({
    userName: '',
    homeAddress: '',
    homeRadius: 100, // mètres
    emergencyContacts: [],
    awayTimeThreshold: 2, // heures avant d'alerter
    notifications: {
      enabled: true,
      sound: true,
      vibration: true,
      locationBased: true,
      plantReminders: true
    }
  });
  
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    type: 'sms' // sms, whatsapp, email
  });
  
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [currentLocationDisplay, setCurrentLocationDisplay] = useState('');

  // Charger les paramètres existants
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings,
        homeRadius: settings.homeRadius * 1000 || 100, // Convertir km en mètres
        emergencyContacts: settings.emergencyContacts || []
      }));
    }
  }, [settings]);

  // Afficher localisation actuelle
  useEffect(() => {
    if (location) {
      setCurrentLocationDisplay(
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
      );
    }
  }, [location]);

  // Textes bilingues pour les paramètres
  const settingsTexts = {
    fr: {
      personalInfo: 'Informations personnelles',
      userName: 'Votre nom',
      homeSettings: 'Paramètres du domicile',
      homeAddress: 'Adresse de votre domicile',
      homeRadius: 'Rayon considéré comme "à la maison"',
      currentLocation: 'Position actuelle',
      useCurrentLocation: 'Utiliser position actuelle',
      searchAddress: 'Rechercher une adresse',
      emergencyContacts: 'Contacts d\'urgence',
      addContact: 'Ajouter un contact',
      contactName: 'Nom du contact',
      contactPhone: 'Téléphone',
      contactType: 'Type de contact',
      awaySettings: 'Paramètres d\'absence',
      awayTimeThreshold: 'Temps avant alerte d\'absence',
      notifications: 'Notifications',
      enableNotifications: 'Activer les notifications',
      locationNotifications: 'Notifications géolocalisées',
      plantReminders: 'Rappels pour plantes',
      soundEnabled: 'Son activé',
      vibrationEnabled: 'Vibration activée',
      testNotification: 'Tester les notifications',
      saveSettings: 'Sauvegarder',
      settingsSaved: 'Paramètres sauvegardés !',
      deleteContact: 'Supprimer',
      editContact: 'Modifier',
      meters: 'mètres',
      hours: 'heures',
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      email: 'Email',
      addressPlaceholder: 'Ex: 123 Rue Main, Ottawa, ON',
      namePlaceholder: 'Ex: Marie Dupont',
      phonePlaceholder: 'Ex: +1 613 555 0123'
    },
    en: {
      personalInfo: 'Personal information',
      userName: 'Your name',
      homeSettings: 'Home settings',
      homeAddress: 'Your home address',
      homeRadius: 'Radius considered as "at home"',
      currentLocation: 'Current location',
      useCurrentLocation: 'Use current location',
      searchAddress: 'Search address',
      emergencyContacts: 'Emergency contacts',
      addContact: 'Add contact',
      contactName: 'Contact name',
      contactPhone: 'Phone number',
      contactType: 'Contact type',
      awaySettings: 'Away settings',
      awayTimeThreshold: 'Time before away alert',
      notifications: 'Notifications',
      enableNotifications: 'Enable notifications',
      locationNotifications: 'Location-based notifications',
      plantReminders: 'Plant reminders',
      soundEnabled: 'Sound enabled',
      vibrationEnabled: 'Vibration enabled',
      testNotification: 'Test notifications',
      saveSettings: 'Save settings',
      settingsSaved: 'Settings saved!',
      deleteContact: 'Delete',
      editContact: 'Edit',
      meters: 'meters',
      hours: 'hours',
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      email: 'Email',
      addressPlaceholder: 'Ex: 123 Main Street, Ottawa, ON',
      namePlaceholder: 'Ex: Marie Dupont',
      phonePlaceholder: 'Ex: +1 613 555 0123'
    }
  };

  const t = settingsTexts[language];

  // Gérer changements de formulaire
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Recherche d'adresse avec géocodage
  const searchAddress = async (query) => {
    if (query.length < 5) {
      setAddressSuggestions([]);
      return;
    }

    setIsGeocodingAddress(true);
    
    try {
      // Utiliser Nominatim pour le géocodage gratuit
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ca&limit=5&accept-language=${language}`
      );
      
      if (response.ok) {
        const results = await response.json();
        const suggestions = results.map(result => ({
          address: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          city: result.address?.city || result.address?.town || '',
          province: result.address?.state || ''
        }));
        setAddressSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Erreur géocodage:', error);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Sélectionner une adresse suggérée
  const selectAddress = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      homeAddress: suggestion.address,
      homeCoordinates: {
        latitude: suggestion.lat,
        longitude: suggestion.lon,
        source: 'geocoded'
      }
    }));
    setAddressSuggestions([]);
  };

  // Utiliser position actuelle comme domicile
  const useCurrentLocationAsHome = async () => {
    if (location) {
      try {
        const address = await locationService.getApproximateAddress(
          location.latitude, 
          location.longitude, 
          language
        );
        
        setFormData(prev => ({
          ...prev,
          homeAddress: address.formatted,
          homeCoordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
            source: 'current-location'
          }
        }));
      } catch (error) {
        // Fallback sans adresse
        setFormData(prev => ({
          ...prev,
          homeAddress: language === 'fr' 
            ? 'Position actuelle définie'
            : 'Current location set',
          homeCoordinates: {
            latitude: location.latitude,
            longitude: location.longitude,
            source: 'current-location'
          }
        }));
      }
    } else {
      onGetLocation?.();
    }
  };

  // Ajouter contact d'urgence
  const addEmergencyContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      alert(language === 'fr' 
        ? 'Nom et téléphone requis'
        : 'Name and phone required'
      );
      return;
    }

    const contact = {
      id: Date.now().toString(),
      ...newContact,
      createdAt: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, contact]
    }));

    setNewContact({ name: '', phone: '', type: 'sms' });
  };

  // Supprimer contact
  const removeContact = (contactId) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter(c => c.id !== contactId)
    }));
  };

  // Tester les notifications
  const testNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🌱 EcoPilot Test', {
          body: language === 'fr' 
            ? 'Les notifications fonctionnent parfaitement !'
            : 'Notifications are working perfectly!',
          icon: '/favicon.ico'
        });
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            testNotification();
          }
        });
      }
    }
  };

  // Sauvegarder les paramètres
  const saveSettings = () => {
    const updatedSettings = {
      ...formData,
      homeRadius: formData.homeRadius / 1000, // Convertir mètres en km
      language: language // Garder la langue actuelle
    };

    onUpdateSettings(updatedSettings);
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('home')}>
          <span>←</span>
        </button>
        <h2 className="page-title">
          <span>⚙️</span>
          {texts.settings}
        </h2>
      </div>

      <div className="settings-content">
        
        {/* Informations personnelles */}
        <div className="settings-section">
          <h3 className="section-title">👤 {t.personalInfo}</h3>
          
          <div className="form-group">
            <label className="form-label">{t.userName}</label>
            <input
              type="text"
              className="form-input"
              value={formData.userName}
              onChange={(e) => handleInputChange('userName', e.target.value)}
              placeholder={t.namePlaceholder}
            />
          </div>
        </div>

        {/* Paramètres du domicile */}
        <div className="settings-section">
          <h3 className="section-title">🏠 {t.homeSettings}</h3>
          
          {/* Adresse du domicile */}
          <div className="form-group">
            <label className="form-label">{t.homeAddress}</label>
            <div className="address-input-container">
              <input
                type="text"
                className="form-input"
                value={formData.homeAddress}
                onChange={(e) => {
                  handleInputChange('homeAddress', e.target.value);
                  searchAddress(e.target.value);
                }}
                placeholder={t.addressPlaceholder}
              />
              {isGeocodingAddress && (
                <div className="loading-indicator">🔍</div>
              )}
            </div>
            
            {/* Suggestions d'adresses */}
            {addressSuggestions.length > 0 && (
              <div className="address-suggestions">
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="address-suggestion"
                    onClick={() => selectAddress(suggestion)}
                  >
                    📍 {suggestion.address}
                  </button>
                ))}
              </div>
            )}
            
            {/* Position actuelle */}
            <div className="current-location-section">
              <div className="current-location-display">
                <strong>{t.currentLocation}:</strong>
                <span className="coordinates">{currentLocationDisplay || 'Non disponible'}</span>
              </div>
              <button 
                className="btn btn-outline"
                onClick={useCurrentLocationAsHome}
                disabled={!location}
              >
                📍 {t.useCurrentLocation}
              </button>
            </div>
          </div>

          {/* Rayon de la maison */}
          <div className="form-group">
            <label className="form-label">
              {t.homeRadius}: {formData.homeRadius}m
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={formData.homeRadius}
              onChange={(e) => handleInputChange('homeRadius', parseInt(e.target.value))}
              className="radius-slider"
            />
            <div className="radius-labels">
              <span>50m</span>
              <span>500m</span>
            </div>
          </div>
        </div>

        {/* Contacts d'urgence */}
        <div className="settings-section">
          <h3 className="section-title">🆘 {t.emergencyContacts}</h3>
          
          {/* Liste des contacts existants */}
          {formData.emergencyContacts.length > 0 && (
            <div className="contacts-list">
              {formData.emergencyContacts.map(contact => (
                <div key={contact.id} className="contact-item">
                  <div className="contact-info">
                    <div className="contact-name">{contact.name}</div>
                    <div className="contact-details">
                      {contact.phone} • {t[contact.type]}
                    </div>
                  </div>
                  <button 
                    className="btn-delete"
                    onClick={() => removeContact(contact.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Ajouter nouveau contact */}
          <div className="add-contact-form">
            <div className="form-row">
              <input
                type="text"
                className="form-input"
                placeholder={t.contactName}
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="tel"
                className="form-input"
                placeholder={t.phonePlaceholder}
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <select
                className="form-input form-select"
                value={newContact.type}
                onChange={(e) => setNewContact(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="sms">{t.sms}</option>
                <option value="whatsapp">{t.whatsapp}</option>
                <option value="email">{t.email}</option>
              </select>
              <button 
                className="btn btn-primary"
                onClick={addEmergencyContact}
              >
                ➕ {t.addContact}
              </button>
            </div>
          </div>
        </div>

        {/* Paramètres d'absence */}
        <div className="settings-section">
          <h3 className="section-title">🚶 {t.awaySettings}</h3>
          
          <div className="form-group">
            <label className="form-label">
              {t.awayTimeThreshold}: {formData.awayTimeThreshold} {t.hours}
            </label>
            <input
              type="range"
              min="1"
              max="24"
              value={formData.awayTimeThreshold}
              onChange={(e) => handleInputChange('awayTimeThreshold', parseInt(e.target.value))}
              className="time-slider"
            />
            <small className="form-help">
              {language === 'fr' 
                ? 'Temps d\'absence avant d\'alerter vos contacts si des plantes ont besoin d\'eau'
                : 'Time away before alerting your contacts if plants need water'
              }
            </small>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <h3 className="section-title">🔔 {t.notifications}</h3>
          
          <div className="toggle-group">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={formData.notifications.enabled}
                onChange={(e) => handleInputChange('notifications.enabled', e.target.checked)}
              />
              <span className="toggle-label">{t.enableNotifications}</span>
            </label>
            
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={formData.notifications.locationBased}
                onChange={(e) => handleInputChange('notifications.locationBased', e.target.checked)}
                disabled={!formData.notifications.enabled}
              />
              <span className="toggle-label">{t.locationNotifications}</span>
            </label>
            
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={formData.notifications.plantReminders}
                onChange={(e) => handleInputChange('notifications.plantReminders', e.target.checked)}
                disabled={!formData.notifications.enabled}
              />
              <span className="toggle-label">{t.plantReminders}</span>
            </label>
            
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={formData.notifications.sound}
                onChange={(e) => handleInputChange('notifications.sound', e.target.checked)}
                disabled={!formData.notifications.enabled}
              />
              <span className="toggle-label">{t.soundEnabled}</span>
            </label>
            
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={formData.notifications.vibration}
                onChange={(e) => handleInputChange('notifications.vibration', e.target.checked)}
                disabled={!formData.notifications.enabled}
              />
              <span className="toggle-label">{t.vibrationEnabled}</span>
            </label>
          </div>
          
          <button 
            className="btn btn-secondary"
            onClick={testNotification}
          >
            🧪 {t.testNotification}
          </button>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="settings-actions">
          <button 
            className="btn btn-primary btn-large"
            onClick={saveSettings}
          >
            💾 {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;