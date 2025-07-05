const express = require('express');
const axios = require('axios');
const router = express.Router();

// Messages bilingues pour Tavily
const tavilyMessages = {
  fr: {
    searchQueryRequired: 'Une requête de recherche est requise',
    plantInfoNotFound: 'Informations sur cette plante non trouvées',
    searchFailed: 'Échec de la recherche d\'informations sur les plantes',
    searchSuccess: 'Informations trouvées avec succès',
    noResults: 'Aucun résultat trouvé pour cette recherche',
    apiUnavailable: 'Service Tavily temporairement indisponible'
  },
  en: {
    searchQueryRequired: 'Search query is required',
    plantInfoNotFound: 'Plant information not found',
    searchFailed: 'Failed to fetch plant information',
    searchSuccess: 'Information found successfully',
    noResults: 'No results found for this search',
    apiUnavailable: 'Tavily service temporarily unavailable'
  }
};

// Base de connaissances de plantes en cas de fallback
const plantKnowledgeBase = {
  'monstera': {
    fr: {
      name: 'Monstera Deliciosa',
      care: 'Arroser quand le sol est sec, lumière indirecte, humidité élevée',
      tips: 'Essuyer les feuilles régulièrement, supporter avec un tuteur',
      frequency: '7-10 jours',
      problems: 'Feuilles jaunes = trop d\'eau, feuilles brunes = air trop sec'
    },
    en: {
      name: 'Monstera Deliciosa',
      care: 'Water when soil is dry, indirect light, high humidity',
      tips: 'Wipe leaves regularly, provide support with moss pole',
      frequency: '7-10 days',
      problems: 'Yellow leaves = overwatering, brown leaves = low humidity'
    }
  },
  'pothos': {
    fr: {
      name: 'Pothos',
      care: 'Très facile, tolère la négligence, lumière faible à moyenne',
      tips: 'Parfait pour débuter, se propage facilement dans l\'eau',
      frequency: '7-14 jours',
      problems: 'Très résistant, surveiller l\'arrosage excessif'
    },
    en: {
      name: 'Pothos',
      care: 'Very easy, tolerates neglect, low to medium light',
      tips: 'Perfect for beginners, propagates easily in water',
      frequency: '7-14 days',
      problems: 'Very resilient, watch for overwatering'
    }
  },
  'snake plant': {
    fr: {
      name: 'Sansevieria (Langue de Belle-Mère)',
      care: 'Très peu d\'eau, tolère la sécheresse, lumière faible',
      tips: 'Parfait pour les débutants, purifie l\'air',
      frequency: '14-21 jours',
      problems: 'Pourriture des racines si trop arrosé'
    },
    en: {
      name: 'Sansevieria (Snake Plant)',
      care: 'Very little water, drought tolerant, low light',
      tips: 'Perfect for beginners, air purifying',
      frequency: '14-21 days',
      problems: 'Root rot if overwatered'
    }
  }
};

// POST - Rechercher des informations sur les plantes via Tavily
router.post('/search', async (req, res) => {
  try {
    const { query, lang = 'fr' } = req.body;
    const msgs = tavilyMessages[lang] || tavilyMessages.fr;
    
    if (!query) {
      return res.status(400).json({ 
        error: msgs.searchQueryRequired,
        errorFr: tavilyMessages.fr.searchQueryRequired,
        errorEn: tavilyMessages.en.searchQueryRequired
      });
    }

    // Si pas de clé Tavily, utiliser la base de connaissances locale
    if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'your-tavily-api-key-here') {
      return await handleLocalSearch(query, lang, msgs, res);
    }

    // Préparer la requête selon la langue
    const searchQuery = lang === 'en' 
      ? `${query} plant care watering frequency tips problems`
      : `${query} soin plante arrosage fréquence conseils problèmes`;

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: searchQuery,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
      include_domains: ['gardeningknowhow.com', 'thespruce.com', 'plantnet.org', 'jardiland.com'],
      exclude_domains: ['pinterest.com', 'reddit.com']
    }, {
      timeout: 10000 // 10 secondes timeout
    });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return await handleLocalSearch(query, lang, msgs, res);
    }

    // Formater les résultats pour EcoPilot
    const processedResults = {
      query: query,
      language: lang,
      answer: response.data.answer,
      answerFr: lang === 'en' ? await translateToFrench(response.data.answer) : response.data.answer,
      answerEn: lang === 'fr' ? await translateToEnglish(response.data.answer) : response.data.answer,
      sources: response.data.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
        relevanceScore: result.score || 0.8
      })),
      plantCare: extractPlantCareInfo(response.data.results, lang),
      timestamp: new Date().toISOString(),
      source: 'tavily',
      success: true
    };

    res.json({
      message: msgs.searchSuccess,
      messageFr: tavilyMessages.fr.searchSuccess,
      messageEn: tavilyMessages.en.searchSuccess,
      data: processedResults
    });

  } catch (error) {
    console.error('Tavily API error:', error);
    
    const lang = req.body.lang || 'fr';
    const msgs = tavilyMessages[lang] || tavilyMessages.fr;
    
    // Fallback vers la base de connaissances locale
    return await handleLocalSearch(req.body.query, lang, msgs, res);
  }
});

// Fonction pour gérer la recherche locale (fallback)
async function handleLocalSearch(query, lang, msgs, res) {
  const queryLower = query.toLowerCase();
  let matchedPlant = null;
  
  // Chercher dans la base de connaissances
  for (const [key, plantData] of Object.entries(plantKnowledgeBase)) {
    if (queryLower.includes(key) || 
        plantData[lang]?.name.toLowerCase().includes(queryLower) ||
        plantData.fr?.name.toLowerCase().includes(queryLower) ||
        plantData.en?.name.toLowerCase().includes(queryLower)) {
      matchedPlant = plantData;
      break;
    }
  }
  
  if (!matchedPlant) {
    // Plante générique si aucune correspondance
    matchedPlant = {
      fr: {
        name: 'Plante d\'intérieur générique',
        care: 'Lumière indirecte, arroser quand le sol est sec, éviter les courants d\'air',
        tips: 'Surveillez les feuilles pour détecter les problèmes, fertilisez au printemps',
        frequency: '7-10 jours',
        problems: 'Feuilles jaunes = arrosage excessif, feuilles tombantes = manque d\'eau'
      },
      en: {
        name: 'Generic houseplant',
        care: 'Indirect light, water when soil is dry, avoid drafts',
        tips: 'Watch leaves for problems, fertilize in spring',
        frequency: '7-10 days',
        problems: 'Yellow leaves = overwatering, drooping leaves = underwatering'
      }
    };
  }
  
  const plantInfo = matchedPlant[lang] || matchedPlant.fr;
  const plantInfoOther = matchedPlant[lang === 'fr' ? 'en' : 'fr'];
  
  const localResults = {
    query: query,
    language: lang,
    answer: plantInfo.care,
    answerFr: matchedPlant.fr.care,
    answerEn: matchedPlant.en.care,
    sources: [{
      title: `${plantInfo.name} - Guide de soin`,
      url: '#local-database',
      snippet: plantInfo.care,
      relevanceScore: 0.9
    }],
    plantCare: {
      name: plantInfo.name,
      nameFr: matchedPlant.fr.name,
      nameEn: matchedPlant.en.name,
      wateringFrequency: plantInfo.frequency,
      careInstructions: plantInfo.care,
      careInstructionsFr: matchedPlant.fr.care,
      careInstructionsEn: matchedPlant.en.care,
      tips: plantInfo.tips,
      tipsFr: matchedPlant.fr.tips,
      tipsEn: matchedPlant.en.tips,
      commonProblems: plantInfo.problems,
      commonProblemsFr: matchedPlant.fr.problems,
      commonProblemsEn: matchedPlant.en.problems
    },
    timestamp: new Date().toISOString(),
    source: 'local-database',
    success: true,
    isFallback: true
  };
  
  res.json({
    message: msgs.searchSuccess,
    messageFr: tavilyMessages.fr.searchSuccess,
    messageEn: tavilyMessages.en.searchSuccess,
    data: localResults
  });
}

// Extraire les informations de soin des résultats Tavily
function extractPlantCareInfo(results, lang) {
  const combinedText = results.map(r => r.content).join(' ').toLowerCase();
  
  // Extraction basique d'informations de soin
  const wateringFrequency = extractWateringFrequency(combinedText);
  const lightRequirements = extractLightRequirements(combinedText, lang);
  const commonTips = extractTips(combinedText, lang);
  
  return {
    wateringFrequency: wateringFrequency,
    lightRequirements: lightRequirements,
    tips: commonTips,
    extractedFromSources: true
  };
}

// Fonctions d'extraction spécialisées
function extractWateringFrequency(text) {
  const patterns = [
    /water\s+every\s+(\d+[-\s]*\d*)\s*days?/i,
    /(\d+[-\s]*\d*)\s*days?\s+between\s+watering/i,
    /arroser\s+tous\s+les\s+(\d+[-\s]*\d*)\s*jours?/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `${match[1]} jours / days`;
  }
  
  return '7-10 jours / days';
}

function extractLightRequirements(text, lang) {
  const lightKeywords = {
    fr: {
      bright: 'lumière vive',
      indirect: 'lumière indirecte',
      low: 'faible luminosité',
      direct: 'lumière directe'
    },
    en: {
      bright: 'bright light',
      indirect: 'indirect light',
      low: 'low light',
      direct: 'direct light'
    }
  };
  
  if (text.includes('indirect')) return lightKeywords[lang].indirect;
  if (text.includes('bright')) return lightKeywords[lang].bright;
  if (text.includes('low light')) return lightKeywords[lang].low;
  
  return lightKeywords[lang].indirect; // par défaut
}

function extractTips(text, lang) {
  const tipKeywords = {
    fr: [
      'Maintenir l\'humidité élevée',
      'Éviter les courants d\'air',
      'Nettoyer les feuilles régulièrement',
      'Fertiliser au printemps'
    ],
    en: [
      'Maintain high humidity',
      'Avoid drafts',
      'Clean leaves regularly',
      'Fertilize in spring'
    ]
  };
  
  return tipKeywords[lang];
}

// Fonctions de traduction basiques (pour améliorer les réponses Tavily)
async function translateToFrench(text) {
  // Traduction basique pour le prototype
  return text.replace(/water/gi, 'arroser')
             .replace(/plant/gi, 'plante')
             .replace(/light/gi, 'lumière');
}

async function translateToEnglish(text) {
  // Traduction basique pour le prototype
  return text.replace(/arroser/gi, 'water')
             .replace(/plante/gi, 'plant')
             .replace(/lumière/gi, 'light');
}

// GET - Obtenir des conseils spécifiques par espèce
router.get('/species/:species', async (req, res) => {
  const { species } = req.params;
  const lang = req.query.lang || 'fr';
  const msgs = tavilyMessages[lang] || tavilyMessages.fr;
  
  try {
    // Rechercher des informations spécifiques sur l'espèce
    const searchQuery = lang === 'en' 
      ? `${species} houseplant care guide watering light humidity`
      : `${species} plante intérieur soin guide arrosage lumière humidité`;
    
    const searchResult = await axios.post('/api/tavily/search', {
      query: searchQuery,
      lang: lang
    });
    
    res.json(searchResult.data);
    
  } catch (error) {
    console.error('Species search error:', error);
    res.status(500).json({
      error: msgs.searchFailed,
      errorFr: tavilyMessages.fr.searchFailed,
      errorEn: tavilyMessages.en.searchFailed
    });
  }
});

module.exports = router;