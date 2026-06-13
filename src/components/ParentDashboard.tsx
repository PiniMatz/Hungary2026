import React, { useState, useEffect } from 'react';
import type { ParentSettings } from '../types';

interface ParentDashboardProps {
  onSettingsSaved: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onSettingsSaved }) => {
  const [localSyncPath, setLocalSyncPath] = useState('');
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState('');
  const [syncMode, setSyncMode] = useState<'local' | 'cloud' | 'both'>('local');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [dbBackup, setDbBackup] = useState<string>('');

  useEffect(() => {
    // Fetch current settings
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: ParentSettings) => {
        setLocalSyncPath(data.localSyncPath);
        setGoogleAppsScriptUrl(data.googleAppsScriptUrl);
        setSyncMode(data.syncMode);
      })
      .catch(err => console.error('שגיאה בטעינת הגדרות:', err));

    // Fetch raw database backup
    fetch('/api/ideas')
      .then(res => res.json())
      .then(data => {
        setDbBackup(JSON.stringify(data, null, 2));
      })
      .catch(err => console.error('שגיאה בטעינת גיבוי:', err));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localSyncPath, googleAppsScriptUrl, syncMode })
      });

      if (!response.ok) {
        throw new Error('שגיאה בשמירת ההגדרות');
      }

      setMessage({ text: 'ההגדרות נשמרו בהצלחה! 🎉', type: 'success' });
      onSettingsSaved();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'שגיאה בשמירת ההגדרות. אנא ודא שהנתיב תקין.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const appsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    
    // הוספת כותרת לרעיון
    var heading = body.appendParagraph(data.category + ": " + data.title);
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    
    // פרטי ההצעה
    body.appendParagraph("הוצע על ידי: " + data.author + " בתאריך " + new Date(data.date).toLocaleDateString('he-IL'));
    body.appendParagraph("רמת התלהבות: " + "⭐".repeat(data.excitement) + " (" + data.excitement + "/5)");
    
    if (data.link) {
      var linkPara = body.appendParagraph("קישור: ");
      linkPara.appendText(data.link).setLinkUrl(data.link);
    }
    
    body.appendParagraph("למה כדאי לנו ללכת:\n" + data.description);
    body.appendParagraph("\\n-----------------------------------------\\n");
    
    // שמירה וסנכרון
    doc.saveAndClose();
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="parent-dashboard-grid">
      
      {/* 1. Settings Form */}
      <div className="glass-panel dashboard-card">
        <h3>⚙️ הגדרות סנכרון (Parent Settings)</h3>
        
        <form onSubmit={handleSaveSettings}>
          {message.text && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: message.type === 'success' ? '#a7f3d0' : '#fda4af',
                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                fontWeight: 'bold'
              }}
            >
              {message.text}
            </div>
          )}

          {/* Sync Mode */}
          <div className="form-group">
            <label className="form-label">אופן סנכרון המידע:</label>
            <select
              className="select-input"
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as any)}
            >
              <option value="local">תיקיית קבצי Markdown מקומית (מומלץ עבור Google Drive Desktop)</option>
              <option value="cloud">סנכרון ישיר לענן (באמצעות Google Apps Script)</option>
              <option value="both">גם מקומי וגם לענן</option>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              * במצב מקומי, התוכנה שומרת קבצי Markdown (וטקסט) בתיקייה במחשב שלך. אם התיקייה נמצאת בתוך תיקיית ה-Google Drive שלך במחשב, היא תסונכרן אוטומטית לענן.
            </p>
          </div>

          {/* Local Sync Path */}
          {(syncMode === 'local' || syncMode === 'both') && (
            <div className="form-group">
              <label htmlFor="sync-path" className="form-label">נתיב שמירה מקומי (במחשב ההורה):</label>
              <input
                id="sync-path"
                type="text"
                className="input-text"
                style={{ direction: 'ltr', textAlign: 'left' }}
                value={localSyncPath}
                onChange={(e) => setLocalSyncPath(e.target.value)}
                placeholder="C:\\Users\\...\\Google Drive\\HungaryTrip"
                required
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                הנתיב המלא לתיקייה שאליה ייכתבו קבצי ה-Markdown. מומלץ לבחור תיקייה שמסונכרנת עם Google Drive Desktop.
              </p>
            </div>
          )}

          {/* Google Apps Script URL */}
          {(syncMode === 'cloud' || syncMode === 'both') && (
            <div className="form-group">
              <label htmlFor="script-url" className="form-label">כתובת ה-Web App של Google Apps Script:</label>
              <input
                id="script-url"
                type="url"
                className="input-text"
                style={{ direction: 'ltr', textAlign: 'left' }}
                value={googleAppsScriptUrl}
                onChange={(e) => setGoogleAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                required
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                הדבק כאן את כתובת ה-URL שקיבלת לאחר פריסת הסקריפט (Deploy) במסמך ה-Google Doc שלך.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
          >
            {isSaving ? 'שומר הגדרות...' : '💾 שמור הגדרות'}
          </button>
        </form>

        {/* Database JSON backup */}
        <div style={{ marginTop: '2rem' }}>
          <label className="form-label">גיבוי רעיונות בפורמט JSON (להעתקה ידנית):</label>
          <textarea
            className="textarea-input"
            rows={5}
            readOnly
            value={dbBackup}
            style={{ direction: 'ltr', textAlign: 'left', fontSize: '0.85rem', fontFamily: 'monospace' }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            לחץ על התיבה כדי לסמן את כל קוד ה-JSON ולהעתיק אותו כגיבוי במידת הצורך.
          </p>
        </div>
      </div>

      {/* 2. Apps Script Guide */}
      <div className="glass-panel dashboard-card">
        <h3>☁️ מדריך סנכרון ישיר ל-Google Docs</h3>
        <div className="apps-script-guide">
          <p>בשיטה זו, כל רעיון שהילדים ישלחו יתווסף אוטומטית כמקטע חדש בתוך <strong>מסמך Google Doc</strong> משותף שלכם, ממנו NotebookLM יכול לשאוב את המידע.</p>
          
          <ol style={{ paddingRight: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>פתח את מסמך ה-Google Doc המבוקש ב-Google Drive שלך.</li>
            <li>בתפריט העליון של המסמך, לחץ על <strong>Extensions</strong> (תוספים) &gt; <strong>Apps Script</strong>.</li>
            <li>מחק את הקוד הקיים שם, והדבק במקומו את קוד הסקריפט הבא:</li>
          </ol>

          <pre className="apps-script-code">{appsScriptCode}</pre>

          <ol start={4} style={{ paddingRight: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>לחץ על סמל השמירה (דיסקט) למעלה, ולאחר מכן לחץ על <strong>Deploy</strong> (פריסה) &gt; <strong>New deployment</strong>.</li>
            <li>לחץ על גלגל השיניים של סוג הפריסה ובחר ב-<strong>Web app</strong>.</li>
            <li>הגדר את ההגדרות הבאות:
              <ul style={{ paddingRight: '1.5rem', marginTop: '0.25rem' }}>
                <li><strong>Execute as:</strong> Me (כתובת המייל שלך)</li>
                <li><strong>Who has access:</strong> Anyone (כולם, גם ללא חשבון גוגל)</li>
              </ul>
            </li>
            <li>לחץ על <strong>Deploy</strong>. תתבקש לאשר גישה למסמך - אשר אותה (ייתכן ותצטרך ללחוץ על Advanced ואז Go to.../Unsafe).</li>
            <li>העתק את ה-<strong>Web app URL</strong> שנוצר, והדבק אותו בתיבת ההגדרות משמאל.</li>
          </ol>
        </div>
      </div>

    </div>
  );
};
export default ParentDashboard;
