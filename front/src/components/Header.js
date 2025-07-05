import React from 'react';

const Header = ({ 
  language, 
  onLanguageToggle, 
  notifications, 
  currentView, 
  onViewChange, 
  texts 
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Logo et titre */}
        <div className="app-logo">
          <span className="logo-icon">🌱</span>
          <div>
            <div className="logo-text">{texts.appTitle}</div>
            <div className="tagline">{texts.tagline}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          {/* Bouton notifications */}
          <button
            className={`nav-button ${currentView === 'notifications' ? 'active' : ''}`}
            onClick={() => onViewChange('notifications')}
            title={texts.notifications}
          >
            <span style={{ position: 'relative' }}>
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
          </button>

          {/* Bouton paramètres */}
          <button
            className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
            title={texts.settings}
          >
            ⚙️
          </button>

          {/* Toggle langue */}
          <button
            className="language-toggle"
            onClick={onLanguageToggle}
            title={texts.language}
          >
            {language === 'fr' ? '🇫🇷 FR' : '🇨🇦 EN'}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;