import React, { useState } from 'react';
import type { Idea, KidProfile } from '../types';

interface IdeaFeedProps {
  ideas: Idea[];
  profiles: KidProfile[];
  currentKid: KidProfile | null;
  onReactionToggle: (ideaId: string, emoji: string) => void;
}

export const IdeaFeed: React.FC<IdeaFeedProps> = ({ ideas, profiles, currentKid, onReactionToggle }) => {
  const [selectedKidFilter, setSelectedKidFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const categories = [
    { name: 'all', label: 'הכל' },
    { name: '🏰 ארמונות והיסטוריה', label: '🏰 היסטוריה' },
    { name: '🌳 טבע ומסלולים', label: '🌳 טבע' },
    { name: '🍕 אוכל ומגדנות', label: '🍕 אוכל' },
    { name: '💦 מרחצאות ובריכות', label: '💦 בריכות' },
    { name: '🎡 פארקים ושעשועים', label: '🎡 פארקים' },
    { name: '💡 רעיון מדליק אחר', label: '💡 רעיונות' }
  ];

  // Reactable emojis
  const availableEmojis = ['👍', '❤️', '🔥', '🎉', '🤩'];

  // Helper: Find kid profile by name to get color/avatar
  const getKidProfile = (name: string) => {
    return profiles.find(p => p.name === name);
  };

  // Filtering logic
  const filteredIdeas = ideas.filter(idea => {
    const kidMatch = selectedKidFilter === 'all' || idea.author === selectedKidFilter;
    const catMatch = selectedCategoryFilter === 'all' || idea.category === selectedCategoryFilter;
    return kidMatch && catMatch;
  });

  const getExcitementText = (rating: number) => {
    switch(rating) {
      case 1: return '🥱 סביר';
      case 2: return '🙂 נחמד';
      case 3: return '😎 מגניב!';
      case 4: return '😍 רוצה מאוד!';
      case 5: return '🤩 חייבים ללכת!!!';
      default: return '😎 מגניב';
    }
  };

  const getCategoryColor = (catName: string) => {
    if (catName.includes('🏰')) return 'rgba(139, 92, 246, 0.15)'; // violet
    if (catName.includes('🌳')) return 'rgba(16, 185, 129, 0.15)'; // emerald
    if (catName.includes('🍕')) return 'rgba(249, 115, 22, 0.15)'; // orange
    if (catName.includes('💦')) return 'rgba(6, 182, 212, 0.15)'; // cyan
    if (catName.includes('🎡')) return 'rgba(245, 158, 11, 0.15)'; // gold
    return 'rgba(148, 163, 184, 0.15)'; // slate
  };

  const getCategoryTextColor = (catName: string) => {
    if (catName.includes('🏰')) return '#c084fc';
    if (catName.includes('🌳')) return '#34d399';
    if (catName.includes('🍕')) return '#fb923c';
    if (catName.includes('💦')) return '#22d3ee';
    if (catName.includes('🎡')) return '#fbbf24';
    return '#cbd5e1';
  };

  return (
    <div>
      {/* Filters bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Kids filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', minWidth: '100px' }}>סינון לפי ילד:</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${selectedKidFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setSelectedKidFilter('all')}
              >
                הכל
              </button>
              {profiles.map(p => (
                <button
                  key={p.id}
                  className={`btn ${selectedKidFilter === p.name ? '' : 'btn-secondary'}`}
                  style={{
                    padding: '0.4rem 1rem',
                    fontSize: '0.9rem',
                    background: selectedKidFilter === p.name ? `${p.color}30` : '',
                    borderColor: selectedKidFilter === p.name ? p.color : '',
                    color: selectedKidFilter === p.name ? 'white' : ''
                  }}
                  onClick={() => setSelectedKidFilter(p.name)}
                >
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', minWidth: '100px' }}>סינון קטגוריה:</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  className={`btn ${selectedCategoryFilter === cat.name ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => setSelectedCategoryFilter(cat.name)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Ideas list */}
      {filteredIdeas.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🗺️</span>
          <h3>עדיין אין רעיונות בקטגוריה זו.</h3>
          <p style={{ marginTop: '0.5rem' }}>היו הראשונים להוסיף רעיון מגניב לטיול!</p>
        </div>
      ) : (
        <div className="feed-grid">
          {filteredIdeas.map((idea) => {
            const authorProfile = getKidProfile(idea.author);
            const cardColor = authorProfile ? authorProfile.color : '#e2e8f0';

            return (
              <div
                key={idea.id}
                className="glass-panel idea-card"
                style={{
                  borderTop: `4px solid ${cardColor}`,
                  padding: '1.5rem 1.5rem 1.25rem 1.5rem'
                }}
              >
                {/* Author info */}
                <div className="idea-card-header">
                  <div className="idea-author">
                    <div
                      className="idea-author-avatar"
                      style={{ border: `2px solid ${cardColor}` }}
                    >
                      {authorProfile?.avatar || '👤'}
                    </div>
                    <div>
                      <div className="idea-author-name" style={{ color: cardColor }}>
                        {idea.author}
                      </div>
                      <div className="idea-date">
                        {new Date(idea.date).toLocaleDateString('he-IL', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category tag */}
                <div>
                  <span
                    className="idea-tag"
                    style={{
                      backgroundColor: getCategoryColor(idea.category),
                      color: getCategoryTextColor(idea.category)
                    }}
                  >
                    {idea.category}
                  </span>
                </div>

                {/* Image */}
                {idea.imagePath && (
                  <div className="idea-image-wrapper">
                    <img
                      src={`/${idea.imagePath}`}
                      alt={idea.title}
                      className="idea-card-image"
                      onError={(e) => {
                        // fallback if loaded directly or server path differs
                        (e.target as HTMLImageElement).src = idea.imagePath || '';
                      }}
                    />
                  </div>
                )}

                {/* Title */}
                <h3 className="idea-title">{idea.title}</h3>

                {/* Description */}
                <p className="idea-description">{idea.description}</p>

                {/* Footer buttons / link */}
                <div className="idea-footer">
                  <span className="idea-excitement-badge">
                    <span>{getExcitementText(idea.excitement)}</span>
                  </span>
                  
                  {idea.link && (
                    <a
                      href={idea.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-btn"
                    >
                      🔗 מידע / מפה
                    </a>
                  )}
                </div>

                {/* Reactions */}
                <div
                  style={{
                    borderTop: '1px dashed var(--border-color)',
                    marginTop: '1rem',
                    paddingTop: '0.75rem'
                  }}
                >
                  <div className="reactions-bar">
                    {availableEmojis.map(emoji => {
                      const voters = idea.reactions[emoji] || [];
                      const hasVoted = currentKid ? voters.includes(currentKid.name) : false;
                      const count = voters.length;

                      return (
                        <button
                          key={emoji}
                          type="button"
                          className={`reaction-btn ${hasVoted ? 'active' : ''}`}
                          onClick={() => currentKid && onReactionToggle(idea.id, emoji)}
                          disabled={!currentKid}
                          title={count > 0 ? `הצביעו: ${voters.join(', ')}` : 'הוסף תגובה'}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="reaction-count">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {/* Voters tooltips */}
                  {Object.keys(idea.reactions).length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {Object.entries(idea.reactions).map(([emoji, voters]) => (
                        <span key={emoji} style={{ marginLeft: '0.75rem' }}>
                          <strong>{emoji}</strong> {voters.join(', ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default IdeaFeed;
