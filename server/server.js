import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ensure upload directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Paths to database files
const DB_FILE = path.join(__dirname, '../db.json');
const SETTINGS_FILE = path.join(__dirname, '../settings.json');

// Helper to load settings
function getSettings() {
  const defaultSyncPath = path.resolve(path.join(__dirname, '../shared_folder'));
  const defaultSettings = {
    localSyncPath: defaultSyncPath,
    googleAppsScriptUrl: '',
    syncMode: 'local'
  };

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
    return defaultSettings;
  }

  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure absolute path
    if (parsed.localSyncPath && !path.isAbsolute(parsed.localSyncPath)) {
      parsed.localSyncPath = path.resolve(parsed.localSyncPath);
    }
    return parsed;
  } catch (e) {
    console.error('Error reading settings, returning defaults', e);
    return defaultSettings;
  }
}

// Helper to save settings
function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  // Ensure the local sync path and its assets subdirectory exist
  if (settings.localSyncPath) {
    const assetsDir = path.join(settings.localSyncPath, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
  }
}

// Helper to load ideas
function getIdeas() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading DB, returning empty array', e);
    return [];
  }
}

// Helper to save ideas
function saveIdeas(ideas) {
  fs.writeFileSync(DB_FILE, JSON.stringify(ideas, null, 2), 'utf-8');
}

// Initialize settings directories on startup
const currentSettings = getSettings();
saveSettings(currentSettings);

// Configure Multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// API Endpoints

// 1. Get settings
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

// 2. Update settings
app.post('/api/settings', (req, res) => {
  const { localSyncPath, googleAppsScriptUrl, syncMode } = req.body;
  if (!localSyncPath) {
    return res.status(400).json({ error: 'נתיב סנכרון מקומי הוא חובה' });
  }

  const settings = {
    localSyncPath: path.resolve(localSyncPath),
    googleAppsScriptUrl: googleAppsScriptUrl || '',
    syncMode: syncMode || 'local'
  };

  saveSettings(settings);
  res.json(settings);
});

// 3. Get all ideas
app.get('/api/ideas', (req, res) => {
  res.json(getIdeas());
});

// Helper: Sanitize string for safety in file names
function sanitizeFilename(str) {
  return str
    .replace(/[\\/:*?"<>|]/g, '') // remove illegal filename characters
    .trim()
    .replace(/\s+/g, '_') // replace spaces with underscores
    .slice(0, 40); // keep it reasonably short
}

// Helper: Generate and write Markdown file
function writeMarkdownFile(idea, settings) {
  if (settings.syncMode === 'cloud') return; // If only cloud, don't write locally

  const syncPath = settings.localSyncPath;
  if (!fs.existsSync(syncPath)) {
    fs.mkdirSync(syncPath, { recursive: true });
  }

  const assetsDir = path.join(syncPath, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Sanitize title for filename
  const cleanTitle = sanitizeFilename(idea.title) || 'idea';
  const cleanAuthor = sanitizeFilename(idea.author) || 'kid';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${cleanAuthor}_${cleanTitle}.md`;
  const filePath = path.join(syncPath, filename);

  // If there's an image, copy it to the sync folder assets folder
  let imageMarkdown = '';
  if (idea.imagePath) {
    const sourcePath = path.join(__dirname, '..', idea.imagePath);
    const imageName = path.basename(idea.imagePath);
    const destPath = path.join(assetsDir, imageName);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      imageMarkdown = `\n### תמונה או ציור מצורפים:\n![תמונה מצורפת](assets/${imageName})`;
    }
  }

  const mdContent = `---
title: "${idea.title.replace(/"/g, '\\"')}"
author: "${idea.author}"
category: "${idea.category}"
excitement: "${idea.excitement}/5"
date: "${idea.date}"
link: "${idea.link || ''}"
---

# ${idea.category}: ${idea.title}
הוצע על ידי **${idea.author}** בתאריך ${new Date(idea.date).toLocaleDateString('he-IL')}

### למה אני רוצה ללכת לכאן:
${idea.description}

${idea.link ? `### קישור:\n[לצפייה באתר/מפה](${idea.link})` : ''}
${imageMarkdown}
`;

  fs.writeFileSync(filePath, mdContent, 'utf-8');
  console.log(`Markdown file written: ${filePath}`);
}

// Helper: Generate and write compiled Markdown notebook file
function writeCompiledMarkdown(ideas, settings) {
  if (settings.syncMode === 'cloud') return;

  const syncPath = settings.localSyncPath;
  if (!fs.existsSync(syncPath)) {
    fs.mkdirSync(syncPath, { recursive: true });
  }

  let md = `# 🗺️ לוח ההרפתקאות: טיול משפחתי להונגריה 2026 🇭🇺\n\n`;
  md += `מסמך זה מרכז את כל ההצעות, הקישורים והרעיונות של המשפחה לטיול.\n\n`;

  ideas.forEach(idea => {
    md += `## ${idea.category}: ${idea.title}\n`;
    md += `**הוצע על ידי**: ${idea.author} | **תאריך**: ${new Date(idea.date).toLocaleDateString('he-IL')}\n`;
    md += `**רמת התלהבות**: ${"⭐".repeat(idea.excitement)} (${idea.excitement}/5)\n\n`;
    
    if (idea.reactions && Object.keys(idea.reactions).length > 0) {
      const reactionParts = Object.entries(idea.reactions)
        .map(([emoji, voters]) => `${emoji} (${voters.join(', ')})`)
        .join(', ');
      md += `**תגובות**: ${reactionParts}\n\n`;
    }

    if (idea.link) {
      md += `**קישור**: [לצפייה באתר/מפה](${idea.link})\n\n`;
    }
    
    md += `### למה כדאי לנו ללכת:\n${idea.description}\n\n`;
    
    if (idea.imagePath) {
      const imageName = path.basename(idea.imagePath);
      md += `### תמונה מצורפת:\n![תמונה מצורפת](assets/${imageName})\n\n`;
    }
    
    md += `---\n\n`;
  });

  const filePath = path.join(syncPath, 'trip_notebook.md');
  fs.writeFileSync(filePath, md, 'utf-8');
  console.log(`Compiled Markdown file written: ${filePath}`);
}

// 4. Submit a new idea (handles JSON submission for photo/drawing/text)
app.post('/api/ideas', (req, res) => {
  try {
    const settings = getSettings();
    const ideas = getIdeas();

    let { title, author, category, excitement, link, description, drawing, photo } = req.body;
    excitement = parseInt(excitement) || 5;

    const newIdea = {
      id: Date.now().toString(),
      title: title || 'רעיון חדש',
      author: author || 'אנונימי',
      category: category || '💡 רעיון כללי',
      excitement,
      date: new Date().toISOString(),
      link: link || '',
      description: description || '',
      reactions: {}
    };

    // Handle Image storage
    if (photo) {
      // Photo was submitted as base64 string
      const matches = photo.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      let ext = '.jpg';
      let base64Data = photo;
      if (matches && matches.length === 3) {
        ext = '.' + matches[1];
        base64Data = matches[2];
      } else {
        base64Data = photo.replace(/^data:image\/[a-z]+;base64,/, '');
      }
      const photoFilename = `photo-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      const photoPath = path.join(UPLOADS_DIR, photoFilename);

      fs.writeFileSync(photoPath, base64Data, 'base64');
      newIdea.imagePath = `uploads/${photoFilename}`;
    } else if (drawing) {
      // Drawing was submitted as base64 string
      const base64Data = drawing.replace(/^data:image\/png;base64,/, '');
      const drawingFilename = `drawing-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      const drawingPath = path.join(UPLOADS_DIR, drawingFilename);

      fs.writeFileSync(drawingPath, base64Data, 'base64');
      newIdea.imagePath = `uploads/${drawingFilename}`;
    }

    // Save to server local JSON database
    ideas.unshift(newIdea);
    saveIdeas(ideas);

    // Write to Markdown files for NotebookLM sync
    writeMarkdownFile(newIdea, settings);
    writeCompiledMarkdown(ideas, settings);

    res.status(201).json(newIdea);
  } catch (error) {
    console.error('Error saving idea:', error);
    res.status(500).json({ error: 'שגיאה בשמירת הרעיון' });
  }
});

// 5. Toggle reaction to an idea
app.post('/api/ideas/:id/react', (req, res) => {
  const { id } = req.params;
  const { emoji, kidName } = req.body;

  if (!emoji || !kidName) {
    return res.status(400).json({ error: 'שדות חסרים' });
  }

  const ideas = getIdeas();
  const idea = ideas.find(i => i.id === id);

  if (!idea) {
    return res.status(404).json({ error: 'הרעיון לא נמצא' });
  }

  if (!idea.reactions) {
    idea.reactions = {};
  }

  if (!idea.reactions[emoji]) {
    idea.reactions[emoji] = [];
  }

  const index = idea.reactions[emoji].indexOf(kidName);
  if (index > -1) {
    // Already reacted, remove reaction
    idea.reactions[emoji].splice(index, 1);
  } else {
    // Add reaction
    idea.reactions[emoji].push(kidName);
  }

  // Remove emoji key if empty list
  if (idea.reactions[emoji].length === 0) {
    delete idea.reactions[emoji];
  }

  const settings = getSettings();
  saveIdeas(ideas);
  writeCompiledMarkdown(ideas, settings);
  res.json(idea);
});

// Serve frontend in production
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Sync folder is set to: ${getSettings().localSyncPath}`);
});
