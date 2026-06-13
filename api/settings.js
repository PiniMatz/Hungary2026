export default function handler(req, res) {
  // Return dummy configurations for serverless environment
  res.status(200).json({
    localSyncPath: 'סנכרון ענן של Vercel ו-GitHub',
    googleAppsScriptUrl: '',
    syncMode: 'cloud'
  });
}
