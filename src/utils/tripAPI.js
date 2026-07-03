import { BASE_URL } from './storage';

/**
 * Extracts a human-readable message from a FastAPI error response.
 * FastAPI validation errors return `detail` as an array of objects.
 */
const parseErrorDetail = (detail) => {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = d.loc ? d.loc.slice(1).join(' -> ') : '';
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join('\n');
  }
  return JSON.stringify(detail);
};

/**
 * GET /trips
 * Fetches all trips from the server.
 * @param {string} [busNo] — optional bus_no filter, e.g. "CONSULTITBUS02"
 *   When provided, calls GET /trips?bus_no={busNo}
 */
export const getAllTripsAPI = async (busNo) => {
  try {
    const url = busNo
      ? `${BASE_URL}/trips?bus_no=${encodeURIComponent(busNo)}`
      : `${BASE_URL}/trips`;
    const response = await fetch(url);
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(parseErrorDetail(errJson.detail) || 'Failed to fetch trips');
    }
    return await response.json();
  } catch (error) {
    console.error('getAllTripsAPI error:', error);
    throw error;
  }
};

/**
 * POST /trips
 * Creates a new trip.
 * @param {{ bus_no: string, start_datetime: string }} tripData
 */
export const createTripAPI = async (tripData) => {
  try {
    const response = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(parseErrorDetail(errJson.detail) || 'Failed to create trip');
    }
    return await response.json();
  } catch (error) {
    console.error('createTripAPI error:', error);
    throw error;
  }
};

/**
 * PATCH /trips/{trip_id}
 * Completes a trip by setting end_datetime.
 * @param {string} tripId
 * @param {string} endDatetime  — local ISO string e.g. "2026-06-29T06:00:00"
 */
export const patchTripAPI = async (tripId, endDatetime) => {
  try {
    const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_datetime: endDatetime }),
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(parseErrorDetail(errJson.detail) || 'Failed to complete trip');
    }
    return await response.json();
  } catch (error) {
    console.error('patchTripAPI error:', error);
    throw error;
  }
};

/**
 * DELETE /trips/{trip_id}
 * Deletes a trip permanently.
 */
export const deleteTripAPI = async (tripId) => {
  try {
    const response = await fetch(`${BASE_URL}/trips/${tripId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(parseErrorDetail(errJson.detail) || 'Failed to delete trip');
    }
    // DELETE may return 204 No Content
    return response.status === 204 ? null : await response.json().catch(() => null);
  } catch (error) {
    console.error('deleteTripAPI error:', error);
    throw error;
  }
};