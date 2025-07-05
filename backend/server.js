const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Messages bilingues pour le serveur
const serverMessages = {
  fr: {
    apiRunning: 'EcoPilot API fonctionne parfaitement!',
    serverStarted: 'Serveur EcoPilot démarré sur le port',
    healthCheck: 'Vérification de santé',
    routeNotFound: 'Route non trouvée',
    somethingWentWrong: 'Une erreur s\'est produite',
    rateLimitExceeded: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  en: {
    apiRunning: 'EcoPilot API is running perfectly!',
    serverStarted: 'EcoPilot server started on port',
    healthCheck: 'Health check',
    routeNotFound: 'Route not found',
    somethingWentWrong: 'Something went wrong',
    rateLimitExceeded: 'Too many requests, please try again later'
  }
};

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting avec messages bilingues
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: (req) => {
    const lang = req.query.lang || req.headers['accept-language']?.includes('en') ? 'en' : 'fr';
    return {
      error: serverMessages[lang].rateLimitExceeded,
      errorFr: serverMessages.fr.rateLimitExceeded,
      errorEn: serverMessages.en.rateLimitExceeded,
      retryAfter: '15 minutes'
    };
  }
});
app.use('/api/', limiter);

// Parser JSON
app.use(express.json());

// Middleware pour détecter la langue préférée
app.use((req, res, next) => {
  // Priorité: query param > header > défaut français
  req.preferredLanguage = req.query.lang || 
    (req.headers['accept-language']?.includes('en') ? 'en' : 'fr');
  next();
});

// Routes de base avec support bilingue
app.get('/api/health', (req, res) => {
  const lang = req.preferredLanguage;
  const msgs = serverMessages[lang] || serverMessages.fr;
  
  res.json({ 
    status: 'OK',
    message: msgs.apiRunning,
    messageFr: serverMessages.fr.apiRunning,
    messageEn: serverMessages.en.apiRunning,
    timestamp: new Date().toISOString(),
    language: lang,
    version: '1.0.0',
    features: {
      bilingual: true,
      apis: ['plants', 'weather', 'tavily'],
      supportedLanguages: ['fr', 'en']
    }
  });
});

// Route pour changer de langue
app.post('/api/language', (req, res) => {
  const { language } = req.body;
  if (!['fr', 'en'].includes(language)) {
    return res.status(400).json({
      error: 'Langue non supportée / Unsupported language',
      supportedLanguages: ['fr', 'en']
    });
  }
  
  const msgs = serverMessages[language];
  res.json({
    message: `Langue changée en ${language === 'fr' ? 'français' : 'anglais'}`,
    messageEn: `Language changed to ${language === 'fr' ? 'French' : 'English'}`,
    currentLanguage: language
  });
});

// Route d'informations sur l'app (utile pour le pitch)
app.get('/api/app-info', (req, res) => {
  const lang = req.preferredLanguage;
  
  const appInfo = {
    name: 'EcoPilot',
    tagline: {
      fr: 'Réalisez votre main verte',
      en: 'Discover your green thumb'
    },
    description: {
      fr: 'Assistant intelligent pour le soin des plantes avec géolocalisation prédictive',
      en: 'Smart plant care assistant with predictive geolocation'
    },
    features: {
      fr: [
        'Géolocalisation prédictive',
        'Données météo en temps réel',
        'Conseils personnalisés via IA',
        'Interface bilingue',
        'Notifications intelligentes'
      ],
      en: [
        'Predictive geolocation',
        'Real-time weather data',
        'AI-powered personalized tips',
        'Bilingual interface',
        'Smart notifications'
      ]
    },
    stats: {
      fr: {
        fact1: 'Plus de 2 Canadiens sur 3 possèdent au moins une plante',
        fact2: '70% des millennials se considèrent comme "plant parents"',
        fact3: 'Près de 50% des plantes meurent prématurément'
      },
      en: {
        fact1: 'Over 2 out of 3 Canadians own at least one houseplant',
        fact2: '70% of millennials identify as "plant parents"',
        fact3: 'Nearly 50% of plants die prematurely'
      }
    },
    currentLanguage: lang,
    version: '1.0.0'
  };
  
  res.json(appInfo);
});

// Routes API
app.use('/api/plants', require('./routes/plants'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/tavily', require('./routes/tavily'));

// Gestion des erreurs avec messages bilingues
app.use((err, req, res, next) => {
  console.error(err.stack);
  const lang = req.preferredLanguage || 'fr';
  const msgs = serverMessages[lang] || serverMessages.fr;
  
  res.status(500).json({ 
    error: msgs.somethingWentWrong,
    errorFr: serverMessages.fr.somethingWentWrong,
    errorEn: serverMessages.en.somethingWentWrong,
    timestamp: new Date().toISOString()
  });
});

// Route 404 avec messages bilingues
app.use('*', (req, res) => {
  const lang = req.preferredLanguage || 'fr';
  const msgs = serverMessages[lang] || serverMessages.fr;
  
  res.status(404).json({ 
    error: msgs.routeNotFound,
    errorFr: serverMessages.fr.routeNotFound,
    errorEn: serverMessages.en.routeNotFound,
    requestedPath: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🌱 ${serverMessages.fr.serverStarted} ${PORT}`);
  console.log(`🌿 ${serverMessages.en.serverStarted} ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Langues supportées: Français, English`);
  console.log(`🚀 EcoPilot prêt pour le hackathon AI Tinkerers!`);
});