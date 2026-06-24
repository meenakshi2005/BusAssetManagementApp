import { BASE_URL } from './storage';

export const getEntryLogsAPI = async ({ limit = 100, offset = 0, bus_id = '', direction = '', date = '', start_time = '', end_time = '' } = {}) => {
  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      bus_id,
      direction,
      date,
      start_time,
      end_time
    }).toString();

    const response = await fetch(`${BASE_URL}/entry/logs?${queryParams}`);
    
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || 'Failed to fetch entry logs');
    }
    
    return await response.json();
  } catch (error) {
    console.error('getEntryLogsAPI error:', error);
    throw error;
  }
};
