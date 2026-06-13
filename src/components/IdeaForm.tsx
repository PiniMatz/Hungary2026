import React, { useState, useRef } from 'react';
import type { KidProfile } from '../types';
import DrawingCanvas from './DrawingCanvas';

interface IdeaFormProps {
  currentKid: KidProfile;
  onSubmitSuccess: () => void;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({ currentKid, onSubmitSuccess }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('💡 רעיון מדליק אחר');
  const [excitement, setExcitement] = useState(3); // default is "😎 מגניב"
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  
  // Media states: 'none' | 'upload' | 'draw'
  const [mediaType, setMediaType] = useState<'upload' | 'draw'>('upload');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    { name: '🏰 ארמונות והיסטוריה', icon: '🏰', label: 'ארמונות והיסטוריה' },
    { name: '🌳 טבע ומסלולים', icon: '🌳', label: 'טבע ומסלולים' },
    { name: '🍕 אוכל ומגדנות', icon: '🍕', label: 'אוכל ומגדנות' },
    { name: '💦 מרחצאות ובריכות', icon: '💦', label: 'מרחצאות ובריכות' },
    { name: '🎡 פארקים ושעשועים', icon: '🎡', label: 'פארקים ושעשועים' },
    { name: '💡 רעיון מדליק אחר', icon: '💡', label: 'רעיון מדליק' }
  ];

  const excitementLevels = [
    { value: 1, emoji: '🥱', label: 'סביר' },
    { value: 2, emoji: '🙂', label: 'נחמד' },
    { value: 3, emoji: '😎', label: 'מגניב!' },
    { value: 4, emoji: '😍', label: 'רוצה מאוד!' },
    { value: 5, emoji: '🤩', label: 'חייבים ללכת!!!' }
  ];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('אנא הכנס שם למקום או לרעיון שלך!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: any = {
        title,
        author: currentKid.name,
        category,
        excitement,
        link,
        description
      };

      if (mediaType === 'upload' && photoPreview) {
        payload.photo = photoPreview; // base64 string
      } else if (mediaType === 'draw' && drawingDataUrl) {
        payload.drawing = drawingDataUrl; // base64 string
      }

      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('שגיאה בשמירת הרעיון');
      }

      // Reset form on success
      setTitle('');
      setCategory('💡 רעיון מדליק אחר');
      setExcitement(3);
      setLink('');
      setDescription('');
      setPhoto(null);
      setPhotoPreview(null);
      setDrawingDataUrl(null);
      
      // Callback
      onSubmitSuccess();
    } catch (e) {
      console.error(e);
      setErrorMsg('אופס! משהו השתבש בשמירת הרעיון. נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2 className="form-section-title">🗺️ שלח רעיון חדש לטיול בהונגריה</h2>
      
      <form onSubmit={handleFormSubmit}>
        {errorMsg && (
          <div style={{ color: 'var(--accent-rose)', marginBottom: '1rem', fontWeight: 'bold' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 1. Category */}
        <div className="form-group">
          <label className="form-label">בחר קטגוריה:</label>
          <div className="category-grid">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className={`category-btn ${category === cat.name ? 'active' : ''}`}
                style={{
                  borderColor: category === cat.name ? currentKid.color : 'transparent',
                  background: category === cat.name ? `${currentKid.color}20` : '',
                  color: category === cat.name ? 'white' : ''
                }}
                onClick={() => setCategory(cat.name)}
              >
                <span className="category-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Title */}
        <div className="form-group">
          <label htmlFor="idea-title" className="form-label">שם המקום או הרעיון:</label>
          <input
            id="idea-title"
            type="text"
            className="input-text"
            placeholder="مثל: גן החיות של בודפשט, קניון הרפתקאות..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 3. Description */}
        <div className="form-group">
          <label htmlFor="idea-description" className="form-label">למה כדאי לנו ללכת לשם? מה יש לעשות שם?</label>
          <textarea
            id="idea-description"
            className="textarea-input"
            rows={3}
            placeholder="כתבו כאן את כל הפרטים המגניבים..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* 4. Link */}
        <div className="form-group">
          <label htmlFor="idea-link" className="form-label">קישור לאתר או למפת גוגל (לא חובה):</label>
          <input
            id="idea-link"
            type="url"
            className="input-text"
            placeholder="https://..."
            style={{ direction: 'ltr', textAlign: 'left' }}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        {/* 5. Excitement Slider */}
        <div className="form-group">
          <label className="form-label">כמה אני רוצה ללכת לכאן?</label>
          <div className="excitement-container">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              className="slider-input"
              value={excitement}
              onChange={(e) => setExcitement(parseInt(e.target.value))}
            />
            <div className="slider-labels">
              {excitementLevels.map((lvl) => (
                <div
                  key={lvl.value}
                  className={`slider-label ${excitement === lvl.value ? 'active' : ''}`}
                  onClick={() => setExcitement(lvl.value)}
                >
                  <span className="slider-emoji">{lvl.emoji}</span>
                  <span>{lvl.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Media Upload or Drawing Toggle */}
        <div className="form-group">
          <label className="form-label">הוסף תמונה או ציור:</label>
          <div className="media-toggle">
            <button
              type="button"
              className={`media-toggle-btn ${mediaType === 'upload' ? 'active' : ''}`}
              onClick={() => setMediaType('upload')}
            >
              📸 העלאת תמונה
            </button>
            <button
              type="button"
              className={`media-toggle-btn ${mediaType === 'draw' ? 'active' : ''}`}
              onClick={() => setMediaType('draw')}
            >
              🎨 צייר ציור
            </button>
          </div>

          {/* Media Content Area */}
          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {mediaType === 'upload' ? (
              <div style={{ textAlign: 'center' }}>
                {!photoPreview ? (
                  <div className="file-upload-zone" onClick={() => fileInputRef.current?.click()}>
                    <span className="upload-icon">📸</span>
                    <p style={{ fontWeight: 'bold' }}>לחצו כאן כדי לצלם או לבחור תמונה מהגלריה</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>תומך ב-JPG, PNG</p>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img src={photoPreview} alt="תצוגה מקדימה" className="image-preview" />
                    <button type="button" className="remove-img-btn" onClick={removePhoto}>×</button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
              </div>
            ) : (
              <DrawingCanvas onSaveDrawing={setDrawingDataUrl} />
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? 'var(--text-secondary)' : `linear-gradient(135deg, ${currentKid.color.split(' ')[1] || 'var(--accent-orange)'}, ${currentKid.color.split(' ')[2] || 'var(--accent-gold)'})`,
              fontSize: '1.2rem',
              padding: '1rem 2.5rem'
            }}
          >
            {isSubmitting ? 'שולח רעיון... 🚀' : 'שתף עם כולם! 🎉'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default IdeaForm;
