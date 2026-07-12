import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error('Error storing data', e);
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error reading data', e);
    return null;
  }
};

// Application specific helpers
export const getComponents = async () => {
  const data = await getData('components');
  return data || [];
};

export const saveComponents = async (components) => {
  await storeData('components', components);
};

export const getBuses = async () => {
  const data = await getData('buses');
  return data || [];
};

export const saveBuses = async (buses) => {
  await storeData('buses', buses);
};

export const getHistory = async () => {
  const data = await getData('history');
  return data || [];
};

export const saveHistory = async (history) => {
  await storeData('history', history);
};

// --- Real API Flow for Bus Master ---

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://exhibitnow.world';

// Shared helper: extract a useful error message from a failed response,
// tolerating either { detail } or { message } error shapes and bodies
// that aren't valid JSON at all.
const extractErrorMessage = async (response, fallback) => {
  try {
    const errJson = await response.json();
    return errJson.detail || errJson.message || fallback;
  } catch {
    return fallback;
  }
};

export const getBusesAPI = async () => {
  try {
    const response = await fetch(`${BASE_URL}/bus-box-details`);
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to fetch buses'));
    }
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('getBusesAPI error:', error);
    throw error;
  }
};

export const createBusAPI = async (busData) => {
  const payload = {
    ...busData,
    is_active: !!busData.is_active,
  };
  try {
    const response = await fetch(`${BASE_URL}/bus-master`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to create bus'));
    }
    return await response.json();
  } catch (error) {
    console.error('createBusAPI error:', error);
    throw error;
  }
};

export const updateBusAPI = async (id, updatedData) => {
  const payload = {
    ...updatedData,
    is_active: !!updatedData.is_active,
  };
  try {
    const response = await fetch(`${BASE_URL}/bus-master/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to update bus'));
    }
    return await response.json();
  } catch (error) {
    console.error('updateBusAPI error:', error);
    throw error;
  }
};

export const deleteBusAPI = async (id) => {
  try {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${BASE_URL}/bus-master/${encodedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to delete bus'));
    }
    return true;
  } catch (error) {
    console.error('deleteBusAPI error:', error);
    throw error;
  }
};

export const assignBoxToBusAPI = async (boxId, busNo) => {
  try {
    if (!boxId || typeof boxId !== 'string') {
      throw new Error('Invalid box ID scanned');
    }
    const encodedBoxId = encodeURIComponent(boxId.trim());
    const response = await fetch(`${BASE_URL}/box/${encodedBoxId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bus_no: busNo }),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to assign box to bus'));
    }
    return await response.json();
  } catch (error) {
    console.error('assignBoxToBusAPI error:', error);
    throw error;
  }
};

export const unassignBoxFromBusAPI = async (boxId) => {
  try {
    const encodedBoxId = encodeURIComponent(boxId);
    const response = await fetch(`${BASE_URL}/box/${encodedBoxId}/unassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to unassign box'));
    }
    return await response.json();
  } catch (error) {
    console.error('unassignBoxFromBusAPI error:', error);
    throw error;
  }
};

// --- Inventory (Component) APIs ---

export const getComponentsAPI = async () => {
  try {
    const response = await fetch(`${BASE_URL}/component`);
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to fetch components'));
    }
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('getComponentsAPI error:', error);
    throw error;
  }
};

export const createComponentAPI = async (componentData) => {
  try {
    const response = await fetch(`${BASE_URL}/component`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(componentData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to create component'));
    }
    return await response.json();
  } catch (error) {
    console.error('createComponentAPI error:', error);
    throw error;
  }
};

export const updateComponentAPI = async (id, componentData) => {
  try {
    const response = await fetch(`${BASE_URL}/component/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(componentData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to update component'));
    }
    return await response.json();
  } catch (error) {
    console.error('updateComponentAPI error:', error);
    throw error;
  }
};

export const deleteComponentAPI = async (id) => {
  try {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${BASE_URL}/component/${encodedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to delete component'));
    }
    return true;
  } catch (error) {
    console.error('deleteComponentAPI error:', error);
    throw error;
  }
};

// --- Box APIs ---

export const getBoxesAPI = async () => {
  try {
    const response = await fetch(`${BASE_URL}/box`);
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to fetch boxes'));
    }
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('getBoxesAPI error:', error);
    throw error;
  }
};

export const createBoxAPI = async (boxData) => {
  try {
    const response = await fetch(`${BASE_URL}/box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boxData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to create box'));
    }
    return await response.json();
  } catch (error) {
    console.error('createBoxAPI error:', error);
    throw error;
  }
};

export const updateBoxAPI = async (id, boxData) => {
  try {
    const response = await fetch(`${BASE_URL}/box/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boxData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to update box'));
    }
    return await response.json();
  } catch (error) {
    console.error('updateBoxAPI error:', error);
    throw error;
  }
};

export const deleteBoxAPI = async (id) => {
  try {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${BASE_URL}/box/${encodedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to delete box'));
    }
    return true;
  } catch (error) {
    console.error('deleteBoxAPI error:', error);
    throw error;
  }
};

export const assignComponentToBoxAPI = async (boxId, componentId) => {
  try {
    const response = await fetch(`${BASE_URL}/box/${boxId}/assign-component`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component_id: componentId }),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to assign component'));
    }
    return await response.json();
  } catch (error) {
    console.error('assignComponentToBoxAPI error:', error);
    throw error;
  }
};

// --- Camera Detail APIs ---

export const getCamerasAPI = async () => {
  try {
    const response = await fetch(`${BASE_URL}/camera`);
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to fetch cameras'));
    }
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('getCamerasAPI error:', error);
    throw error;
  }
};

export const getCameraByIdAPI = async (cameraId) => {
  try {
    const encodedId = encodeURIComponent(cameraId);
    const response = await fetch(`${BASE_URL}/camera/${encodedId}`);
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to fetch camera'));
    }
    return await response.json();
  } catch (error) {
    console.error('getCameraByIdAPI error:', error);
    throw error;
  }
};

export const createCameraAPI = async (cameraData) => {
  try {
    const response = await fetch(`${BASE_URL}/camera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to create camera'));
    }
    return await response.json();
  } catch (error) {
    console.error('createCameraAPI error:', error);
    throw error;
  }
};

export const updateCameraAPI = async (cameraId, cameraData) => {
  try {
    const encodedId = encodeURIComponent(cameraId);
    const response = await fetch(`${BASE_URL}/camera/${encodedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cameraData),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to update camera'));
    }
    return await response.json();
  } catch (error) {
    console.error('updateCameraAPI error:', error);
    throw error;
  }
};

export const deleteCameraAPI = async (cameraId) => {
  try {
    const encodedId = encodeURIComponent(cameraId);
    const response = await fetch(`${BASE_URL}/camera/${encodedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response, 'Failed to delete camera'));
    }
    return true;
  } catch (error) {
    console.error('deleteCameraAPI error:', error);
    throw error;
  }
};