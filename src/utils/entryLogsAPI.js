import { BASE_URL } from './storage';

export const getEntryLogsAPI = async ({
  limit = 100,
  offset = 0,
  bus_id = '',
  trip_id = '',
  direction = '',
  start_datetime = '',
  end_datetime = '',
} = {}) => {
  try {
    // Only include params that actually have a value — sending empty
    // strings (e.g. "direction=") causes many backends to filter on an
    // empty value instead of treating the filter as "not set", which can
    // silently return zero results or trigger a validation error.
    const rawParams = {
      limit: limit.toString(),
      offset: offset.toString(),
      bus_id,
      trip_id,
      direction,
      start_datetime,
      end_datetime,
    };

    const filteredParams = Object.fromEntries(
      Object.entries(rawParams).filter(([, value]) => value !== '' && value != null),
    );

    const queryParams = new URLSearchParams(filteredParams).toString();

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