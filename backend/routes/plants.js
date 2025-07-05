const express = require('express');
const router = express.Router();

// Messages bilingues
const messages = {
  fr: {
    plantWatered: 'Plante arrosée avec succès! 🌱',
    plantNotFound: 'Plante non trouvée',
    plantAdded: 'Nouvelle plante ajoutée avec succès! 🌿',
    plantUpdated: 'Plante mise à jour avec succès! ✨',
    plantDeleted: 'Plante supprimée avec succès! 👋'
  },
  en: {
    plantWatered: 'Plant watered successfully! 🌱',
    plantNotFound: 'Plant not found',
    plantAdded: 'New plant added successfully! 🌿',
    plantUpdated: 'Plant updated successfully! ✨',
    plantDeleted: 'Plant deleted successfully! 👋'
  }
};

// Simuler une base de données en mémoire avec données bilingues
let plants = [
  {
    id: '1',
    name: 'Monstera Deliciosa',
    nameFr: 'Monstera Deliciosa',
    nameEn: 'Swiss Cheese Plant',
    species: 'Monstera deliciosa',
    location: 'Salon près de la fenêtre',
    locationFr: 'Salon près de la fenêtre',
    locationEn: 'Living room near window',
    lastWatered: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    wateringFrequency: 7,
    createdAt: new Date().toISOString(),
    needsWater: true,
    tips: {
      fr: 'Aime la lumière indirecte et l\'humidité élevée',
      en: 'Loves indirect light and high humidity'
    }
  },
  {
    id: '2',
    name: 'Pothos Doré',
    nameFr: 'Pothos Doré',
    nameEn: 'Golden Pothos',
    species: 'Epipremnum aureum',
    location: 'Cuisine',
    locationFr: 'Cuisine',
    locationEn: 'Kitchen',
    lastWatered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    wateringFrequency: 10,
    createdAt: new Date().toISOString(),
    needsWater: false,
    tips: {
      fr: 'Très résistant, parfait pour débuter',
      en: 'Very resilient, perfect for beginners'
    }
  }
];

// GET - Récupérer toutes les plantes
router.get('/', (req, res) => {
  const lang = req.query.lang || 'fr';
  
  // Calculer si les plantes ont besoin d'eau
  const updatedPlants = plants.map(plant => {
    const daysSinceWatered = (Date.now() - new Date(plant.lastWatered)) / (1000 * 60 * 60 * 24);
    return {
      ...plant,
      needsWater: daysSinceWatered >= plant.wateringFrequency,
      daysSinceWatered: Math.floor(daysSinceWatered),
      displayName: lang === 'en' ? plant.nameEn || plant.name : plant.nameFr || plant.name,
      displayLocation: lang === 'en' ? plant.locationEn || plant.location : plant.locationFr || plant.location,
      currentTip: plant.tips ? plant.tips[lang] || plant.tips.fr : '',
      language: lang
    };
  });
  
  res.json(updatedPlants);
});

// POST - Ajouter une plante
router.post('/', (req, res) => {
  const lang = req.body.lang || 'fr';
  const msgs = messages[lang] || messages.fr;
  
  const plant = {
    id: Date.now().toString(),
    name: req.body.name,
    nameFr: req.body.nameFr || req.body.name,
    nameEn: req.body.nameEn || req.body.name,
    species: req.body.species,
    location: req.body.location,
    locationFr: req.body.locationFr || req.body.location,
    locationEn: req.body.locationEn || req.body.location,
    lastWatered: req.body.lastWatered || new Date().toISOString(),
    wateringFrequency: req.body.wateringFrequency || 7,
    createdAt: new Date().toISOString(),
    needsWater: false,
    tips: req.body.tips || { fr: '', en: '' }
  };
  
  plants.push(plant);
  res.status(201).json({
    message: msgs.plantAdded,
    messageFr: messages.fr.plantAdded,
    messageEn: messages.en.plantAdded,
    plant: plant
  });
});

// PUT - Arroser une plante
router.put('/:id/water', (req, res) => {
  const lang = req.body.lang || req.query.lang || 'fr';
  const msgs = messages[lang] || messages.fr;
  
  const plantIndex = plants.findIndex(p => p.id === req.params.id);
  if (plantIndex === -1) {
    return res.status(404).json({ 
      error: msgs.plantNotFound,
      errorFr: messages.fr.plantNotFound,
      errorEn: messages.en.plantNotFound
    });
  }
  
  plants[plantIndex].lastWatered = new Date().toISOString();
  plants[plantIndex].needsWater = false;
  
  res.json({
    message: msgs.plantWatered,
    messageFr: messages.fr.plantWatered,
    messageEn: messages.en.plantWatered,
    plant: plants[plantIndex]
  });
});

// PUT - Mettre à jour une plante
router.put('/:id', (req, res) => {
  const lang = req.body.lang || req.query.lang || 'fr';
  const msgs = messages[lang] || messages.fr;
  
  const plantIndex = plants.findIndex(p => p.id === req.params.id);
  if (plantIndex === -1) {
    return res.status(404).json({ 
      error: msgs.plantNotFound,
      errorFr: messages.fr.plantNotFound,
      errorEn: messages.en.plantNotFound
    });
  }
  
  plants[plantIndex] = { ...plants[plantIndex], ...req.body };
  res.json({
    message: msgs.plantUpdated,
    messageFr: messages.fr.plantUpdated,
    messageEn: messages.en.plantUpdated,
    plant: plants[plantIndex]
  });
});

// DELETE - Supprimer une plante
router.delete('/:id', (req, res) => {
  const lang = req.query.lang || 'fr';
  const msgs = messages[lang] || messages.fr;
  
  const plantIndex = plants.findIndex(p => p.id === req.params.id);
  if (plantIndex === -1) {
    return res.status(404).json({ 
      error: msgs.plantNotFound,
      errorFr: messages.fr.plantNotFound,
      errorEn: messages.en.plantNotFound
    });
  }
  
  plants.splice(plantIndex, 1);
  res.json({
    message: msgs.plantDeleted,
    messageFr: messages.fr.plantDeleted,
    messageEn: messages.en.plantDeleted
  });
});

module.exports = router;