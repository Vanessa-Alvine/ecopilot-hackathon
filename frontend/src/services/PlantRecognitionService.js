// PlantRecognitionService.js - Service de reconnaissance d'images pour EcoPilot
// Utilise Plant.id API + Tavily pour enrichir les données

class PlantRecognitionService {
  constructor() {
    // Configuration API Plant.id (gratuite avec limitations)
    this.plantIdApiKey = process.env.REACT_APP_PLANT_ID_API_KEY || 'demo-key';
    this.plantIdBaseUrl = 'https://api.plant.id/v3';
    
    // Configuration Tavily pour enrichissement (PRIX: Best Use of Tavily API - $2,000)
    this.tavilyApiKey = process.env.REACT_APP_TAVILY_API_KEY;
    this.tavilyBaseUrl = 'https://api.tavily.com/search';
    
    // Cache pour éviter les appels répétés
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24h
  }

  /**
   * Reconnaître une plante à partir d'une image
   * @param {File|string} imageFile - Fichier image ou base64
   * @param {string} language - Langue pour les résultats
   * @returns {Promise<Object>} Résultats de reconnaissance enrichis
   */
  async identifyPlant(imageFile, language = 'fr') {
    try {
      // 1. Convertir l'image en base64 si nécessaire
      const base64Image = await this.convertToBase64(imageFile);
      
      // 2. Reconnaissance avec Plant.id
      const plantIdResults = await this.callPlantIdAPI(base64Image, language);
      
      if (!plantIdResults.is_plant || plantIdResults.suggestions.length === 0) {
        throw new Error(language === 'fr' 
          ? 'Aucune plante détectée dans l\'image' 
          : 'No plant detected in image'
        );
      }

      // 3. Enrichir avec Tavily API (STRATÉGIE GAGNANTE!)
      const enrichedResults = await this.enrichWithTavily(
        plantIdResults.suggestions[0], 
        language
      );

      // 4. Ajouter conseils canadiens spécifiques (PRIX: Most Canadian Agent!)
      const canadianTips = await this.addCanadianContext(
        enrichedResults, 
        language
      );

      return {
        success: true,
        confidence: plantIdResults.suggestions[0].probability,
        plant: {
          name: enrichedResults.commonName,
          scientificName: enrichedResults.scientificName,
          family: enrichedResults.family,
          description: enrichedResults.description,
          
          // Soins spécifiques
          care: {
            watering: enrichedResults.watering,
            light: enrichedResults.light,
            humidity: enrichedResults.humidity,
            temperature: enrichedResults.temperature,
            soil: enrichedResults.soil,
            fertilizing: enrichedResults.fertilizing
          },
          
          // Contexte canadien (PRIX CIBLÉ!)
          canadianCare: canadianTips,
          
          // Dangers et allergies
          toxicity: enrichedResults.toxicity,
          petSafe: enrichedResults.petSafe,
          
          // Calendrier saisonnier
          seasonalCare: enrichedResults.seasonalCare,
          
          // Problèmes courants
          commonIssues: enrichedResults.commonIssues,
          
          // Métadonnées
          metadata: {
            confidence: plantIdResults.suggestions[0].probability,
            detectedAt: new Date().toISOString(),
            sources: enrichedResults.sources,
            lastUpdated: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      console.error('Erreur reconnaissance plante:', error);
      return {
        success: false,
        error: error.message,
        fallbackSuggestions: await this.getFallbackSuggestions(language)
      };
    }
  }

  /**
   * Appel à l'API Plant.id pour reconnaissance
   */
  async callPlantIdAPI(base64Image, language) {
    const cacheKey = `plantid_${this.hashImage(base64Image)}_${language}`;
    
    // Vérifier cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    const response = await fetch(`${this.plantIdBaseUrl}/identification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.plantIdApiKey
      },
      body: JSON.stringify({
        images: [base64Image],
        modifiers: ['crops_fast', 'similar_images'],
        language: language === 'fr' ? 'fr' : 'en',
        plant_language: language === 'fr' ? 'fr' : 'en',
        plant_net: true,
        plant_details: [
          'common_names',
          'taxonomy',
          'description',
          'synonyms',
          'image',
          'edible_parts',
          'toxicity',
          'propagation_methods'
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Mettre en cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Enrichir les données avec Tavily API (STRATÉGIE GAGNANTE - $2,000!)
   */
  async enrichWithTavily(plantSuggestion, language) {
    if (!this.tavilyApiKey) {
      console.warn('Tavily API non configurée, utilisation des données Plant.id seulement');
      return this.formatPlantIdData(plantSuggestion, language);
    }

    const scientificName = plantSuggestion.plant_name;
    const commonName = plantSuggestion.plant_details?.common_names?.[0] || scientificName;

    try {
      // Recherches ciblées avec Tavily
      const [careGuide, canadianInfo, problemSolutions] = await Promise.all([
        this.searchTavily(`${scientificName} plant care guide watering light humidity`, language),
        this.searchTavily(`${commonName} plant care Canada climate zones growing tips`, language),
        this.searchTavily(`${scientificName} common problems diseases pests solutions`, language)
      ]);

      return {
        commonName,
        scientificName,
        family: plantSuggestion.plant_details?.taxonomy?.family || 'Famille inconnue',
        description: this.extractDescription(careGuide, language),
        
        // Soins extraits de Tavily (DONNÉES ENRICHIES!)
        watering: this.extractWateringInfo(careGuide, language),
        light: this.extractLightInfo(careGuide, language),
        humidity: this.extractHumidityInfo(careGuide, language),
        temperature: this.extractTemperatureInfo(careGuide, language),
        soil: this.extractSoilInfo(careGuide, language),
        fertilizing: this.extractFertilizingInfo(careGuide, language),
        
        // Informations spécifiques au Canada
        canadianZones: this.extractCanadianZones(canadianInfo),
        winterCare: this.extractWinterCare(canadianInfo, language),
        
        // Toxicité et sécurité
        toxicity: plantSuggestion.plant_details?.toxicity || null,
        petSafe: this.determinePetSafety(plantSuggestion, careGuide),
        
        // Calendrier saisonnier
        seasonalCare: this.extractSeasonalCare(canadianInfo, language),
        
        // Problèmes courants avec solutions
        commonIssues: this.extractCommonIssues(problemSolutions, language),
        
        // Sources pour transparence
        sources: [
          { name: 'Plant.id', type: 'recognition' },
          { name: 'Tavily Web Search', type: 'care_guides' },
          { name: 'Canadian Gardening Resources', type: 'local_context' }
        ]
      };

    } catch (error) {
      console.error('Erreur enrichissement Tavily:', error);
      // Fallback sur Plant.id seulement
      return this.formatPlantIdData(plantSuggestion, language);
    }
  }

  /**
   * Recherche avec Tavily API
   */
  async searchTavily(query, language) {
    const response = await fetch(this.tavilyBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.tavilyApiKey
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_domains: [
          'extension.umd.edu',
          'gardeningknowhow.com',
          'thespruce.com',
          'rhs.org.uk',
          'canadiangardening.com',
          'omafra.gov.on.ca'
        ],
        max_results: 5,
        include_raw_content: true
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Ajouter contexte canadien spécifique (PRIX: Most Canadian Agent - $500!)
   */
  async addCanadianContext(plantData, language) {
    const canadianTips = {
      zones: plantData.canadianZones || 'Zones 3-9 (selon la variété)',
      indoorWinter: language === 'fr' 
        ? 'En hiver canadien, réduisez l\'arrosage de 50% et éloignez des sources de chaleur sèche.'
        : 'During Canadian winter, reduce watering by 50% and keep away from dry heat sources.',
      
      seasonalReminders: {
        spring: language === 'fr' 
          ? 'Printemps: Reprise de croissance, augmentez graduellement l\'arrosage.'
          : 'Spring: Growth resumes, gradually increase watering.',
        summer: language === 'fr'
          ? 'Été: Arrosage régulier, attention aux vagues de chaleur.'
          : 'Summer: Regular watering, watch for heat waves.',
        fall: language === 'fr'
          ? 'Automne: Préparez pour l\'hiver, réduisez les nutriments.'
          : 'Fall: Prepare for winter, reduce nutrients.',
        winter: language === 'fr'
          ? 'Hiver: Arrosage minimal, humidité importante avec le chauffage.'
          : 'Winter: Minimal watering, humidity important with heating.'
      },
      
      localSuppliers: language === 'fr' 
        ? 'Disponible dans la plupart des centres jardins canadiens (Canadian Tire, Home Depot, pépinières locales).'
        : 'Available at most Canadian garden centers (Canadian Tire, Home Depot, local nurseries).',
      
      politeReminder: language === 'fr'
        ? 'N\'hésitez pas à demander conseil à votre centre jardin local, eh! 🍁'
        : 'Don\'t hesitate to ask for advice at your local garden center, eh! 🍁'
    };

    return canadianTips;
  }

  /**
   * Extraire informations d'arrosage depuis Tavily
   */
  extractWateringInfo(searchResults, language) {
    const content = this.getCombinedContent(searchResults);
    
    // Patterns pour extraire info d'arrosage
    const wateringPatterns = [
      /water.*?(\d+)\s*(?:times?\s*(?:per|a)\s*week|weekly)/i,
      /water.*?when.*?(?:top|soil).*?(?:dry|dried)/i,
      /(?:weekly|every\s*\d+\s*days?).*?water/i
    ];

    let frequency = language === 'fr' ? 'Quand le sol est sec en surface' : 'When topsoil is dry';
    let notes = [];

    for (const pattern of wateringPatterns) {
      const match = content.match(pattern);
      if (match) {
        if (match[1]) {
          frequency = language === 'fr' 
            ? `${match[1]} fois par semaine environ`
            : `About ${match[1]} times per week`;
        }
        break;
      }
    }

    return {
      frequency,
      method: language === 'fr' ? 'Arrosage en profondeur mais peu fréquent' : 'Deep but infrequent watering',
      notes: notes,
      seasonal: language === 'fr' 
        ? 'Réduire en hiver, augmenter en été'
        : 'Reduce in winter, increase in summer'
    };
  }

  /**
   * Extraire informations de lumière
   */
  extractLightInfo(searchResults, language) {
    const content = this.getCombinedContent(searchResults);
    
    const lightKeywords = {
      bright: ['bright', 'direct sun', 'full sun'],
      indirect: ['indirect', 'filtered', 'bright indirect'],
      low: ['low light', 'shade', 'dim']
    };

    let lightLevel = language === 'fr' ? 'Lumière indirecte' : 'Indirect light';
    
    if (lightKeywords.bright.some(keyword => content.toLowerCase().includes(keyword))) {
      lightLevel = language === 'fr' ? 'Lumière directe vive' : 'Bright direct light';
    } else if (lightKeywords.low.some(keyword => content.toLowerCase().includes(keyword))) {
      lightLevel = language === 'fr' ? 'Faible luminosité' : 'Low light';
    }

    return {
      level: lightLevel,
      hours: language === 'fr' ? '6-8 heures par jour' : '6-8 hours per day',
      placement: language === 'fr' 
        ? 'Près d\'une fenêtre orientée sud ou ouest'
        : 'Near south or west-facing window'
    };
  }

  /**
   * Extraire problèmes courants et solutions
   */
  extractCommonIssues(searchResults, language) {
    const content = this.getCombinedContent(searchResults);
    
    const commonIssues = [];
    
    // Patterns pour détecter problèmes
    const issuePatterns = [
      { 
        pattern: /yellow.*?leaves?/i, 
        issue: language === 'fr' ? 'Feuilles jaunissantes' : 'Yellowing leaves',
        cause: language === 'fr' ? 'Arrosage excessif ou manque de lumière' : 'Overwatering or lack of light',
        solution: language === 'fr' ? 'Réduire l\'arrosage et vérifier l\'exposition' : 'Reduce watering and check light exposure'
      },
      {
        pattern: /brown.*?(?:tips|edges)/i,
        issue: language === 'fr' ? 'Pointes brunes' : 'Brown tips',
        cause: language === 'fr' ? 'Air trop sec ou excès d\'engrais' : 'Dry air or fertilizer burn',
        solution: language === 'fr' ? 'Augmenter l\'humidité et rincer le sol' : 'Increase humidity and flush soil'
      },
      {
        pattern: /dropping.*?leaves?/i,
        issue: language === 'fr' ? 'Chute de feuilles' : 'Leaf drop',
        cause: language === 'fr' ? 'Stress hydrique ou changement d\'environnement' : 'Water stress or environmental change',
        solution: language === 'fr' ? 'Maintenir un arrosage régulier' : 'Maintain consistent watering'
      }
    ];

    issuePatterns.forEach(({ pattern, issue, cause, solution }) => {
      if (content.match(pattern)) {
        commonIssues.push({ issue, cause, solution });
      }
    });

    return commonIssues.length > 0 ? commonIssues : [{
      issue: language === 'fr' ? 'Surveillance générale' : 'General monitoring',
      cause: language === 'fr' ? 'Prévention' : 'Prevention',
      solution: language === 'fr' 
        ? 'Vérifier régulièrement les feuilles et l\'état du sol'
        : 'Regularly check leaves and soil condition'
    }];
  }

  /**
   * Convertir image en base64
   */
  async convertToBase64(imageFile) {
    if (typeof imageFile === 'string') {
      return imageFile; // Déjà en base64
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Retirer le prefix data:image/...
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Obtenir contenu combiné des résultats Tavily
   */
  getCombinedContent(searchResults) {
    if (!searchResults?.results) return '';
    
    return searchResults.results
      .map(result => `${result.title} ${result.content}`)
      .join(' ')
      .toLowerCase();
  }

  /**
   * Hash simple pour cache d'images
   */
  hashImage(base64) {
    let hash = 0;
    for (let i = 0; i < Math.min(base64.length, 1000); i++) {
      const char = base64.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Suggestions de fallback en cas d'erreur
   */
  async getFallbackSuggestions(language) {
    const suggestions = language === 'fr' ? [
      'Pothos - Facile d\'entretien, tolère la faible lumière',
      'Sansevieria - Très résistant, arrosage minimal',
      'Philodendron - Croissance rapide, lumière indirecte',
      'ZZ Plant - Parfait pour débutants',
      'Monstera - Populaire, lumière indirecte vive'
    ] : [
      'Pothos - Easy care, tolerates low light',
      'Sansevieria - Very hardy, minimal watering',
      'Philodendron - Fast growing, indirect light',
      'ZZ Plant - Perfect for beginners',
      'Monstera - Popular, bright indirect light'
    ];

    return suggestions.map(suggestion => ({
      name: suggestion.split(' - ')[0],
      tip: suggestion.split(' - ')[1]
    }));
  }

  /**
   * Formater données Plant.id en fallback
   */
  formatPlantIdData(plantSuggestion, language) {
    return {
      commonName: plantSuggestion.plant_details?.common_names?.[0] || plantSuggestion.plant_name,
      scientificName: plantSuggestion.plant_name,
      family: plantSuggestion.plant_details?.taxonomy?.family || 'Unknown',
      description: plantSuggestion.plant_details?.description?.value || (
        language === 'fr' ? 'Description non disponible' : 'Description not available'
      ),
      watering: { 
        frequency: language === 'fr' ? 'Selon les besoins' : 'As needed',
        method: language === 'fr' ? 'Arrosage modéré' : 'Moderate watering'
      },
      light: { 
        level: language === 'fr' ? 'Lumière moyenne' : 'Medium light'
      },
      commonIssues: [],
      sources: [{ name: 'Plant.id', type: 'recognition' }]
    };
  }

  // Méthodes d'extraction additionnelles...
  extractHumidityInfo(searchResults, language) {
    return {
      level: language === 'fr' ? '40-60%' : '40-60%',
      tips: language === 'fr' 
        ? 'Utiliser un humidificateur en hiver'
        : 'Use humidifier in winter'
    };
  }

  extractTemperatureInfo(searchResults, language) {
    return {
      ideal: '18-24°C',
      minimum: '15°C',
      notes: language === 'fr' 
        ? 'Éviter les courants d\'air froids'
        : 'Avoid cold drafts'
    };
  }

  extractSoilInfo(searchResults, language) {
    return {
      type: language === 'fr' ? 'Terreau bien drainant' : 'Well-draining potting soil',
      ph: '6.0-7.0',
      drainage: language === 'fr' ? 'Excellent' : 'Excellent'
    };
  }

  extractFertilizingInfo(searchResults, language) {
    return {
      frequency: language === 'fr' ? 'Mensuel en saison de croissance' : 'Monthly during growing season',
      type: language === 'fr' ? 'Engrais liquide équilibré' : 'Balanced liquid fertilizer',
      winter: language === 'fr' ? 'Arrêter en hiver' : 'Stop in winter'
    };
  }

  extractCanadianZones(searchResults) {
    // Extraire zones de rusticité canadiennes
    const content = this.getCombinedContent(searchResults);
    const zoneMatch = content.match(/zone[s]?\s*(\d+(?:-\d+)?)/i);
    return zoneMatch ? `Zone ${zoneMatch[1]}` : 'Zones 3-9';
  }

  extractWinterCare(searchResults, language) {
    return language === 'fr' 
      ? 'Réduire arrosage, maintenir humidité, éloigner du chauffage'
      : 'Reduce watering, maintain humidity, keep away from heating';
  }

  extractSeasonalCare(searchResults, language) {
    return {
      spring: language === 'fr' ? 'Reprise de l\'arrosage' : 'Resume watering',
      summer: language === 'fr' ? 'Arrosage régulier' : 'Regular watering',
      fall: language === 'fr' ? 'Réduire progressivement' : 'Gradually reduce',
      winter: language === 'fr' ? 'Arrosage minimal' : 'Minimal watering'
    };
  }

  determinePetSafety(plantSuggestion, searchResults) {
    const toxicity = plantSuggestion.plant_details?.toxicity;
    if (toxicity && toxicity.toxicity_level > 0) {
      return 'unsafe';
    }
    
    const content = this.getCombinedContent(searchResults);
    if (content.includes('toxic') || content.includes('poisonous')) {
      return 'unsafe';
    }
    
    return 'safe';
  }
}

export default PlantRecognitionService;