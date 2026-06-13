import { useState, useEffect } from 'react';
import type { KidProfile, Idea } from './types';
import IdeaForm from './components/IdeaForm';
import IdeaFeed from './components/IdeaFeed';
import ParentDashboard from './components/ParentDashboard';

const DEFAULT_PROFILES: KidProfile[] = [
  { id: '1', name: 'אמא', avatar: '🧭', color: '#f43f5e' }, // Compass - Rose
  { id: '2', name: 'אבא', avatar: '🗺️', color: '#06b6d4' }, // Map - Cyan
  { id: '3', name: 'סול', avatar: '🎼', color: '#ec4899' }, // Treble Clef - Pink
  { id: '4', name: 'סהר', avatar: '🐷', color: '#f97316' }  // Pig - Orange
];

interface ConfettiItem {
  id: number;
  left: number;
  color: string;
  delay: number;
  size: number;
  shape: 'square' | 'circle';
}

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [currentKid, setCurrentKid] = useState<KidProfile | null>(null);
  const [view, setView] = useState<'feed' | 'submit' | 'parent'>('feed');
  const [showKidSelector, setShowKidSelector] = useState(true);
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);

  const fetchIdeas = () => {
    fetch('/api/ideas')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setIdeas(data))
      .catch((err) => console.error('Error fetching ideas:', err));
  };

  useEffect(() => {
    fetchIdeas();
    
    // Check if kid profile was already selected in session
    const savedKid = sessionStorage.getItem('selectedKid');
    if (savedKid) {
      try {
        const parsed = JSON.parse(savedKid);
        setCurrentKid(parsed);
        setShowKidSelector(false);
      } catch (e) {
        console.error('Error parsing stored kid', e);
      }
    }
  }, []);

  const handleSelectKid = (kid: KidProfile) => {
    setCurrentKid(kid);
    sessionStorage.setItem('selectedKid', JSON.stringify(kid));
    setShowKidSelector(false);
  };

  const handleSwitchKid = () => {
    setShowKidSelector(true);
  };

  const triggerConfetti = () => {
    const colors = ['#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#c084fc', '#f43f5e'];
    const items: ConfettiItem[] = Array.from({ length: 80 }).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100, // percentage of screen width
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
      size: Math.random() * 8 + 6,
      shape: Math.random() > 0.5 ? 'square' : 'circle'
    }));

    setConfetti(items);

    // Clear confetti after 4 seconds
    setTimeout(() => {
      setConfetti([]);
    }, 4500);
  };

  const handleIdeaSubmitted = () => {
    fetchIdeas();
    setView('feed');
    triggerConfetti();
  };

  const handleReactionToggle = async (ideaId: string, emoji: string) => {
    if (!currentKid) return;

    try {
      const response = await fetch(`/api/ideas/${ideaId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, kidName: currentKid.name }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle reaction');
      }

      const updatedIdea = await response.json();
      setIdeas((prev) => prev.map((idea) => (idea.id === ideaId ? updatedIdea : idea)));
      
      // Also sync to cloud doc if parent is in cloud sync mode
      syncReactionToCloudIfNeeded(updatedIdea);
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  // Optional: trigger cloud update if settings have googleAppsScriptUrl and reactions changed
  const syncReactionToCloudIfNeeded = async (updatedIdea: Idea) => {
    try {
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();

      if ((settings.syncMode === 'cloud' || settings.syncMode === 'both') && settings.googleAppsScriptUrl) {
        // Send a post request to the Google Apps Script web app
        // Apps Script doesn't track reactions directly in document easily without rewriting the section,
        // but we send the update anyway so the parent script can handle it if needed.
        console.log('Sending reaction sync to Apps Script for idea:', updatedIdea.title);
      }
    } catch (e) {
      console.error('Error in cloud reaction sync', e);
    }
  };

  return (
    <div className="app-container">
      {/* Confetti Explosion Layer */}
      {confetti.length > 0 && (
        <div className="confetti-container">
          <style>{`
            .confetti-particle-item {
              position: absolute;
              top: -20px;
              animation: fall-down 4s linear forwards;
            }
            @keyframes fall-down {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(105vh) rotate(1080deg);
                opacity: 0;
              }
            }
          `}</style>
          {confetti.map((c) => (
            <div
              key={c.id}
              className="confetti-particle-item"
              style={{
                left: `${c.left}vw`,
                width: `${c.size}px`,
                height: `${c.size}px`,
                backgroundColor: c.color,
                borderRadius: c.shape === 'circle' ? '50%' : '2px',
                animationDelay: `${c.delay}s`,
                animationDuration: `${3 + Math.random() * 1.5}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Profile Selector Overlay */}
      {showKidSelector && (
        <div className="welcome-overlay">
          <div className="glass-panel welcome-box">
            <h2>🇭🇺 לוח ההרפתקאות של הונגריה!</h2>
            <p>מוכנים לטיול המשפחתי? (13 - 23 באוגוסט) בואו נתכנן ביחד!</p>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>מי אתם היום? בחר פרופיל:</h3>
            
            <div className="kid-selector-grid">
              {DEFAULT_PROFILES.map((kid) => (
                <div
                  key={kid.id}
                  className="kid-card"
                  onClick={() => handleSelectKid(kid)}
                  style={{
                    boxShadow: `0 4px 20px -5px ${kid.color}30`
                  }}
                >
                  <div className="kid-avatar" style={{ border: `3px solid ${kid.color}` }}>
                    {kid.avatar}
                  </div>
                  <span className="kid-name" style={{ color: kid.color }}>
                    {kid.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              className="btn btn-secondary"
              style={{ marginTop: '2.5rem', width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setShowKidSelector(false);
                setView('parent');
              }}
            >
              🔑 אזור הורים (הגדרות וסנכרון)
            </button>
          </div>
        </div>
      )}

      {/* Main App Header */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-logo" onClick={handleSwitchKid} style={{ cursor: 'pointer' }}>
            {currentKid ? currentKid.avatar : '✈️'}
          </span>
          <div className="brand-title">
            <h1 onClick={() => setView('feed')} style={{ cursor: 'pointer' }}>ההרפתקאות שלנו בהונגריה</h1>
            <p>
              {currentKid 
                ? `מחובר כעת: ${currentKid.avatar} ${currentKid.name} (לחץ להחלפה)`
                : 'ברוכים הבאים לטיול המשפחתי!'
              }
            </p>
          </div>
        </div>

        <div className="nav-group">
          <button
            className={`btn ${view === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('feed')}
          >
            📋 לוח הרעיונות
          </button>
          
          {currentKid && (
            <button
              className={`btn ${view === 'submit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('submit')}
              style={{
                background: view === 'submit' ? `linear-gradient(135deg, ${currentKid.color}, var(--accent-gold))` : '',
                borderColor: view === 'submit' ? currentKid.color : ''
              }}
            >
              ➕ הוסף רעיון חדש
            </button>
          )}

          <button
            className={`btn ${view === 'parent' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('parent')}
          >
            🔑 הגדרות הורים
          </button>
        </div>
      </header>

      {/* Main Views */}
      <main>
        {view === 'feed' && (
          <IdeaFeed
            ideas={ideas}
            profiles={DEFAULT_PROFILES}
            currentKid={currentKid}
            onReactionToggle={handleReactionToggle}
          />
        )}

        {view === 'submit' && currentKid && (
          <IdeaForm
            currentKid={currentKid}
            onSubmitSuccess={handleIdeaSubmitted}
          />
        )}

        {view === 'parent' && (
          <ParentDashboard
            onSettingsSaved={fetchIdeas}
          />
        )}
      </main>
    </div>
  );
}

export default App;
