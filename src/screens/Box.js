import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';
import {
  getBoxesAPI,
  createBoxAPI,
  updateBoxAPI,
  deleteBoxAPI,
  assignComponentToBoxAPI,
  removeComponentFromBoxAPI,
} from '../utils/storage';

export default function Box() {
  const [boxes, setBoxes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState(null);

  const [formLoading, setFormLoading] = useState(false);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [assigningBoxId, setAssigningBoxId] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const initialFormState = {
    box_type: 'PI_BOX',
    status: 'In Stock',
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    setIsLoading(true);
    try {
      const data = await getBoxesAPI();
      // Guard against the API returning null/undefined, which would
      // otherwise crash every .filter()/.map() call on `boxes` below.
      setBoxes(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch boxes.');
      setBoxes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBoxId(null);
    setFormData(initialFormState);
    setModalVisible(true);
  };

  const openEditModal = (box) => {
    setEditingBoxId(box.id);
    setFormData({
      box_type: box.box_type || '',
      status: box.status || 'In Stock',
      notes: box.notes || '',
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this box?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBoxAPI(id);
            Alert.alert('Success', 'Box deleted successfully');
            fetchBoxes();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete box');
          }
        },
      },
    ]);
  };

  const openScannerModal = async (boxId) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission required', 'Camera permission is required to scan the component QR code.');
        return;
      }
    }
    setAssigningBoxId(boxId);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (deviceLoading) return;
    setDeviceLoading(true);
    try {
      await assignComponentToBoxAPI(assigningBoxId, data);
      Alert.alert('Success', 'Component assigned to box successfully.');
      setScannerVisible(false);
      fetchBoxes();
    } catch (e) {
      let errorMessage = e.message || 'Failed to assign component';

      const match = errorMessage.match(/Category '(.*?)' is not allowed in a (.*?)\. Allowed: (.*)/i);
      if (match) {
        const category = match[1];
        const boxTypeParts = match[2].split('_');
        const boxType = boxTypeParts
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
          .join(' ');
        const allowed = match[3];

        errorMessage = `Unable to assign "${category}" to the ${boxType}. Allowed categories: ${allowed}.`;
        Alert.alert('Assignment Failed', errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }

      setScannerVisible(false);
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleRemoveComponent = (boxId, component) => {
    Alert.alert(
      'Remove Component',
      `Remove "${component.category || component.id}" from this box?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeComponentFromBoxAPI(boxId, component.id);
              Alert.alert('Success', 'Component removed from box.');
              fetchBoxes();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to remove component');
            }
          },
        },
      ]
    );
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.box_type) {
      Alert.alert('Validation Error', 'Box Type is required.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        box_type: formData.box_type,
        status: formData.status,
        notes: formData.notes,
      };

      if (editingBoxId) {
        await updateBoxAPI(editingBoxId, payload);
        Alert.alert('Success', 'Box updated successfully!');
      } else {
        await createBoxAPI(payload);
        Alert.alert('Success', 'Box created successfully!');
      }
      setModalVisible(false);
      fetchBoxes();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save box');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredBoxes = (boxes || []).filter((box) => {
    const searchString = `${box.box_type || ''} ${box.notes || ''} ${box.bus_no || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search boxes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.listSection}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 20 }} />
        ) : filteredBoxes.length === 0 ? (
          <Text style={styles.emptyText}>No boxes found.</Text>
        ) : (
          <ScrollView>
            {filteredBoxes.map((box) => (
              <View key={box.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{box.box_type}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      box.status === 'In Stock' ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>{box.status || 'Unknown'}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>
                  <Text style={styles.bold}>Assigned to Bus:</Text> {box.bus_no || 'Not Assigned'}
                </Text>
                <Text style={styles.cardDesc}>
                  <Text style={styles.bold}>Notes:</Text> {box.notes}
                </Text>
                <Text style={styles.bold}>Components:</Text>
                {box.components && box.components.length > 0 ? (
                  <View style={styles.componentChipsRow}>
                    {box.components.map((c) => (
                      <View key={c.id} style={styles.componentChip}>
                        <Text style={styles.componentChipText}>{c.category || c.id}</Text>
                        <TouchableOpacity
                          style={styles.componentChipRemove}
                          onPress={() => handleRemoveComponent(box.id, c)}
                        >
                          <Feather name="x" size={12} color="#e53e3e" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.cardDesc}>None</Text>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: '#e6fffa' }]}
                    onPress={() => openScannerModal(box.id)}
                  >
                    <MaterialCommunityIcons name="qrcode-scan" size={18} color="#222a29ff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(box)}>
                      <Feather name="edit" size={18} color="#2b6cb0" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: '#fff5f5', marginRight: 0 }]}
                      onPress={() => handleDelete(box.id)}
                    >
                      <Feather name="trash-2" size={18} color="#e53e3e" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>

      {/* Modal Form */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingBoxId ? 'Edit Box' : 'Create Box'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Box Type *</Text>
                <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', overflow: 'hidden', marginBottom: 16 }}>
                  <Picker
                    selectedValue={formData.box_type}
                    onValueChange={(val) => handleInputChange('box_type', val)}
                    mode="dropdown"
                    style={{ height: 50, color: formData.box_type ? '#2d3748' : '#a0aec0' }}
                  >
                    <Picker.Item label="Select Box Type..." value="" color="#a0aec0" />
                    <Picker.Item label="PI_BOX" value="PI_BOX" color="#2d3748" />
                    <Picker.Item label="SENSOR_BOX" value="SENSOR_BOX" color="#2d3748" />
                  </Picker>
                </View>

              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Status</Text>
                <TextInput
                  style={styles.input}
                  value={formData.status}
                  onChangeText={(val) => handleInputChange('status', val)}
                  placeholder="e.g. In Stock"
                />
              </View>
            </View>

            <View style={styles.inputFull}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.notes}
                onChangeText={(val) => handleInputChange('notes', val)}
                placeholder="Additional notes..."
                multiline
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Box</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Component Assign Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false} presentationStyle="fullScreen">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Component QR</Text>
            <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.closeScannerBtn}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraWrapper}>
            {scannerVisible && permission?.granted && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={deviceLoading ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_e'],
                }}
              />
            )}
            <View style={styles.scannerTargetBox} />
            {deviceLoading && (
              <View style={styles.scannerLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scannerLoadingText}>Assigning to Box...</Text>
              </View>
            )}
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstruction}>
              Point the camera at the Component's QR code to assign it to this Box.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  headerRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    marginRight: 12,
  },
  createButton: {
    backgroundColor: '#805ad5', // A distinct color for Box Management
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#805ad5',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#c6f6d5',
  },
  statusInactive: {
    backgroundColor: '#edf2f7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  cardDesc: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#2d3748',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
    paddingTop: 12,
  },
  componentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 4,
  },
  componentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  componentChipText: {
    fontSize: 12,
    color: '#553c9a',
    fontWeight: '600',
    marginRight: 4,
  },
  componentChipRemove: {
    padding: 2,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ebf8ff',
    borderRadius: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  closeModalBtn: {
    padding: 8,
  },
  closeModalText: {
    color: '#e53e3e',
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    width: '48%',
  },
  inputFull: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#2d3748',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#805ad5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a202c',
    zIndex: 10,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeScannerBtn: {
    padding: 8,
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scannerTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#48bb78',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  scannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerFooter: {
    padding: 30,
    backgroundColor: '#1a202c',
    alignItems: 'center',
  },
  scannerInstruction: {
    color: '#a0aec0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
});