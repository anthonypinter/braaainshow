import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const isConfigured = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_KEY.startsWith('YOUR-');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'videos';
export const MAX_BYTES = 50 * 1024 * 1024;

/** Upload the recording. Returns its path inside the bucket. */
export async function uploadVideo(id, blob) {
  const contentType = (blob.type || 'video/webm').split(';')[0];
  const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
  const path = `${id}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

/** Save the madlib + who made it. Email is write-only (never readable from the site). */
export async function saveRecording(row) {
  const { error } = await supabase.from('recordings').insert(row);
  if (error) throw error;
}

/** Fetch a single recording for the watch page (no email). */
export async function getRecording(id) {
  const { data, error } = await supabase.rpc('get_recording', { rid: id });
  if (error) throw error;
  return data?.[0] ?? null;
}

export function videoUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
