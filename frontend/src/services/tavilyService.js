const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

class TavilyService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes pour les infos plantes
    this.requestQueue = [];
    this.isProcessing = false;
  }

  // Rechercher des informations sur une plante
  async searchPlantInfo(plantName, language = 'fr') {
    const cacheKey = `${plantName.toLowerCase()}-${language}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      
      if (now - cached.timestamp < this.cacheTimeout) {
        return { ...cached.data, fromCache: true };
      }
    }

    try {
      // Préparer la requête de recherche optimisée
      const searchQuery = this.buildOptimizedQuery(plantName, language);
      
      const response = await fetch(`${API_BASE_URL}/tavily/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        },
        body: JSON.stringify({
          query: searchQuery,
          lang: language
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Traiter et enrichir les données
      const processedData = this.processSearchResults(result.data, language);
      
      // Mettre en cache
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });

      return processedData;
    } catch (error) {
      console.error('Erreur recherche Tavily:', error);
      
      // Fallback avec base de connaissances locale
      return this.getFallbackPlantInfo(plantName, language);
    }
  }

  // Construire une requête optimisée pour Tavily
  buildOptimizedQuery(plantName, language) {
    const cleanName = plantName.toLowerCase().trim();
    
    if (language === 'fr') {
      return `${cleanName} plante intérieur soin arrosage fréquence lumière problèmes conseils entretien`;
    } else {
      return `${cleanName} houseplant care watering frequency light problems tips maintenance`;
    }
  }

  // Traiter les résultats de recherche Tavily
  processSearchResults(data, language) {
    if (!data || !data.sources || data.sources.length === 0) {
      return this.getFallbackPlantInfo(data?.query || 'plante générique', language);
    }

    // Extraire les informations clés
    const careInfo = this.extractCareInformation(data, language);
    const problems = this.extractCommonProblems(data, language);
    const tips = this.extractCareTips(data, language);
    
    return {
      plantName: data.query,
      language: language,
      lastUpdated: new Date().toISOString(),
      source: 'tavily',
      confidence: this.calculateConfidence(data.sources),
      
      // Informations de soin principales
      care: {
        watering: careInfo.watering,
        light: careInfo.light,
        humidity: careInfo.humidity,
        temperature: careInfo.temperature,
        fertilizing: careInfo.fertilizing,
        repotting: careInfo.repotting
      },
      
      // Problèmes courants et solutions
      problems: problems,
      
      // Conseils pratiques
      tips: tips,
      
      // Informations supplémentaires
      difficulty: this.assessDifficulty(data, language),
      toxicity: this.checkToxicity(data, language),
      airPurifying: this.checkAirPurifying(data),
      
      // Sources et crédibilité
      sources: data.sources.slice(0, 3).map(source => ({
        title: source.title,
        url: source.url,
        snippet: source.snippet?.substring(0, 200) + '...',
        relevance: source.relevanceScore || 0.8
      })),
      
      // Résumé intelligent
      summary: data.answer || this.generateSummary(careInfo, language),
      
      // Données brutes pour debug
      rawData: process.env.NODE_ENV === 'development' ? data : undefined
    };
  }

  // Extraire les informations de soin
  extractCareInformation(data, language) {
    const content = this.combineContent(data.sources);
    const contentLower = content.toLowerCase();
    
    return {
      watering: this.extractWateringInfo(contentLower, language),
      light: this.extractLightInfo(contentLower, language),
      humidity: this.extractHumidityInfo(contentLower, language),
      temperature: this.extractTemperatureInfo(contentLower, language),
      fertilizing: this.extractFertilizingInfo(contentLower, language),
      repotting: this.extractRepottingInfo(contentLower, language)
    };
  }

  // Extraction spécialisée pour l'arrosage
  extractWateringInfo(content, language) {
    const wateringPatterns = {
      fr: [
        /arroser?\s+tous\s+les\s+(\d+(?:-\d+)?)\s*jours?/gi,
        /fréquence\s+d[''']arrosage\s*:\s*(\d+(?:-\d+)?)\s*jours?/gi,
        /(\d+(?:-\d+)?)\s*jours?\s+entre\s+les\s+arrosages/gi
      ],
      en: [
        /water\s+every\s+(\d+(?:-\d+)?)\s*days?/gi,
        /watering\s+frequency\s*:\s*(\d+(?:-\d+)?)\s*days?/gi,
        /(\d+(?:-\d+)?)\s*days?\s+between\s+waterings?/gi
      ]
    };
    
    const patterns = wateringPatterns[language] || wateringPatterns.en;
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const frequency = match[1] || match[0].match(/\d+(?:-\d+)?/)[0];
        return {
          frequency: frequency,
          details: language === 'fr' 
            ? `Arroser tous les ${frequency} jours environ`
            : `Water approximately every ${frequency} days`,
          confidence: 0.9
        };
      }
    }
    
    // Fréquence par défaut basée sur des indices
    if (content.includes('succulent') || content.includes('cactus') || content.includes('grasse')) {
      return {
        frequency: '14-21',
        details: language === 'fr' 
          ? 'Arrosage espacé, laisser sécher complètement entre les arrosages'
          : 'Infrequent watering, let dry completely between waterings',
        confidence: 0.7
      };
    }
    
    return {
      frequency: '7-10',
      details: language === 'fr' 
        ? 'Arroser quand le sol est sec en surface'
        : 'Water when topsoil is dry',
      confidence: 0.6
    };
  }

  // Extraction pour la lumière
  extractLightInfo(content, language) {
    const lightKeywords = {
      bright: ['bright', 'vive', 'intense'],
      indirect: ['indirect', 'indirecte', 'filtered', 'filtrée'],
      low: ['low light', 'faible', 'ombre'],
      direct: ['direct sun', 'plein soleil', 'direct']
    };
    
    let lightType = 'indirect'; // par défaut
    let details = '';
    
    if (this.containsKeywords(content, lightKeywords.direct)) {
      lightType = 'direct';
      details = language === 'fr' 
        ? 'Lumière directe du soleil plusieurs heures par jour'
        : 'Direct sunlight for several hours daily';
    } else if (this.containsKeywords(content, lightKeywords.bright)) {
      lightType = 'bright-indirect';
      details = language === 'fr' 
        ? 'Lumière vive mais indirecte, près d\'une fenêtre'
        : 'Bright but indirect light, near a window';
    } else if (this.containsKeywords(content, lightKeywords.low)) {
      lightType = 'low';
      details = language === 'fr' 
        ? 'Tolère une faible luminosité, éloignée des fenêtres'
        : 'Tolerates low light, away from windows';
    } else {
      details = language === 'fr' 
        ? 'Lumière indirecte, éviter le soleil direct'
        : 'Indirect light, avoid direct sun';
    }
    
    return {
      type: lightType,
      details: details,
      confidence: 0.8
    };
  }

  // Extraire les problèmes courants
  extractCommonProblems(data, language) {
    const content = this.combineContent(data.sources).toLowerCase();
    const problems = [];
    
    const problemPatterns = {
      fr: [
        { pattern: /feuilles jaunes/gi, problem: 'Feuilles jaunes', cause: 'Arrosage excessif ou manque de lumière' },
        { pattern: /feuilles brunes/gi, problem: 'Feuilles brunes', cause: 'Air trop sec ou brûlure du soleil' },
        { pattern: /feuilles tombantes/gi, problem: 'Feuilles tombantes', cause: 'Manque d\'eau ou stress' },
        { pattern: /pourriture/gi, problem: 'Pourriture des racines', cause: 'Arrosage excessif, drainage insuffisant' }
      ],
      en: [
        { pattern: /yellow leaves/gi, problem: 'Yellow leaves', cause: 'Overwatering or insufficient light' },
        { pattern: /brown leaves/gi, problem: 'Brown leaves', cause: 'Low humidity or sun burn' },
        { pattern: /drooping leaves/gi, problem: 'Drooping leaves', cause: 'Underwatering or stress' },
        { pattern: /root rot/gi, problem: 'Root rot', cause: 'Overwatering, poor drainage' }
      ]
    };
    
    const patterns = problemPatterns[language] || problemPatterns.en;
    
    patterns.forEach(({ pattern, problem, cause }) => {
      if (pattern.test(content)) {
        problems.push({ problem, cause, confidence: 0.8 });
      }
    });
    
    return problems.length > 0 ? problems : this.getDefaultProblems(language);
  }

  // Extraire les conseils pratiques
  extractCareTips(data, language) {
    const content = this.combineContent(data.sources);
    const tips = [];
    
    const tipKeywords = {
      fr: [
        'essuyer les feuilles',
        'vaporiser',
        'humidité',
        'drainage',
        'rempotage',
        'fertilisant',
        'taille'
      ],
      en: [
        'wipe leaves',
        'mist',
        'humidity',
        'drainage',
        'repotting',
        'fertilizer',
        'pruning'
      ]
    };
    
    const keywords = tipKeywords[language] || tipKeywords.en;
    
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        tips.push(this.getTipForKeyword(keyword, language));
      }
    });
    
    return tips.length > 0 ? tips.slice(0, 5) : this.getDefaultTips(language);
  }

  // Fonctions utilitaires
  combineContent(sources) {
    return sources.map(source => source.snippet || source.content || '').join(' ');
  }

  containsKeywords(content, keywords) {
    return keywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  calculateConfidence(sources) {
    if (!sources || sources.length === 0) return 0.5;
    
    const avgRelevance = sources.reduce((sum, source) => 
      sum + (source.relevanceScore || 0.8), 0) / sources.length;
    
    const sourceQuality = sources.length >= 3 ? 1.0 : sources.length * 0.33;
    
    return Math.min(avgRelevance * sourceQuality, 1.0);
  }

  // Données de fallback détaillées
  getFallbackPlantInfo(plantName, language) {
    const fallbackDB = {
      fr: {
        'monstera': {
          care: {
            watering: { frequency: '7-10', details: 'Arroser quand le sol est sec en surface' },
            light: { type: 'bright-indirect', details: 'Lumière vive mais indirecte' }
          },
          problems: [
            { problem: 'Feuilles jaunes', cause: 'Arrosage excessif' },
            { problem: 'Feuilles brunes', cause: 'Air trop sec' }
          ],
          tips: ['Essuyer les feuilles régulièrement', 'Utiliser un tuteur']
        },
        'pothos': {
          care: {
            watering: { frequency: '7-14', details: 'Très tolérant, arroser modérément' },
            light: { type: 'low-medium', details: 'Tolère une faible luminosité' }
          },
          problems: [
            { problem: 'Croissance lente', cause: 'Manque de lumière' }
          ],
          tips: ['Parfait pour débuter', 'Se propage facilement dans l\'eau']
        }
      },
      en: {
        'monstera': {
          care: {
            watering: { frequency: '7-10', details: 'Water when topsoil is dry' },
            light: { type: 'bright-indirect', details: 'Bright but indirect light' }
          },
          problems: [
            { problem: 'Yellow leaves', cause: 'Overwatering' },
            { problem: 'Brown leaves', cause: 'Low humidity' }
          ],
          tips: ['Wipe leaves regularly', 'Use a moss pole for support']
        },
        'pothos': {
          care: {
            watering: { frequency: '7-14', details: 'Very tolerant, water moderately' },
            light: { type: 'low-medium', details: 'Tolerates low light' }
          },
          problems: [
            { problem: 'Slow growth', cause: 'Insufficient light' }
          ],
          tips: ['Perfect for beginners', 'Propagates easily in water']
        }
      }
    };
    
    const plantKey = plantName.toLowerCase().split(' ')[0];
    const plantData = fallbackDB[language]?.[plantKey] || fallbackDB[language]?.['pothos'];
    
    return {
      plantName: plantName,
      language: language,
      source: 'fallback',
      confidence: 0.7,
      ...plantData,
      summary: language === 'fr' 
        ? `Informations de base pour ${plantName}. Consultez un spécialiste pour des conseils détaillés.`
        : `Basic information for ${plantName}. Consult a specialist for detailed advice.`,
      isFallback: true
    };
  }

  // Recherche de diagnostic de problèmes
  async diagnosePlantProblem(symptoms, plantName, language = 'fr') {
    const query = language === 'fr'
      ? `${plantName} problème ${symptoms} diagnostic solution traitement`
      : `${plantName} problem ${symptoms} diagnosis solution treatment`;
    
    return this.searchPlantInfo(query, language);
  }

  // Recherche saisonnière
  async getSeasonalCare(plantName, season, language = 'fr') {
    const query = language === 'fr'
      ? `${plantName} soin ${season} arrosage lumière température`
      : `${plantName} care ${season} watering light temperature`;
    
    return this.searchPlantInfo(query, language);
  }

  // Nettoyer le cache
  clearCache() {
    this.cache.clear();
  }

  // Obtenir les statistiques du cache
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

// Instance singleton
export const tavilyService = new TavilyService();
export default tavilyService;