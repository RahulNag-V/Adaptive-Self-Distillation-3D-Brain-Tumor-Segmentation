/**
 * 2D Brain Tumor Classification API Client
 * Sends single JPG/JPEG/PNG image to POST /api/classify.
 */
import { request } from './client';

export async function classifyImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  return await request('/api/classify', {
    method: 'POST',
    body: formData,
  });
}
