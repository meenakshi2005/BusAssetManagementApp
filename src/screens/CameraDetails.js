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
import { Feather } from '@expo/vector-icons';
import {
  getCamerasAPI,
  createCameraAPI,
  updateCameraAPI,
  deleteCameraAPI,
} from '../utils/storage';

const ACCENT = '#e99124';

const initialFormState = {
  camera_id: '',
  ip: '',
  port: '',
  user: 'Admin',
  password: '',
  stream: '',
};

export default function CameraDetails() {
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null); // camera_id being edited
  const [formData, setFormData] = useState(initialFormState);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    setIsLoading(true);
    try {
      const data = await getCamerasAPI();
      setCameras(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch cameras.');
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowPassword(false);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.camera_id);
    setFormData({
      camera_id: item.camera_id || '',
      ip: item.ip || '',
      port: item.port ? String(item.port) : '',
      user: item.user || '',
      password: item.password || '',
      stream: item.stream || '',
    });
    setShowPassword(false);
    setModalVisible(true);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { camera_id, ip, port, user, password, stream } = formData;
    if (!camera_id.trim() || !ip.trim() || !port.trim() || !user.trim() || !password.trim() || !stream.trim()) {
      Alert.alert('Validation', 'All fields are required.');
      return;
    }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      Alert.alert('Validation', 'Port must be a valid number (1–65535).');
      return;
    }
    const payload = { camera_id: camera_id.trim(), ip: ip.trim(), port: portNum, user: user.trim(), password, stream: stream.trim() };

    setFormLoading(true);
    try {
      if (editingId) {
        await updateCameraAPI(editingId, payload);
        Alert.alert('Success', 'Camera updated successfully.');
      } else {
        await createCameraAPI(payload);
        Alert.alert('Success', 'Camera created successfully.');
      }
      setModalVisible(false);
      fetchCameras();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save camera.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (camera_id) => {
    Alert.alert('Confirm Delete', `Delete camera "${camera_id}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCameraAPI(camera_id);
            Alert.alert('Success', 'Camera deleted.');
            fetchCameras();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete camera.');
          }
        },
      },
    ]);
  };

  const filtered = cameras.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.camera_id || '').toLowerCase().includes(q) ||
      (c.ip || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📷 Camera Master</Text>
          <Text style={styles.headerSubtitle}>{cameras.length} camera{cameras.length !== 1 ? 's' : ''} registered</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#a0aec0" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Camera ID or IP..."
          placeholderTextColor="#a0aec0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={16} color="#a0aec0" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading cameras...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="camera-off" size={48} color="#cbd5e0" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No cameras match your search.' : 'No cameras found. Tap "+ Add" to create one.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filtered.map((item) => (
            <CameraCard
              key={item.camera_id}
              item={item}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDelete(item.camera_id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Create / Edit Modal — compact, fixed layout, no inner scrolling */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Camera' : 'Create Camera'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {/* Form fields — scrollable so it never gets cut off, header/button stay fixed */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Camera ID — full width */}
              <FormField
                compact
                label="Camera ID"
                placeholder="e.g. CAM-001"
                value={formData.camera_id}
                onChangeText={(v) => handleInputChange('camera_id', v)}
                editable={!editingId}
              />

              {/* IP + Port on one row */}
              <View style={styles.fieldRow}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <FormField
                    compact
                    label="IP Address"
                    placeholder="192.168.1.100"
                    value={formData.ip}
                    onChangeText={(v) => handleInputChange('ip', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    compact
                    label="Port"
                    placeholder="5543"
                    value={formData.port}
                    onChangeText={(v) => handleInputChange('port', v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Username + Password on one row */}
              <View style={styles.fieldRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormField
                    compact
                    label="Username"
                    placeholder="admin"
                    value={formData.user}
                    onChangeText={(v) => handleInputChange('user', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.fieldInput, styles.compactInput, { flex: 1, borderWidth: 0, marginBottom: 0 }]}
                      placeholder="Password"
                      placeholderTextColor="#a0aec0"
                      value={formData.password}
                      onChangeText={(v) => handleInputChange('password', v)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Stream Path — full width */}
              <FormField
                compact
                label="Stream Path"
                placeholder="e.g. /live/channel1"
                value={formData.stream}
                onChangeText={(v) => handleInputChange('stream', v)}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, formLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{editingId ? 'Update Camera' : 'Create Camera'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ─── Camera Card ─────────────────────────────────────── */
function CameraCard({ item, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={styles.badgeContainer}>
            <Feather name="camera" size={14} color={ACCENT} />
            <Text style={styles.badgeText}>{item.camera_id}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
              <Feather name="edit-2" size={16} color="#3182ce" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={onDelete}>
              <Feather name="trash-2" size={16} color="#e53e3e" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Feather name="wifi" size={13} color="#718096" />
          <Text style={styles.detailText}>{item.ip}:{item.port}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="user" size={13} color="#718096" />
          <Text style={styles.detailText}>{item.user}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="video" size={13} color="#718096" />
          <Text style={styles.detailText} numberOfLines={1}>{item.stream}</Text>
        </View>
        {item.created_at && (
          <Text style={styles.timestampText}>
            Created: {new Date(item.created_at).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
}

/* ─── Reusable Form Field ─────────────────────────────── */
function FormField({ label, placeholder, value, onChangeText, keyboardType = 'default', editable = true, compact = false }) {
  return (
    <View style={[styles.fieldWrapper, compact && styles.fieldWrapperCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, compact && styles.compactInput, !editable && styles.fieldInputDisabled]}
        placeholder={placeholder}
        placeholderTextColor="#a0aec0"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2d3748' },
  headerSubtitle: { fontSize: 13, color: '#718096', marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#2d3748' },

  // List
  listContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#718096', fontSize: 14 },
  emptyText: { marginTop: 14, color: '#a0aec0', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardAccent: { width: 5, backgroundColor: ACCENT },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  badgeText: { fontWeight: '700', color: ACCENT, fontSize: 13 },
  cardActions: { flexDirection: 'row' },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  detailText: { fontSize: 13, color: '#4a5568', flex: 1 },
  timestampText: { fontSize: 11, color: '#a0aec0', marginTop: 8 },

  // Modal — opens from the top, sized to content, no inner ScrollView needed
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2d3748' },

  // Form
  formScroll: { flexGrow: 0 },
  formScrollContent: { paddingBottom: 4 },
  fieldRow: { flexDirection: 'row' },
  fieldWrapper: { marginBottom: 14 },
  fieldWrapperCompact: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4a5568', marginBottom: 5 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#2d3748',
    backgroundColor: '#f7fafc',
  },
  compactInput: { paddingVertical: 9, fontSize: 13.5 },
  fieldInputDisabled: { backgroundColor: '#edf2f7', color: '#a0aec0' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    backgroundColor: '#f7fafc',
    paddingHorizontal: 12,
  },
  eyeBtn: { padding: 4 },

  // Submit
  submitButton: {
    backgroundColor: ACCENT,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});