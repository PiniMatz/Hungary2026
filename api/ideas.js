// Serverless function for Vercel to read/write data to GitHub repository
// Requires GITHUB_TOKEN and GITHUB_REPO environment variables in Vercel

// Helper: Sanitize string for safety in file names
function sanitizeFilename(str) {
  return str
    .replace(/[\\/:*?"<>|]/g, '') // remove illegal filename characters
    .trim()
    .replace(/\s+/g, '_') // replace spaces with underscores
    .slice(0, 40); // keep it reasonably short
}

// Helper: Read a file from GitHub repository
async function readFromGitHub(filePath) {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  
  if (!repo || !token) {
    throw new Error('GITHUB_REPO or GITHUB_TOKEN environment variable is missing.');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Hungary2026-App'
    }
  });

  if (res.status === 404) {
    return null; // File does not exist yet
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error reading ${filePath}: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return {
    content,
    sha: data.sha
  };
}

// Helper: Write/Commit a file to GitHub repository
async function writeToGitHub(filePath, base64Content, commitMessage, sha = null) {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!repo || !token) {
    throw new Error('GITHUB_REPO or GITHUB_TOKEN environment variable is missing.');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  
  const body = {
    message: commitMessage,
    content: base64Content,
    branch
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Hungary2026-App'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error writing ${filePath}: ${res.status} ${text}`);
  }

  return await res.json();
}

// Helper: Generate and write compiled Markdown notebook to GitHub
async function writeCompiledMarkdownCloud(ideas) {
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
      md += `### תמונה מצורפת:\n![תמונה מצורפת](${idea.imagePath})\n\n`;
    }
    
    md += `---\n\n`;
  });

  const mdBase64 = Buffer.from(md).toString('base64');
  
  // Read current trip_notebook.md to get its SHA (if it exists)
  const notebookFile = await readFromGitHub('trip_notebook.md');
  const sha = notebookFile ? notebookFile.sha : null;

  await writeToGitHub('trip_notebook.md', mdBase64, 'Update compiled travel notebook', sha);
}

export default async function handler(req, res) {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    // 1. GET Ideas list
    if (req.method === 'GET') {
      const dbFile = await readFromGitHub('db.json');
      if (!dbFile) {
        return res.status(200).json([]);
      }
      return res.status(200).json(JSON.parse(dbFile.content));
    }

    // 2. POST requests
    if (req.method === 'POST') {
      const { action, id } = req.query;

      // Case A: Toggle emoji reaction on an idea
      if (action === 'react' && id) {
        const { emoji, kidName } = req.body;
        if (!emoji || !kidName) {
          return res.status(400).json({ error: 'שדות חסרים' });
        }

        const dbFile = await readFromGitHub('db.json');
        if (!dbFile) {
          return res.status(404).json({ error: 'מאגר המידע לא נמצא' });
        }

        const ideas = JSON.parse(dbFile.content);
        const idea = ideas.find(i => i.id === id);

        if (!idea) {
          return res.status(404).json({ error: 'הרעיון לא נמצא' });
        }

        if (!idea.reactions) idea.reactions = {};
        if (!idea.reactions[emoji]) idea.reactions[emoji] = [];

        const index = idea.reactions[emoji].indexOf(kidName);
        if (index > -1) {
          idea.reactions[emoji].splice(index, 1);
        } else {
          idea.reactions[emoji].push(kidName);
        }

        if (idea.reactions[emoji].length === 0) {
          delete idea.reactions[emoji];
        }

        // Commit updated db.json and trip_notebook.md back to GitHub
        const updatedDbBase64 = Buffer.from(JSON.stringify(ideas, null, 2)).toString('base64');
        await writeToGitHub('db.json', updatedDbBase64, `Reaction update to idea ${id} by ${kidName}`, dbFile.sha);
        await writeCompiledMarkdownCloud(ideas);

        return res.status(200).json(idea);
      }

      // Case B: Create new travel idea
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

      let imageFilename = '';
      let imageBase64Data = '';

      // Handle base64 image (photo or drawing)
      if (photo) {
        const matches = photo.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        let ext = '.jpg';
        if (matches && matches.length === 3) {
          ext = '.' + matches[1];
          imageBase64Data = matches[2];
        } else {
          imageBase64Data = photo.replace(/^data:image\/[a-z]+;base64,/, '');
        }
        imageFilename = `photo-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      } else if (drawing) {
        imageBase64Data = drawing.replace(/^data:image\/png;base64,/, '');
        imageFilename = `drawing-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      }

      // If an image was submitted, commit it to GitHub uploads folder
      if (imageFilename && imageBase64Data) {
        const uploadPath = `uploads/${imageFilename}`;
        await writeToGitHub(uploadPath, imageBase64Data, `Upload image ${imageFilename} from App`);
        
        // Save the raw github URL so the frontend can load it from anywhere
        newIdea.imagePath = `https://raw.githubusercontent.com/${repo}/${branch}/${uploadPath}`;
      }

      // Generate and commit Markdown file
      const cleanTitle = sanitizeFilename(newIdea.title) || 'idea';
      const cleanAuthor = sanitizeFilename(newIdea.author) || 'kid';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const mdFilename = `${timestamp}_${cleanAuthor}_${cleanTitle}.md`;
      const mdPath = `ideas/${mdFilename}`;

      let imageMarkdown = '';
      if (imageFilename) {
        // Reference image relatively from the ideas/ folder (which goes up to uploads/)
        imageMarkdown = `\n### תמונה או ציור מצורפים:\n![תמונה מצורפת](../uploads/${imageFilename})`;
      }

      const mdContent = `---
title: "${newIdea.title.replace(/"/g, '\\"')}"
author: "${newIdea.author}"
category: "${newIdea.category}"
excitement: "${newIdea.excitement}/5"
date: "${newIdea.date}"
link: "${newIdea.link || ''}"
---

# ${newIdea.category}: ${newIdea.title}
הוצע על ידי **${newIdea.author}** בתאריך ${new Date(newIdea.date).toLocaleDateString('he-IL')}

### למה אני רוצה ללכת לכאן:
${newIdea.description}

${newIdea.link ? `### קישור:\n[לצפייה באתר/מפה](${newIdea.link})` : ''}
${imageMarkdown}
`;

      const mdBase64 = Buffer.from(mdContent).toString('base64');
      await writeToGitHub(mdPath, mdBase64, `Create travel idea: ${newIdea.title}`);

      // Read current db.json, prepend new idea, and save
      const dbFile = await readFromGitHub('db.json');
      const ideas = dbFile ? JSON.parse(dbFile.content) : [];
      ideas.unshift(newIdea);

      const updatedDbBase64 = Buffer.from(JSON.stringify(ideas, null, 2)).toString('base64');
      await writeToGitHub('db.json', updatedDbBase64, `Add idea to database: ${newIdea.title}`, dbFile ? dbFile.sha : null);
      await writeCompiledMarkdownCloud(ideas);

      // Send to Google Apps Script if URL is configured in Vercel environment variables
      const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
      if (appsScriptUrl) {
        try {
          await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newIdea.title,
              author: newIdea.author,
              category: newIdea.category,
              excitement: newIdea.excitement,
              date: newIdea.date,
              link: newIdea.link,
              description: newIdea.description
            })
          });
          console.log('Successfully synced to Google Doc via Apps Script');
        } catch (err) {
          console.error('Error syncing to Apps Script:', err);
        }
      }

      return res.status(201).json(newIdea);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error) {
    console.error('Cloud serverless error:', error);
    return res.status(500).json({ error: error.message || 'שגיאה בשרת הענן' });
  }
}
