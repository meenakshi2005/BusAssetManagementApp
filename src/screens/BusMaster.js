import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  getBusesAPI,
  createBusAPI,
  updateBusAPI,
  deleteBusAPI,
  assignBoxToBusAPI,
  unassignBoxFromBusAPI, // ADD THIS
} from "../utils/storage";

export default function BusMaster() {
  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("ALL"); // 'ALL', 'ACTIVE', 'INACTIVE'

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [assigningBusId, setAssigningBusId] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const initialFormState = {
    bus_no: "",
    route: "",
    departure_time: "",
    arrival_time: "",
    kms: "",
    driver_1: "",
    driver_2: "",
    conductor_1: "",
    conductor_2: "",
    reliever_1: "",
    reliever_2: "",
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
      Alert.alert("Error", "Failed to fetch buses");
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
      bus_no: bus.bus_no || "",
      route: bus.route || "",
      departure_time: bus.departure_time || "",
      arrival_time: bus.arrival_time || "",
      kms: bus.kms ? bus.kms.toString() : "",
      driver_1: bus.driver_1 || "",
      driver_2: bus.driver_2 || "",
      conductor_1: bus.conductor_1 || "",
      conductor_2: bus.conductor_2 || "",
      reliever_1: bus.reliever_1 || "",
      reliever_2: bus.reliever_2 || "",
      is_active: bus.is_active === 1 || bus.is_active === true,
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this bus?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await deleteBusAPI(id);
            Alert.alert("Success", "Bus successfully deleted!");
            fetchBusesList();
          } catch (e) {
            Alert.alert("Error", "Failed to delete bus");
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleUnassignBox = (boxId, busNo) => {
    Alert.alert(
      "Unassign Box",
      `Are you sure you want to unassign box "${boxId}" from bus ${busNo}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await unassignBoxFromBusAPI(boxId);
              Alert.alert("Success", "Box unassigned from bus successfully.");
              fetchBusesList();
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to unassign box");
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSaveBus = async () => {
    if (!formData.bus_no || !formData.route) {
      Alert.alert("Validation Error", "Bus Number and Route are required.");
      return;
    }

    setFormLoading(true);
    try {
      if (editingBusId) {
        await updateBusAPI(editingBusId, formData);
        Alert.alert("Success", "Bus successfully updated!");
      } else {
        // Validate unique bus number (guard against buses missing bus_no)
        const existing = buses.find(
          (b) =>
            b.bus_no &&
            b.bus_no.toLowerCase() === formData.bus_no.toLowerCase(),
        );
        if (existing) {
          Alert.alert("Error", "Bus number already exists!");
          setFormLoading(false);
          return;
        }
        await createBusAPI(formData);
        Alert.alert("Success", "Bus successfully created!");
      }
      setModalVisible(false);
      fetchBusesList();
    } catch (e) {
      Alert.alert(
        "Error",
        e.message || `Failed to ${editingBusId ? "update" : "create"} bus`,
      );
    } finally {
      setFormLoading(false);
    }
  };

  const openDeviceModal = async (bus) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission required",
          "Camera permission is required to scan the device QR code.",
        );
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
      Alert.alert("Success", "Box assigned to bus successfully.");
      setScannerVisible(false);
      fetchBusesList();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to assign box");
    } finally {
      setDeviceLoading(false);
    }
  };

  // Filter and Search logic (guard against missing bus_no)
  const filteredBuses = buses.filter((bus) => {
    const matchesSearch =
      bus.bus_no &&
      bus.bus_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterActive === "ALL" ||
      (filterActive === "ACTIVE" &&
        (bus.is_active === 1 || bus.is_active === true)) ||
      (filterActive === "INACTIVE" &&
        (bus.is_active === 0 || bus.is_active === false));
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
        {["ALL", "ACTIVE", "INACTIVE"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              filterActive === f && styles.filterBtnActive,
            ]}
            onPress={() => setFilterActive(f)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filterActive === f && styles.filterBtnTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bus List */}
      <View style={styles.listSection}>
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#3182ce"
            style={{ marginTop: 20 }}
          />
        ) : filteredBuses.length === 0 ? (
          <Text style={styles.emptyText}>No buses found.</Text>
        ) : (
          <ScrollView>
            {filteredBuses.map((bus) => (
              <View key={bus.bus_no} style={styles.busCard}>
                {/* Header */}
                <View style={styles.busCardHeader}>
                  <Text style={styles.busCardTitle}>{bus.bus_no}</Text>
                </View>

                {/* Info Rows */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Route</Text>
                    <Text style={styles.infoVal}>{bus.route}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Timing</Text>
                    <Text style={styles.infoVal}>
                      {bus.departure_time} – {bus.arrival_time}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>KMs</Text>
                    <Text style={styles.infoVal}>{bus.kms}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Drivers</Text>
                    <Text style={styles.infoVal}>
                      {bus.driver_1}
                      {bus.driver_2 ? ` / ${bus.driver_2}` : ""}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Conductors</Text>
                    <Text style={styles.infoVal}>
                      {bus.conductor_1}
                      {bus.conductor_2 ? ` / ${bus.conductor_2}` : ""}
                    </Text>
                  </View>
                  {(bus.reliever_1 || bus.reliever_2) && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Relievers</Text>
                      <Text style={styles.infoVal}>
                        {bus.reliever_1}
                        {bus.reliever_2 ? ` / ${bus.reliever_2}` : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Box Chips */}
                {(bus.pi_box?.assigned === true ||
                  bus.pi_box?.assigned === "true" ||
                  bus.sensor_box?.assigned === true ||
                  bus.sensor_box?.assigned === "true") && (
                  <View style={styles.chipRow}>
                    {(bus.pi_box?.assigned === true ||
                      bus.pi_box?.assigned === "true") && (
                      <View style={styles.boxChip}>
                        <Feather name="cpu" size={11} color="#2b6cb0" />
                        <Text style={styles.boxChipText}>
                          Pi: {bus.pi_box?.box_id?.slice(0, 8) || "N/A"}…
                        </Text>
                      </View>
                    )}
                    {(bus.sensor_box?.assigned === true ||
                      bus.sensor_box?.assigned === "true") && (
                      <View style={styles.boxChip}>
                        <Feather name="radio" size={11} color="#2b6cb0" />
                        <Text style={styles.boxChipText}>
                          Sensor: {bus.sensor_box?.box_id?.slice(0, 8) || "N/A"}…
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <View style={styles.boxActionsGrid}>
                    {/* Pi Box Column */}
                    <View style={styles.boxGroup}>
                      <Text style={styles.boxGroupLabel}>PI BOX</Text>
                      {!(
                        bus.pi_box?.assigned === true ||
                        bus.pi_box?.assigned === "true"
                      ) ? (
                        <TouchableOpacity
                          style={[styles.actBtn, styles.btnAssign]}
                          onPress={() => openDeviceModal(bus)}
                        >
                          <Feather name="cpu" size={13} color="#234e52" />
                          <Text
                            style={[styles.actBtnText, { color: "#234e52" }]}
                          >
                            Assign Pi Box
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actBtn, styles.btnUnassign]}
                          onPress={() =>
                            handleUnassignBox(bus.pi_box?.box_id, bus.bus_no)
                          }
                        >
                          <Feather name="x-circle" size={13} color="#742a2a" />
                          <Text
                            style={[styles.actBtnText, { color: "#742a2a" }]}
                          >
                            Remove Box
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Sensor Box Column */}
                    <View style={styles.boxGroup}>
                      <Text style={styles.boxGroupLabel}>SENSOR BOX</Text>
                      {!(
                        bus.sensor_box?.assigned === true ||
                        bus.sensor_box?.assigned === "true"
                      ) ? (
                        <TouchableOpacity
                          style={[styles.actBtn, styles.btnAssign]}
                          onPress={() => openDeviceModal(bus)}
                        >
                          <Feather name="radio" size={13} color="#234e52" />
                          <Text
                            style={[styles.actBtnText, { color: "#234e52" }]}
                          >
                            Assign Sensor
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actBtn, styles.btnUnassign]}
                          onPress={() =>
                            handleUnassignBox(
                              bus.sensor_box?.box_id,
                              bus.bus_no,
                            )
                          }
                        >
                          <Feather name="x-circle" size={13} color="#742a2a" />
                          <Text
                            style={[styles.actBtnText, { color: "#742a2a" }]}
                          >
                            Remove Box
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Edit / Delete */}
                  <View style={styles.editDelRow}>
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.iconBtnEdit]}
                      onPress={() => openEditModal(bus)}
                    >
                      <Feather name="edit" size={17} color="#2b6cb0" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.iconBtnDel]}
                      onPress={() => handleDelete(bus.bus_no)}
                    >
                      <Feather name="trash-2" size={17} color="#e53e3e" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBusId ? "Edit Bus" : "Create Bus"}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Bus Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bus_no}
                  onChangeText={(val) => handleInputChange("bus_no", val)}
                  placeholder="e.g. BUS-01"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Route *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.route}
                  onChangeText={(val) => handleInputChange("route", val)}
                  placeholder="e.g. A to B"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Departure Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.departure_time}
                  onChangeText={(val) =>
                    handleInputChange("departure_time", val)
                  }
                  placeholder="HH:MM"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Arrival Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.arrival_time}
                  onChangeText={(val) => handleInputChange("arrival_time", val)}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <Text style={styles.label}>Total KMs</Text>
            <TextInput
              style={styles.input}
              value={formData.kms}
              onChangeText={(val) => handleInputChange("kms", val)}
              placeholder="e.g. 150"
              keyboardType="numeric"
            />

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Driver 1</Text>
                <TextInput
                  style={styles.input}
                  value={formData.driver_1}
                  onChangeText={(val) => handleInputChange("driver_1", val)}
                  placeholder="Name"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Driver 2</Text>
                <TextInput
                  style={styles.input}
                  value={formData.driver_2}
                  onChangeText={(val) => handleInputChange("driver_2", val)}
                  placeholder="Name"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Conductor 1</Text>
                <TextInput
                  style={styles.input}
                  value={formData.conductor_1}
                  onChangeText={(val) => handleInputChange("conductor_1", val)}
                  placeholder="Name"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Conductor 2</Text>
                <TextInput
                  style={styles.input}
                  value={formData.conductor_2}
                  onChangeText={(val) => handleInputChange("conductor_2", val)}
                  placeholder="Name"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reliever 1</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reliever_1}
                  onChangeText={(val) => handleInputChange("reliever_1", val)}
                  placeholder="Name"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>Reliever 2</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reliever_2}
                  onChangeText={(val) => handleInputChange("reliever_2", val)}
                  placeholder="Name"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Active Status</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(val) => handleInputChange("is_active", val)}
                trackColor={{ false: "#cbd5e0", true: "#48bb78" }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveBus}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Bus</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Device Assign Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR/Barcode</Text>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              style={styles.closeScannerBtn}
            >
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraWrapper}>
            {scannerVisible && permission?.granted && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={
                  deviceLoading ? undefined : handleBarcodeScanned
                }
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "qr",
                    "ean13",
                    "ean8",
                    "code128",
                    "code39",
                    "upc_e",
                  ],
                }}
              />
            )}
            <View style={styles.scannerTargetBox} />
            {deviceLoading && (
              <View style={styles.scannerLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scannerLoadingText}>
                  Assigning Device...
                </Text>
              </View>
            )}
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstruction}>
              Point the camera at the Box's QR code to automatically assign it
              to Bus {assigningBusId}.
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
    backgroundColor: "#f5f7fa",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  createButton: {
    backgroundColor: "#3182ce",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  filterLabel: {
    fontWeight: "600",
    color: "#4a5568",
    marginRight: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#edf2f7",
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: "#3182ce",
  },
  filterBtnText: {
    fontSize: 12,
    color: "#4a5568",
  },
  filterBtnTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  listSection: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#a0aec0",
    marginTop: 40,
    fontSize: 16,
  },
  // Card container
  busCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    overflow: "hidden",
  },

  // Card header
  busCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  busCardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a202c",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#c6f6d5",
  },
  statusInactive: {
    backgroundColor: "#fed7d7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Info rows
  infoGrid: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#718096",
    width: 80,
    flexShrink: 0,
  },
  infoVal: {
    fontSize: 13,
    color: "#2d3748",
    flex: 1,
  },

  // Box chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  boxChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ebf8ff",
    borderWidth: 0.5,
    borderColor: "#bee3f8",
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  boxChipText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#2b6cb0",
  },

  // Divider
  cardDivider: {
    height: 0.5,
    backgroundColor: "#e2e8f0",
  },

  // Action area
  cardActions: {
    padding: 12,
  },
  boxActionsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  boxGroup: {
    flex: 1,
    gap: 6,
  },
  boxGroupLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#a0aec0",
    letterSpacing: 0.5,
    paddingHorizontal: 2,
  },
  actBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  actBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  btnAssign: {
    backgroundColor: "#e6fffa",
    borderColor: "#81e6d9",
  },
  btnReassign: {
    backgroundColor: "#ebf8ff",
    borderColor: "#bee3f8",
  },
  btnUnassign: {
    backgroundColor: "#fff5f5",
    borderColor: "#fed7d7",
  },

  // Edit / Delete row
  editDelRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnEdit: {
    backgroundColor: "#ebf8ff",
    borderColor: "#bee3f8",
  },
  iconBtnDel: {
    backgroundColor: "#fff5f5",
    borderColor: "#fed7d7",
  },
  busCardDesc: {
    fontSize: 14,
    color: "#4a5568",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "600",
    color: "#2d3748",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf2f7",
    paddingTop: 12,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ebf8ff",
    borderRadius: 8,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontWeight: "600",
    color: "#2b6cb0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d3748",
  },
  closeModalBtn: {
    padding: 8,
  },
  closeModalText: {
    color: "#e53e3e",
    fontWeight: "600",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#1a202c",
    zIndex: 10,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeScannerBtn: {
    padding: 8,
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  scannerTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#48bb78",
    backgroundColor: "transparent",
    borderRadius: 16,
  },
  scannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerLoadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "bold",
  },
  scannerFooter: {
    padding: 30,
    backgroundColor: "#1a202c",
    alignItems: "center",
  },
  scannerInstruction: {
    color: "#a0aec0",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  formContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  inputHalf: {
    width: "48%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#2d3748",
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: "#3182ce",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});