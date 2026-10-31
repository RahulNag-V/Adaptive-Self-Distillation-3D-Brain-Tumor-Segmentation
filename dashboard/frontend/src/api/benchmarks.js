import { client } from './client';

export async function fetchModelComparison() {
  try {
    const res = await client.get('/api/models/comparison');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch model comparison:', error);
    throw error;
  }
}

export async function fetchTrainingAnalytics() {
  try {
    const res = await client.get('/api/analytics/history');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch training analytics:', error);
    throw error;
  }
}

