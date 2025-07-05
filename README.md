markdown# 🌱 EcoPilot - Smart Plant Care Assistant

## English | [Français](#français)

**"Discover your green thumb with predictive AI"**

> Built for AI Tinkerers Ottawa Hackathon - July 2025

## 🏆 Target Awards

- **Best Use of Tavily API** ($2,000 CAD) - Intelligent plant information search with fallback system
- **Best Ambient / Async Agent** ($1,000 USD) - Predictive geolocation notifications & background monitoring
- **Most Canadian Agent** ($500 CAD) - Perfect bilingual FR/EN interface with Canadian weather data
- **External Knowledge** ($100 CAD) - Tavily + weather + local knowledge base integration

## 🚀 Key Features

### 📍 **Predictive Geolocation**
- Smart notifications when you're near home
- Automated help requests when you're away
- Contact suggestions for plant care assistance

### 🌤️ **Weather-Aware Intelligence**
- Watering recommendations based on real-time weather
- Humidity and temperature adjustments
- OpenWeatherMap integration with plant care advice

### 🔍 **Tavily AI Integration**
- Automatic plant species research
- Personalized care recommendations
- Problem diagnosis and solutions
- Intelligent fallback with local knowledge base

### 🇨🇦🇫🇷 **Truly Bilingual**
- Seamless French/English switching
- Bilingual error messages and notifications
- Canadian climate-specific recommendations

## 📊 The Problem We Solve

> **Over 2 out of 3 Canadians own at least one houseplant**
> **70% of millennials identify as "plant parents"**
> **Nearly 50% of plants die prematurely**

EcoPilot transforms plant care using AI and predictive geolocation.

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, PWA, Geolocation API
- **Backend**: Node.js, Express, Helmet (security)
- **APIs**: Tavily Search, OpenWeatherMap, Browser Notifications
- **Deployment**: Vercel (frontend), local development
- **Architecture**: RESTful API, bilingual support, offline fallback

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Vanessa-Alvine/ecopilot-hackathon.git
cd ecopilot-hackathon

# Backend setup
cd backend
npm install
npm run dev    # Runs on port 3001

# Frontend setup (new terminal)
cd ../frontend  
npm install
npm start      # Runs on port 3000
🌐 Live Demo

App: http://localhost:3000
API Health: http://localhost:3001/api/health
Features: Bilingual interface, geolocation, weather integration

🎯 API Endpoints
GET  /api/health                    # API status
GET  /api/plants?lang=fr           # Get plants (bilingual)
POST /api/plants                   # Add new plant
PUT  /api/plants/:id/water         # Water plant
GET  /api/weather/current          # Weather data
POST /api/tavily/search            # Plant information search
🔑 Environment Setup
bash# Backend .env file
TAVILY_API_KEY=your-tavily-key
OPENWEATHER_API_KEY=your-weather-key
PORT=3001
NODE_ENV=development
💡 Innovation Highlights

Ambient Intelligence: Background geolocation monitoring without being intrusive
Bilingual AI: All responses and errors in both official Canadian languages
Smart Fallback: Works offline with local plant knowledge base
Weather Integration: Real-time care adjustments based on local conditions
Canadian Context: Built specifically for Canadian users and climate

👨‍💻 Built by
Vanessa-Alvine - Full-stack developer passionate about AI and sustainability

Français
"Réalisez votre main verte avec l'IA prédictive"

Développé pour le hackathon AI Tinkerers Ottawa - Juillet 2025

🏆 Prix Ciblés

Meilleure Utilisation de l'API Tavily (2 000$ CAD) - Recherche intelligente d'informations sur les plantes
Meilleur Agent Ambient/Async (1 000$ USD) - Notifications géolocalisées prédictives
Agent le Plus Canadien (500$ CAD) - Interface parfaitement bilingue FR/EN
Meilleure Connaissance Externe (100$ CAD) - Intégration Tavily + météo + base locale

🚀 Fonctionnalités Clés
📍 Géolocalisation Prédictive

Notifications intelligentes quand vous êtes près de chez vous
Demandes d'aide automatisées quand vous êtes absent
Suggestions de contacts pour l'entretien des plantes

🌤️ Intelligence Météorologique

Recommandations d'arrosage basées sur la météo en temps réel
Ajustements selon l'humidité et la température
Intégration OpenWeatherMap avec conseils pour plantes

🔍 Intégration IA Tavily

Recherche automatique d'informations sur les espèces
Recommandations de soin personnalisées
Diagnostic de problèmes et solutions
Système de secours avec base de connaissances locale

🇫🇷🇨🇦 Véritablement Bilingue

Basculement transparent français/anglais
Messages d'erreur et notifications bilingues
Recommandations spécifiques au climat canadien

📊 Le Problème Résolu

Plus de 2 Canadiens sur 3 possèdent au moins une plante d'intérieur
70% des millennials se considèrent comme "parents de plantes"
Près de 50% des plantes meurent prématurément

EcoPilot transforme le soin des plantes avec l'IA et la géolocalisation prédictive.
🛠️ Stack Technique

Frontend : React 18, Tailwind CSS, PWA, API Géolocalisation
Backend : Node.js, Express, Helmet (sécurité)
APIs : Recherche Tavily, OpenWeatherMap, Notifications Navigateur
Déploiement : Vercel (frontend), développement local
Architecture : API RESTful, support bilingue, secours hors ligne

🚀 Démarrage Rapide
bash# Cloner le dépôt
git clone https://github.com/Vanessa-Alvine/ecopilot-hackathon.git
cd ecopilot-hackathon

# Configuration backend
cd backend
npm install
npm run dev    # Fonctionne sur le port 3001

# Configuration frontend (nouveau terminal)
cd ../frontend  
npm install
npm start      # Fonctionne sur le port 3000
🌐 Démo En Direct

App : http://localhost:3000
Santé API : http://localhost:3001/api/health
Fonctionnalités : Interface bilingue, géolocalisation, intégration météo

💡 Points d'Innovation

Intelligence Ambiante : Surveillance géolocalisée en arrière-plan sans intrusion
IA Bilingue : Toutes les réponses dans les deux langues officielles du Canada
Secours Intelligent : Fonctionne hors ligne avec base de connaissances locale
Intégration Météo : Ajustements de soin en temps réel selon conditions locales
Contexte Canadien : Conçu spécifiquement pour les utilisateurs et le climat canadiens

👨‍💻 Développé par
Vanessa-Alvine - Développeuse full-stack passionnée par l'IA et la durabilité

🌱 Transformons la façon dont nous prenons soin de nos plantes avec l'IA !
🌱 Transforming plant care with AI intelligence!


GitHub : @Vanessa-Alvine
Hackathon : AI Tinkerers Ottawa Summer Vibe Hackathon 2025

🏆 Ready to win multiple prizes with Canadian innovation! 🇨🇦