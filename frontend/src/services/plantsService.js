const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

class PlantsService {
  // Récupérer toutes les plantes
  async getPlants(language = 'fr') {
    try {
      const response = await fetch(`${API_BASE_URL}/plants?lang=${language}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur récupération plantes:', error);
      
      // Fallback avec données locales
      return this.getFallbackPlants(language);
    }
  }

  // Ajouter une nouvelle plante
  async addPlant(plantData) {
    try {
      const response = await fetch(`${API_BASE_URL}/plants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(plantData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.plant || result;
    } catch (error) {
      console.error('Erreur ajout plante:', error);
      
      // Fallback local
      const newPlant = {
        id: Date.now().toString(),
        ...plantData,
        lastWatered: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        needsWater: false
      };
      
      // Sauvegarder localement
      this.saveToLocalStorage(newPlant);
      return newPlant;
    }
  }

  // Arroser une plante
  async waterPlant(plantId, language = 'fr') {
    try {
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}/water`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lang: language })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur arrosage plante:', error);
      
      // Fallback local
      this.updateLocalPlant(plantId, {
        lastWatered: new Date().toISOString(),
        needsWater: false
      });
      
      return {
        message: language === 'fr' ? 'Plante arrosée (local)' : 'Plant watered (local)',
        success: true
      };
    }
  }

  // Mettre à jour une plante
  async updatePlant(plantId, updateData, language = 'fr') {
    try {
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...updateData, lang: language })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.plant || result;
    } catch (error) {
      console.error('Erreur mise à jour plante:', error);
      
      // Fallback local
      this.updateLocalPlant(plantId, updateData);
      return { success: true };
    }
  }

  // Supprimer une plante
  async deletePlant(plantId, language = 'fr') {
    try {
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}?lang=${language}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur suppression plante:', error);
      
      // Fallback local
      this.removeFromLocalStorage(plantId);
      return { success: true };
    }
  }

  // Données de fallback en cas de problème réseau
  getFallbackPlants(language) {
    const plants = {
      fr: [
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
          needsWater: true,
          daysSinceWatered: 5,
          displayName: 'Monstera Deliciosa',
          displayLocation: 'Salon près de la fenêtre',
          currentTip: 'Aime la lumière indirecte et l\'humidité élevée',
          language: 'fr',
          isFallback: true
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
          needsWater: false,
          daysSinceWatered: 2,
          displayName: 'Pothos Doré',
          displayLocation: 'Cuisine',
          currentTip: 'Très résistant, parfait pour débuter',
          language: 'fr',
          isFallback: true
        }
      ],
      en: [
        {
          id: '1',
          name: 'Swiss Cheese Plant',
          nameFr: 'Monstera Deliciosa',
          nameEn: 'Swiss Cheese Plant',
          species: 'Monstera deliciosa',
          location: 'Living room near window',
          locationFr: 'Salon près de la fenêtre',
          locationEn: 'Living room near window',
          lastWatered: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          wateringFrequency: 7,
          needsWater: true,
          daysSinceWatered: 5,
          displayName: 'Swiss Cheese Plant',
          displayLocation: 'Living room near window',
          currentTip: 'Loves indirect light and high humidity',
          language: 'en',
          isFallback: true
        },
        {
          id: '2',
          name: 'Golden Pothos',
          nameFr: 'Pothos Doré',
          nameEn: 'Golden Pothos',
          species: 'Epipremnum aureum',
          location: 'Kitchen',
          locationFr: 'Cuisine',
          locationEn: 'Kitchen',
          lastWatered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          wateringFrequency: 10,
          needsWater: false,
          daysSinceWatered: 2,
          displayName: 'Golden Pothos',
          displayLocation: 'Kitchen',
          currentTip: 'Very resilient, perfect for beginners',
          language: 'en',
          isFallback: true
        }
      ]
    };

    return plants[language] || plants.fr;
  }

  // Gestion du stockage local
  saveToLocalStorage(plant) {
    try {
      const existingPlants = JSON.parse(localStorage.getItem('ecopilot_plants') || '[]');
      existingPlants.push(plant);
      localStorage.setItem('ecopilot_plants', JSON.stringify(existingPlants));
    } catch (error) {
      console.error('Erreur stockage local:', error);
    }
  }

  updateLocalPlant(plantId, updateData) {
    try {
      const existingPlants = JSON.parse(localStorage.getItem('ecopilot_plants') || '[]');
      const updatedPlants = existingPlants.map(plant =>
        plant.id === plantId ? { ...plant, ...updateData } : plant
      );
      localStorage.setItem('ecopilot_plants', JSON.stringify(updatedPlants));
    } catch (error) {
      console.error('Erreur mise à jour locale:', error);
    }
  }

  removeFromLocalStorage(plantId) {
    try {
      const existingPlants = JSON.parse(localStorage.getItem('ecopilot_plants') || '[]');
      const filteredPlants = existingPlants.filter(plant => plant.id !== plantId);
      localStorage.setItem('ecopilot_plants', JSON.stringify(filteredPlants));
    } catch (error) {
      console.error('Erreur suppression locale:', error);
    }
  }

  // Synchroniser avec le stockage local
  async syncWithLocal(serverPlants) {
    try {
      const localPlants = JSON.parse(localStorage.getItem('ecopilot_plants') || '[]');
      const mergedPlants = [...serverPlants];
      
      // Ajouter les plantes locales qui ne sont pas sur le serveur
      localPlants.forEach(localPlant => {
        if (!serverPlants.find(serverPlant => serverPlant.id === localPlant.id)) {
          mergedPlants.push({ ...localPlant, isLocal: true });
        }
      });
      
      return mergedPlants;
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      return serverPlants;
    }
  }
}

// Instance singleton
export const plantsService = new PlantsService();
export default plantsService;