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
import { Feather ,MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import RNPickerSelect from 'react-native-picker-select';
import {
  getComponentsAPI,
  createComponentAPI,
  updateComponentAPI,
  deleteComponentAPI,
  assignComponentToBoxAPI,
} from '../utils/storage';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('All');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  
  const [formLoading, setFormLoading] = useState(false);
  
  const [scannerVisible, setScannerVisible] = useState(false);
  const [assigningComponentId, setAssigningComponentId] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const initialFormState = {
    category: '',
    vendor: 'Teltonika',
    purchase_date: '2026-06-19',
    warranty_months: '24',
    invoice_number: 'INV-2026-001',
    status: 'In Stock',
    notes: 'Installed near the driver dashboard.',
    device_id: '', // only used in Edit mode
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const data = await getComponentsAPI();
      setInventory(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItemId(null);
    setFormData(initialFormState);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItemId(item.id);
    setFormData({
      category: item.category || '',
      vendor: item.vendor || '',
      purchase_date: item.purchase_date || '',
      warranty_months: item.warranty_months ? item.warranty_months.toString() : '',
      invoice_number: item.invoice_number || '',
      status: item.status || '',
      notes: item.notes || '',
      device_id: item.device_id || '',
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComponentAPI(id);
            Alert.alert('Success', 'Item deleted successfully');
            fetchInventory();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete item');
          }
        }
      },
    ]);
  };

  const openScannerModal = async (itemId) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission required', 'Camera permission is required to scan the box QR code.');
        return;
      }
    }
    setAssigningComponentId(itemId);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ type, data }) => {
    if (deviceLoading) return;
    setDeviceLoading(true);
    try {
      await assignComponentToBoxAPI(data, assigningComponentId);
      Alert.alert('Success', 'Component assigned to box successfully.');
      setScannerVisible(false);
      fetchInventory();
    } catch (e) {
      let errorMessage = e.message || 'Failed to assign component';
      
      // Parse backend category mismatch error
      // e.g. "Category 'gps' is not allowed in a SENSOR_BOX. Allowed: esp32, battery"
      const match = errorMessage.match(/Category '(.*?)' is not allowed in a (.*?)\. Allowed: (.*)/i);
      
      if (match) {
        const category = match[1];
        // Format box type (e.g. SENSOR_BOX to Sensor Box)
        const boxTypeParts = match[2].split('_');
        const boxType = boxTypeParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
        const allowed = match[3];
        
        errorMessage = `Unable to assign the selected component to the ${boxType}." `;
        
        Alert.alert('Assignment Failed', errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
      
      setScannerVisible(false);
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.category || !formData.vendor) {
      Alert.alert('Validation Error', 'Category and Vendor are required fields.');
      return;
    }
    
    setFormLoading(true);
    try {
      const payload = {
        category: formData.category,
        vendor: formData.vendor,
        purchase_date: formData.purchase_date,
        warranty_months: parseInt(formData.warranty_months, 10) || 0,
        invoice_number: formData.invoice_number,
        status: formData.status,
        notes: formData.notes,
      };

      if (editingItemId) {
        // Include device_id ONLY if updating
        payload.device_id = formData.device_id || null;
        await updateComponentAPI(editingItemId, payload);
        Alert.alert('Success', 'Item updated successfully!');
      } else {
        await createComponentAPI(payload);
        Alert.alert('Success', 'Item created successfully!');
      }
      setModalVisible(false);
      fetchInventory();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save item');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const searchString = `${item.category} ${item.vendor} ${item.device_id}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    
    const isAssigned = !!item.device_id || !!item.box_id || item.status === 'Assigned';
    let matchesFilter = true;
    
    if (assignmentFilter === 'Assigned') {
      matchesFilter = isAssigned;
    } else if (assignmentFilter === 'Unassigned') {
      matchesFilter = !isAssigned;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterTab, assignmentFilter === 'All' && styles.filterTabActive]} 
          onPress={() => setAssignmentFilter('All')}
        >
          <Text style={[styles.filterTabText, assignmentFilter === 'All' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, assignmentFilter === 'Assigned' && styles.filterTabActive]} 
          onPress={() => setAssignmentFilter('Assigned')}
        >
          <Text style={[styles.filterTabText, assignmentFilter === 'Assigned' && styles.filterTabTextActive]}>Assigned</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, assignmentFilter === 'Unassigned' && styles.filterTabActive]} 
          onPress={() => setAssignmentFilter('Unassigned')}
        >
          <Text style={[styles.filterTabText, assignmentFilter === 'Unassigned' && styles.filterTabTextActive]}>Unassigned</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.listSection}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#3182ce" style={{ marginTop: 20 }} />
        ) : filteredInventory.length === 0 ? (
          <Text style={styles.emptyText}>No inventory found.</Text>
        ) : (
          <ScrollView>
            {filteredInventory.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.category} - {item.vendor}</Text>
                  <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : styles.statusInactive]}>
                    <Text style={styles.statusText}>{item.status || 'Unknown'}</Text>
                  </View>
                </View>
                {/* <Text style={styles.cardDesc}><Text style={styles.bold}>Device ID:</Text> {item.device_id || 'Not Assigned'}</Text> */}
                <Text style={styles.cardDesc}><Text style={styles.bold}>Invoice:</Text> {item.invoice_number}</Text>
                <Text style={styles.cardDesc}><Text style={styles.bold}>Purchase Date:</Text> {item.purchase_date} ({item.warranty_months} mo warranty)</Text>
                <Text style={styles.cardDesc}><Text style={styles.bold}>Notes:</Text> {item.notes}</Text>

                <View style={styles.actionRow}>
                  {(!item.device_id && !item.box_id && item.status !== 'Assigned') ? (
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#e6fffa' }]} onPress={() => openScannerModal(item.id)}>
                      {/* <Feather name="camera" size={18} color="#319795" /> */}
                      <MaterialCommunityIcons name="qrcode-scan" size={18} color="#222a29ff" />
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(item)}>
                      <Feather name="edit" size={18} color="#2b6cb0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#fff5f5', marginRight: 0 }]} onPress={() => handleDelete(item.id)}>
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
            <Text style={styles.modalTitle}>{editingItemId ? 'Edit Inventory' : 'Create Inventory'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            
            {/* Show Device ID ONLY in edit mode */}
            {editingItemId && (
              <View style={styles.inputFull}>
                <Text style={styles.label}>Device ID</Text>
                <TextInput style={styles.input} value={formData.device_id} onChangeText={(val) => handleInputChange('device_id', val)} placeholder="e.g. BUSGPS_NEW" />
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Category *</Text>
                <RNPickerSelect
                  onValueChange={(val) => handleInputChange('category', val)}
                  items={[
                    { label: 'Camera', value: 'camera' },
                    { label: 'GPS', value: 'gps' },
                    { label: 'Battery', value: 'battery' },
                    { label: 'Hotspot', value: 'hotspot' },
                    { label: 'Pi', value: 'pi' },
                    { label: 'ESP32', value: 'esp32' },
                  ]}
                  value={formData.category}
                  style={pickerSelectStyles}
                  placeholder={{ label: "Select Category...", value: "" }}
                  useNativeAndroidPickerStyle={false}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Vendor *</Text>
                <TextInput style={styles.input} value={formData.vendor} onChangeText={(val) => handleInputChange('vendor', val)} placeholder="e.g. Teltonika" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Purchase Date</Text>
                <TextInput style={styles.input} value={formData.purchase_date} onChangeText={(val) => handleInputChange('purchase_date', val)} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Warranty (Months)</Text>
                <TextInput style={styles.input} value={formData.warranty_months} onChangeText={(val) => handleInputChange('warranty_months', val)} placeholder="e.g. 24" keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Invoice Number</Text>
                <TextInput style={styles.input} value={formData.invoice_number} onChangeText={(val) => handleInputChange('invoice_number', val)} placeholder="e.g. INV-001" />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Status</Text>
                <TextInput style={styles.input} value={formData.status} onChangeText={(val) => handleInputChange('status', val)} placeholder="e.g. Active" />
              </View>
            </View>

            <View style={styles.inputFull}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={formData.notes} onChangeText={(val) => handleInputChange('notes', val)} placeholder="Additional notes..." multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Item</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Box Assign Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false} presentationStyle="fullScreen">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Box QR/Barcode</Text>
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
                <Text style={styles.scannerLoadingText}>Assigning to Box...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstruction}>
              Point the camera at the Box's QR code to assign this component to it.
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
    backgroundColor: '#38a169',
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#edf2f7',
    marginRight: 10,
  },
  filterTabActive: {
    backgroundColor: '#38a169',
  },
  filterTabText: {
    color: '#4a5568',
    fontWeight: '600',
    fontSize: 12,
  },
  filterTabTextActive: {
    color: '#fff',
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
    borderLeftColor: '#38a169',
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
    backgroundColor: '#fed7d7',
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
    backgroundColor: '#38a169',
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
