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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  getBusesAPI,
  createBusAPI,
  updateBusAPI,
  deleteBusAPI,
  assignBoxToBusAPI,
} from '../utils/storage';

export default function BusMaster() {
  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);
  
  const [scannerVisible, setScannerVisible] = useState(false);
  const [assigningBusId, setAssigningBusId] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const initialFormState = {
    bus_no: '',
    route: '',
    departure_time: '',
    arrival_time: '',
    kms: '',
    driver_1: '',
    driver_2: '',
    conductor_1: '',
    conductor_2: '',
    reliever_1: '',
    reliever_2: '',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchBusesList();
  }, []);

  const fetchBusesList = async () => {
    setIsLoading(true);
    try {
      const data = await getBusesAPI();
      setBuses(data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch buses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingBusId(null);
    setFormData(initialFormState);
    setModalVisible(true);
  };

  const openEditModal = (bus) => {
    setEditingBusId(bus.bus_no);
    setFormData({
      bus_no: bus.bus_no || '',
      route: bus.route || '',
      departure_time: bus.departure_time || '',
      arrival_time: bus.arrival_time || '',
      kms: bus.kms ? bus.kms.toString() : '',
      driver_1: bus.driver_1 || '',
      driver_2: bus.driver_2 || '',
      conductor_1: bus.conductor_1 || '',
      conductor_2: bus.conductor_2 || '',
      reliever_1: bus.reliever_1 || '',
      reliever_2: bus.reliever_2 || '',
      is_active: bus.is_active === 1 || bus.is_active === true,
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this bus?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteBusAPI(id);
              Alert.alert('Success', 'Bus successfully deleted!');
              fetchBusesList();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete bus');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveBus = async () => {
    if (!formData.bus_no || !formData.route) {
      Alert.alert('Validation Error', 'Bus Number and Route are required.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingBusId) {
        await updateBusAPI(editingBusId, formData);
        Alert.alert('Success', 'Bus successfully updated!');
      } else {
        // Validate unique bus number
        const existing = buses.find(b => b.bus_no.toLowerCase() === formData.bus_no.toLowerCase());
        if (existing) {
          Alert.alert('Error', 'Bus number already exists!');
          setFormLoading(false);
          return;
        }
        await createBusAPI(formData);
        Alert.alert('Success', 'Bus successfully created!');
      }
      setModalVisible(false);
      fetchBusesList();
    } catch (e) {
      Alert.alert('Error', e.message || `Failed to ${editingBusId ? 'update' : 'create'} bus`);
    } finally {
      setFormLoading(false);
    }
  };

  const openDeviceModal = async (bus) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission required', 'Camera permission is required to scan the device QR code.');
        return;
      }
    }
    setAssigningBusId(bus.bus_no);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (deviceLoading) return;
    setDeviceLoading(true);
    try {
      const cleanData = data.trim();
      await assignBoxToBusAPI(cleanData, assigningBusId);
      Alert.alert('Success', 'Box assigned to bus successfully.');
      setScannerVisible(false);
      fetchBusesList();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to assign box');
    } finally {
      setDeviceLoading(false);
    }
  };

  // Filter and Search logic
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch = bus.bus_no && bus.bus_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterActive === 'ALL' ||
      (filterActive === 'ACTIVE' && (bus.is_active === 1 || bus.is_active === true)) ||
      (filterActive === 'INACTIVE' && (bus.is_active === 0 || bus.is_active === false));
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Bus Number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ Create Bus</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {/* <Text style={styles.filterLabel}>Filter Status: </Text> */}
        {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filterActive === f && styles.filterBtnActive]}
            onPress={() => setFilterActive(f)}
          >
            <Text style={[styles.filterBtnText, filterActive === f && styles.filterBtnTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bus List */}
      <View style={styles.listSection}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 20 }} />
        ) : filteredBuses.length === 0 ? (
          <Text style={styles.emptyText}>No buses found.</Text>
        ) : (
          <ScrollView>
            {filteredBuses.map((bus) => (
              <View key={bus.bus_no} style={styles.busCard}>
                <View style={styles.busCardHeader}>
                  <Text style={styles.busCardTitle}>{bus.bus_no}</Text>
                  {/* <View style={[styles.statusBadge, (bus.is_active === 1 || bus.is_active === true) ? styles.statusActive : styles.statusInactive]}>
                    <Text style={styles.statusText}>{(bus.is_active === 1 || bus.is_active === true) ? 'Active' : 'Inactive'}</Text>
                  </View> */}
                </View>
                {/* <Text style={styles.busCardDesc}><Text style={styles.bold}>Box ID:</Text> {bus.device_id || 'Not Assigned'}</Text> */}
                <Text style={styles.busCardDesc}><Text style={styles.bold}>Route:</Text> {bus.route}</Text>
                <Text style={styles.busCardDesc}><Text style={styles.bold}>Timing:</Text> {bus.departure_time} - {bus.arrival_time}</Text>
                <Text style={styles.busCardDesc}><Text style={styles.bold}>KMs:</Text> {bus.kms}</Text>
                <Text style={styles.busCardDesc}><Text style={styles.bold}>Drivers:</Text> {bus.driver_1} {bus.driver_2 ? `/ ${bus.driver_2}` : ''}</Text>
                <Text style={styles.busCardDesc}><Text style={styles.bold}>Conductors:</Text> {bus.conductor_1} {bus.conductor_2 ? `/ ${bus.conductor_2}` : ''}</Text>
                {(bus.reliever_1 || bus.reliever_2) && (
                  <Text style={styles.busCardDesc}><Text style={styles.bold}>Relievers:</Text> {bus.reliever_1} {bus.reliever_2 ? `/ ${bus.reliever_2}` : ''}</Text>
                )}

                {(bus.pi_box?.assigned === true || bus.pi_box?.assigned === 'true') && (
                  <Text style={styles.busCardDesc}><Text style={styles.bold}>Pi Box:</Text> {bus.pi_box.box_id}</Text>
                )}
                {(bus.sensor_box?.assigned === true || bus.sensor_box?.assigned === 'true') && (
                  <Text style={styles.busCardDesc}><Text style={styles.bold}>Sensor Box:</Text> {bus.sensor_box.box_id}</Text>
                )}

                <View style={[styles.actionRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    {!(bus.pi_box?.assigned === true || bus.pi_box?.assigned === 'true') ? (
                      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#e6fffa', flex: 1, paddingHorizontal: 4 }]} onPress={() => openDeviceModal(bus)}>
                        <Feather name="box" size={14} color="#319795" />
                        <Text style={[styles.actionBtnText, { color: '#319795', marginLeft: 4, fontSize: 12 }]}>Assign Pi Box</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#ebf8ff', flex: 1, paddingHorizontal: 4 }]} onPress={() => openDeviceModal(bus)}>
                        <Feather name="refresh-cw" size={14} color="#2b6cb0" />
                        <Text style={[styles.actionBtnText, { color: '#2b6cb0', marginLeft: 4, fontSize: 12 }]}>Reassign Pi Box</Text>
                      </TouchableOpacity>
                    )}
                    
                    {!(bus.sensor_box?.assigned === true || bus.sensor_box?.assigned === 'true') ? (
                      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#e6fffa', flex: 1, marginRight: 0, paddingHorizontal: 4 }]} onPress={() => openDeviceModal(bus)}>
                        <Feather name="box" size={14} color="#319795" />
                        <Text style={[styles.actionBtnText, { color: '#319795', marginLeft: 4, fontSize: 12 }]}>Assign Sensor Box</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#ebf8ff', flex: 1, marginRight: 0, paddingHorizontal: 4 }]} onPress={() => openDeviceModal(bus)}>
                        <Feather name="refresh-cw" size={14} color="#2b6cb0" />
                        <Text style={[styles.actionBtnText, { color: '#2b6cb0', marginLeft: 4, fontSize: 12 }]}>Reassign Sensor Box</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 10 }}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(bus)}>
                      <Feather name="edit" size={18} color="#2b6cb0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#fff5f5', marginRight: 0 }]} onPress={() => handleDelete(bus.bus_no)}>
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

      {/* Form Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingBusId ? 'Edit Bus' : 'Create Bus'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Bus Number *</Text>
                <TextInput style={styles.input} value={formData.bus_no} onChangeText={(val) => handleInputChange('bus_no', val)} placeholder="e.g. BUS-01" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Route *</Text>
                <TextInput style={styles.input} value={formData.route} onChangeText={(val) => handleInputChange('route', val)} placeholder="e.g. A to B" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Departure Time</Text>
                <TextInput style={styles.input} value={formData.departure_time} onChangeText={(val) => handleInputChange('departure_time', val)} placeholder="HH:MM" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Arrival Time</Text>
                <TextInput style={styles.input} value={formData.arrival_time} onChangeText={(val) => handleInputChange('arrival_time', val)} placeholder="HH:MM" />
              </View>
            </View>

            <Text style={styles.label}>Total KMs</Text>
            <TextInput style={styles.input} value={formData.kms} onChangeText={(val) => handleInputChange('kms', val)} placeholder="e.g. 150" keyboardType="numeric" />

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Driver 1</Text>
                <TextInput style={styles.input} value={formData.driver_1} onChangeText={(val) => handleInputChange('driver_1', val)} placeholder="Name" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Driver 2</Text>
                <TextInput style={styles.input} value={formData.driver_2} onChangeText={(val) => handleInputChange('driver_2', val)} placeholder="Name" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Conductor 1</Text>
                <TextInput style={styles.input} value={formData.conductor_1} onChangeText={(val) => handleInputChange('conductor_1', val)} placeholder="Name" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Conductor 2</Text>
                <TextInput style={styles.input} value={formData.conductor_2} onChangeText={(val) => handleInputChange('conductor_2', val)} placeholder="Name" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reliever 1</Text>
                <TextInput style={styles.input} value={formData.reliever_1} onChangeText={(val) => handleInputChange('reliever_1', val)} placeholder="Name" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reliever 2</Text>
                <TextInput style={styles.input} value={formData.reliever_2} onChangeText={(val) => handleInputChange('reliever_2', val)} placeholder="Name" />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Active Status</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(val) => handleInputChange('is_active', val)}
                trackColor={{ false: "#cbd5e0", true: "#48bb78" }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveBus} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Bus</Text>}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Device Assign Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false} presentationStyle="fullScreen">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR/Barcode</Text>
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
                  barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_e"],
                }}
              />
            )}
            <View style={styles.scannerTargetBox} />
            {deviceLoading && (
              <View style={styles.scannerLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scannerLoadingText}>Assigning Device...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstruction}>
              Point the camera at the Box's QR code to automatically assign it to Bus {assigningBusId}.
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
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    fontWeight: '600',
    color: '#4a5568',
    marginRight: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#edf2f7',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#3182ce',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#4a5568',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    marginTop: 40,
    fontSize: 16,
  },
  busCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busCardTitle: {
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
    backgroundColor: '#fed7d7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  busCardDesc: {
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
  actionBtnText: {
    fontWeight: '600',
    color: '#2b6cb0',
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
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputHalf: {
    width: '48%',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
