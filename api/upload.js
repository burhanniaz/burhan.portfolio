import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { isAuthed, requireAuth } from './_lib/auth.js';

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];
const VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 200 * 1024 * 1024;          // 200 MB — comfortably covers a demo video

export default async function handler(req, res){
  // Remove a file from Blob storage when a media item is deleted in the admin.
  if(req.method === 'DELETE'){
    if(!requireAuth(req, res)) return;
    try{
      const url = req.query.url || req.body?.url;
      if(!url) return res.status(400).json({ error: 'Missing url' });
      await del(url);
      return res.status(200).json({ ok: true });
    }catch(err){
      console.error('blob delete:', err);
      return res.status(500).json({ error: 'Could not delete file' });
    }
  }

  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try{
    /*
      The browser uploads straight to Blob storage rather than through this
      function, which is what makes large video files possible — serverless
      request bodies cap out around 4.5 MB.

      This route is hit twice: once by the browser to mint an upload token
      (that request carries the admin cookie), and once by Vercel afterwards to
      report completion (that one has no cookie). So the auth check belongs in
      onBeforeGenerateToken, not at the top of the handler.
    */
    const result = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        if(!isAuthed(req)) throw new Error('Not signed in');
        return {
          allowedContentTypes: [...IMAGE, ...VIDEO],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => { /* nothing to record — the URL is saved with the project */ }
    });

    res.status(200).json(result);
  }catch(err){
    console.error('upload:', err);
    res.status(err.message === 'Not signed in' ? 401 : 400).json({ error: err.message });
  }
}
