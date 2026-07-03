import React, { useState, useEffect, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  getAllTripsAPI,
  createTripAPI,
  patchTripAPI,
  deleteTripAPI,
} from "../utils/tripAPI";
import { getBusesAPI } from "../utils/storage";

// Helper: format ISO datetime string to a readable local string
const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

// Helper: build local ISO datetime string without timezone offset
const toLocalISOString = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

const formatPickerLabel = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${pad(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()}  ${pad(h12)}:${pad(date.getMinutes())} ${ampm}`;
};

const isOngoing = (trip) => !trip.end_datetime;

export default function Trip() {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [busList, setBusList] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [busFetchError, setBusFetchError] = useState(null);

  // ── Create modal ────────────────────────────────────────────────────────────
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [busNo, setBusNo] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── End Trip modal ──────────────────────────────────────────────────────────
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [endTrip, setEndTrip] = useState(null); // trip being ended
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // ── Delete loading per-trip ─────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState(null);

  // ── Fetch trips ────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getAllTripsAPI();
      setTrips(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to fetch trips");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips(true);
  };

  // ── Fetch buses ────────────────────────────────────────────────────────────
  const fetchBusList = useCallback(async () => {
    try {
      setLoadingBuses(true);
      setBusFetchError(null);

      const data = await getBusesAPI(); // array of bus objects from /bus-box-details
      setBusList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch bus list:", error);
      setBusFetchError("Could not load buses. Pull to retry.");
    } finally {
      setLoadingBuses(false);
    }
  }, []);

  useEffect(() => {
    fetchBusList();
  }, [fetchBusList]);

  // ── Open Create modal ────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setBusNo("");
    setStartDate(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
    setCreateModalVisible(true);
  };

  // ── Open End Trip modal (from card) ─────────────────────────────────────────
  const openEndModal = (trip) => {
    setEndTrip(trip);
    setEndDate(new Date());
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setEndModalVisible(true);
  };

  // ── Date/Time handlers – Create ─────────────────────────────────────────────
  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const merged = new Date(startDate);
    merged.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
    setStartDate(merged);
    if (Platform.OS === "android") setShowTimePicker(true);
  };

  const onTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const merged = new Date(startDate);
    merged.setHours(
      selected.getHours(),
      selected.getMinutes(),
      selected.getSeconds(),
    );
    setStartDate(merged);
  };

  // ── Date/Time handlers – End ────────────────────────────────────────────────
  const onEndDateChange = (event, selected) => {
    setShowEndDatePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const merged = new Date(endDate);
    merged.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
    setEndDate(merged);
    if (Platform.OS === "android") setShowEndTimePicker(true);
  };

  const onEndTimeChange = (event, selected) => {
    setShowEndTimePicker(false);
    if (event.type === "dismissed" || !selected) return;
    const merged = new Date(endDate);
    merged.setHours(
      selected.getHours(),
      selected.getMinutes(),
      selected.getSeconds(),
    );
    setEndDate(merged);
  };

  // ── Create Trip ──────────────────────────────────────────────────────────────
  const handleCreateTrip = async () => {
    const trimmedBus = busNo.trim();
    if (!trimmedBus) {
      Alert.alert("Validation Error", "Bus Number is required.");
      return;
    }
    setFormLoading(true);
    try {
      await createTripAPI({
        bus_no: trimmedBus,
        start_datetime: toLocalISOString(startDate),
      });
      Alert.alert("Success", "Trip created successfully!");
      setCreateModalVisible(false);
      fetchTrips();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to create trip");
    } finally {
      setFormLoading(false);
    }
  };

  // ── End Trip (PATCH) ─────────────────────────────────────────────────────────
  const handleEndTrip = async () => {
    if (!endTrip) return;
    setEndLoading(true);
    try {
      await patchTripAPI(endTrip.trip_id, toLocalISOString(endDate));
      Alert.alert("Success", `Trip for ${endTrip.bus_no} ended!`);
      setEndModalVisible(false);
      fetchTrips();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to end trip");
    } finally {
      setEndLoading(false);
    }
  };

  // ── Delete Trip ──────────────────────────────────────────────────────────────
  const handleDeleteTrip = (trip) => {
    Alert.alert(
      "Delete Trip",
      `Delete trip for bus ${trip.bus_no}?\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(trip.trip_id);
            try {
              await deleteTripAPI(trip.trip_id);
              fetchTrips(true);
            } catch (e) {
              Alert.alert("Error", e.message || "Failed to delete trip");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // ── Filtered trips ───────────────────────────────────────────────────────────
  const filteredTrips = trips.filter((t) =>
    t.bus_no?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const ongoingTrips = trips.filter(isOngoing);

  return (
    <View style={styles.container}>
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Bus No..."
          placeholderTextColor="#a0aec0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.btnText}>New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats bar ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{trips.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#e6fffa" }]}>
          <Text style={[styles.statValue, { color: "#319795" }]}>
            {ongoingTrips.length}
          </Text>
          <Text style={styles.statLabel}>Ongoing</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#ebf8ff" }]}>
          <Text style={[styles.statValue, { color: "#2b6cb0" }]}>
            {trips.filter((t) => !isOngoing(t)).length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* ── Trip list ── */}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#3182ce"
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3182ce"
            />
          }
        >
          {filteredTrips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="map" size={48} color="#cbd5e0" />
              <Text style={styles.emptyText}>No trips found.</Text>
              <Text style={styles.emptySubText}>
                Pull down to refresh or create a new trip.
              </Text>
            </View>
          ) : (
            filteredTrips.map((trip) => (
              <View key={trip.trip_id} style={styles.tripCard}>
                {/* Card header */}
                <View style={styles.tripCardHeader}>
                  <View style={styles.busInfoContainer}>
                    <View style={styles.busNoRow}>
                      <Feather
                        name="truck"
                        size={18}
                        color="#3b82f6"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.busNoText}>{trip.bus_no}</Text>
                    </View>
                    <Text style={styles.tripId} numberOfLines={1}>
                      ID: {trip.trip_id}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isOngoing(trip)
                        ? styles.badgeOngoing
                        : styles.badgeCompleted,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isOngoing(trip)
                            ? "#16a34a"
                            : "#64748b",
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isOngoing(trip) ? "#15803d" : "#475569" },
                      ]}
                    >
                      {isOngoing(trip) ? "Ongoing" : "Completed"}
                    </Text>
                  </View>
                </View>

                {/* Card Body - Timeline */}
                <View style={styles.cardBody}>
                  <View style={styles.timelineContainer}>
                    
                    {/* Start Time */}
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineLine} />
                      <View style={styles.timelineIconContainer}>
                        <Feather name="play-circle" size={20} color="#3b82f6" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Started</Text>
                        <Text style={styles.timelineValue}>
                          {formatDateTime(trip.start_datetime)}
                        </Text>
                      </View>
                    </View>

                    {/* End Time */}
                    <View style={[styles.timelineItem, { marginBottom: 0 }]}>
                      <View style={styles.timelineIconContainer}>
                        <Feather name={isOngoing(trip) ? "clock" : "check-circle"} size={20} color={isOngoing(trip) ? "#f59e0b" : "#10b981"} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Ended</Text>
                        <Text
                          style={[
                            styles.timelineValue,
                            isOngoing(trip) && {
                              color: "#f59e0b",
                              fontStyle: "italic",
                            },
                          ]}
                        >
                          {isOngoing(trip)
                            ? "In progress..."
                            : formatDateTime(trip.end_datetime)}
                        </Text>
                      </View>
                    </View>

                  </View>
                </View>

                {/* ── Card action buttons ── */}
                <View style={styles.cardActions}>
                  {/* Delete button */}
                  <TouchableOpacity
                    style={[
                      styles.cardBtnDelete,
                      deletingId === trip.trip_id && { opacity: 0.5 },
                    ]}
                    onPress={() => handleDeleteTrip(trip)}
                    disabled={deletingId === trip.trip_id}
                  >
                    {deletingId === trip.trip_id ? (
                      <ActivityIndicator size="small" color="#475569" />
                    ) : (
                      <>
                        <Feather
                          name="trash-2"
                          size={15}
                          color="#475569"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.cardBtnTextDelete}>Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* End button */}
                  {isOngoing(trip) && (
                    <TouchableOpacity
                      style={styles.cardBtnEnd}
                      onPress={() => openEndModal(trip)}
                    >
                      <Feather
                        name="stop-circle"
                        size={15}
                        color="#fff"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.cardBtnText}>End Trip</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CREATE TRIP MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Trip</Text>
            <TouchableOpacity
              onPress={() => setCreateModalVisible(false)}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>
              Select Bus <Text style={styles.required}>*</Text>
            </Text>

            {loadingBuses ? (
              <View style={styles.input}>
                <ActivityIndicator size="small" color="#a0aec0" />
              </View>
            ) : busFetchError ? (
              <TouchableOpacity onPress={fetchBusList}>
                <Text style={styles.errorText}>{busFetchError}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={busNo}
                  onValueChange={(itemValue) => setBusNo(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a bus" value="" color="#a0aec0" />
                  {busList.map((bus, index) => (
                    <Picker.Item
                      key={bus.id ?? index}
                      label={bus.bus_no}
                      value={bus.bus_no}
                    />
                  ))}
                </Picker>
              </View>
            )}

            <Text style={styles.label}>
              Start Date &amp; Time <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.datetimePreview}>
              <Feather
                name="calendar"
                size={16}
                color="#3182ce"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.datetimePreviewText}>
                {formatPickerLabel(startDate)}
              </Text>
            </View>
            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setShowTimePicker(false);
                  setShowDatePicker(true);
                }}
              >
                <Feather
                  name="calendar"
                  size={15}
                  color="#3182ce"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.pickerButtonText}>Pick Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerButton, { marginLeft: 12 }]}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(true);
                }}
              >
                <Feather
                  name="clock"
                  size={15}
                  color="#3182ce"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.pickerButtonText}>Pick Time</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              Will send: {toLocalISOString(startDate)}
            </Text>

            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
              />
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                formLoading && styles.saveButtonDisabled,
              ]}
              onPress={handleCreateTrip}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="check-circle"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.saveButtonText}>Create Trip</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          END TRIP MODAL  (PATCH)
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={endModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalHeader, { borderBottomColor: "#fed7d7" }]}>
            <View>
              <Text style={styles.modalTitle}>End Trip</Text>
              {endTrip && (
                <Text style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>
                  Bus:{" "}
                  <Text style={{ fontWeight: "700", color: "#e53e3e" }}>
                    {endTrip.bus_no}
                  </Text>
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setEndModalVisible(false)}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Trip info summary */}
            {endTrip && (
              <View style={styles.infoBanner}>
                <Feather
                  name="info"
                  size={14}
                  color="#2b6cb0"
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerText}>
                    Trip ID: {endTrip.trip_id}
                  </Text>
                  <Text style={styles.infoBannerText}>
                    Started: {formatDateTime(endTrip.start_datetime)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.label}>
              End Date &amp; Time <Text style={styles.required}>*</Text>
            </Text>

            <View
              style={[
                styles.datetimePreview,
                { backgroundColor: "#fff5f5", borderColor: "#fed7d7" },
              ]}
            >
              <Feather
                name="calendar"
                size={16}
                color="#e53e3e"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.datetimePreviewText, { color: "#c53030" }]}>
                {formatPickerLabel(endDate)}
              </Text>
            </View>

            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={[styles.pickerButton, { borderColor: "#e53e3e" }]}
                onPress={() => {
                  setShowEndTimePicker(false);
                  setShowEndDatePicker(true);
                }}
              >
                <Feather
                  name="calendar"
                  size={15}
                  color="#e53e3e"
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.pickerButtonText, { color: "#e53e3e" }]}>
                  Pick Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { marginLeft: 12, borderColor: "#e53e3e" },
                ]}
                onPress={() => {
                  setShowEndDatePicker(false);
                  setShowEndTimePicker(true);
                }}
              >
                <Feather
                  name="clock"
                  size={15}
                  color="#e53e3e"
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.pickerButtonText, { color: "#e53e3e" }]}>
                  Pick Time
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              Will send: {toLocalISOString(endDate)}
            </Text>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onEndDateChange}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onEndTimeChange}
              />
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: "#e53e3e" },
                endLoading && { backgroundColor: "#fc8181" },
              ]}
              onPress={handleEndTrip}
              disabled={endLoading}
            >
              {endLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="stop-circle"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.saveButtonText}>Confirm End Trip</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa", padding: 16 },

  // ── Header ──
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#2d3748",
    marginRight: 10,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3182ce",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", marginLeft: 6, fontSize: 14 },

  // ── Stats ──
  statsRow: { flexDirection: "row", marginBottom: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "bold", color: "#2d3748" },
  statLabel: { fontSize: 11, color: "#718096", marginTop: 2 },

  // ── Empty ──
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyText: {
    fontSize: 18,
    color: "#a0aec0",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 13,
    color: "#cbd5e0",
    marginTop: 6,
    textAlign: "center",
  },

  // ── Trip Card ──
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tripCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  busInfoContainer: { flex: 1 },
  busNoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  busNoText: { fontSize: 18, fontWeight: "800", color: "#0f172a", letterSpacing: 0.5 },
  tripId: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 13,
    marginBottom: 8,
    textDecorationLine: "underline",
  },
  badgeOngoing: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#bbf7d0" },
  badgeCompleted: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  
  cardBody: { padding: 16 },
  timelineContainer: { paddingLeft: 8 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, position: "relative" },
  timelineIconContainer: { 
    width: 24, 
    alignItems: "center", 
    marginRight: 12, 
    zIndex: 2, 
    backgroundColor: "#fff" 
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: "#e2e8f0",
    zIndex: 1,
  },
  timelineContent: { flex: 1, paddingTop: 1 },
  timelineLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  timelineValue: { fontSize: 14, color: "#0f172a", fontWeight: "500" },

  // ── Card action buttons ──
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  cardBtnEnd: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cardBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cardBtnTextDelete: { color: "#475569", fontSize: 13, fontWeight: "700" },

  // ── Modal ──
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#2d3748" },
  closeModalBtn: { padding: 8 },
  closeModalText: { color: "#e53e3e", fontWeight: "600", fontSize: 15 },
  formContainer: { padding: 24, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontSize: 14, fontWeight: "600", color: "#4a5568", marginBottom: 6 },
  required: { color: "#e53e3e" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#f8fafc",
    color: "#2d3748",
    marginBottom: 6,
  },
  hintText: { fontSize: 11, color: "#a0aec0", marginBottom: 20 },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3182ce",
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: "#90cdf4" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  datetimePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ebf8ff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bee3f8",
  },
  datetimePreviewText: { fontSize: 15, fontWeight: "600", color: "#2b6cb0" },
  pickerRow: { flexDirection: "row", marginBottom: 8 },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#3182ce",
    borderRadius: 10,
    paddingVertical: 11,
  },
  pickerButtonText: { color: "#3182ce", fontWeight: "600", fontSize: 14 },

  // ── Info banner (End modal) ──
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ebf8ff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bee3f8",
  },
  infoBannerText: { fontSize: 12, color: "#2b6cb0", lineHeight: 18 },
});
