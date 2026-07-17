import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import { Picker } from "@react-native-picker/picker";
import { getGPSTrackingLogsAPI } from "../utils/tripAPI";
import { getBusesAPI } from "../utils/storage";

const PAGE_LIMIT = 1000;

// Default fallback region (India center) shown when GPS coordinates are null
const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

const GPSTracking = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [gpsRecordCount, setGpsRecordCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);

  const mapRef = useRef(null);
  const currentRegionRef = useRef(DEFAULT_REGION);
  // Mirrors `loading` for use inside fetchLogs without adding it as a dependency
  const loadingRef = useRef(false);

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    setLogs([]);
    setCurrentOffset(0);
    setTotalCount(0);
    setGpsRecordCount(0);
    setHasMore(true);
    fetchLogs(0, selectedBus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBus]);

  const fetchBuses = async () => {
    try {
      const busList = await getBusesAPI();
      setBuses(busList || []);
    } catch (error) {
      console.log("Error fetching buses", error);
    }
  };

  const fetchLogs = async (offset = 0, currentBus = selectedBus) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    if (offset === 0) setMapLoading(true);

    try {
      const response = await getGPSTrackingLogsAPI(
        PAGE_LIMIT,
        offset,
        "",
        currentBus,
      );
      if (response && response.logs) {
        const newLogs = response.logs;
        setLogs((prev) =>
          offset === 0 ? newLogs : [...prev, ...newLogs],
        );

        setTotalCount(response.count || 0);
        setGpsRecordCount(response.gps_records || 0);

        const nextOffset = offset + newLogs.length;
        setCurrentOffset(nextOffset);
        setHasMore(newLogs.length >= PAGE_LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to fetch GPS logs");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setMapLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingRef.current) {
      fetchLogs(currentOffset);
    }
  };

  const renderLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logRow}>
        <Text style={styles.logLabel}>📡 GPS Time:</Text>
        <Text style={styles.logValue}>
          {item.gps_timestamp
            ? new Date(item.gps_timestamp).toLocaleString()
            : "—"}
        </Text>
      </View>

      <View style={styles.logDivider} />

      <View style={styles.logRow}>
        <Text style={styles.logLabel}>📍 Location:</Text>
        <Text
          style={[styles.logValue, item.latitude == null && styles.nullValue]}
        >
          {item.latitude != null && item.longitude != null
            ? `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}`
            : "GPS fix not acquired"}
        </Text>
      </View>

      <View style={styles.logRowGroup}>
        <View style={styles.logBadge}>
          <Text style={styles.logBadgeLabel}>Speed</Text>
          <Text style={styles.logBadgeValue}>
            {item.speed_kmh != null
              ? `${Number(item.speed_kmh).toFixed(2)} km/h`
              : `${item.speed ?? "—"} km/h`}
          </Text>
        </View>
        <View style={styles.logBadge}>
          <Text style={styles.logBadgeLabel}>Heading</Text>
          <Text style={styles.logBadgeValue}>
            {item.heading_deg != null
              ? `${Number(item.heading_deg).toFixed(1)}°`
              : `${item.heading ?? "—"}°`}
          </Text>
        </View>
        <View style={[styles.logBadge, styles.logBadgeTopic]}>
          <Text style={styles.logBadgeLabel}>Topic</Text>
          <Text
            style={[styles.logBadgeValue, styles.logBadgeTopicText]}
            numberOfLines={1}
          >
            {item.topic ? item.topic.split("/").pop() : "—"}
          </Text>
        </View>
      </View>
    </View>
  );

  // Extract coordinates for Polyline, filter out null lat/lng
  const coordinates = logs
    .filter(
      (log) =>
        log.latitude != null &&
        log.longitude != null &&
        !isNaN(Number(log.latitude)) &&
        !isNaN(Number(log.longitude)),
    )
    .map((log) => ({
      latitude: Number(log.latitude),
      longitude: Number(log.longitude),
    }))
    .reverse();

  const hasCoordinates = coordinates.length > 0;
  const nullCoordCount = logs.length - coordinates.length;

  // When GPS data loads, animate map to the latest coordinate
  useEffect(() => {
    if (hasCoordinates) {
      const newRegion = {
        latitude: coordinates[coordinates.length - 1].latitude,
        longitude: coordinates[coordinates.length - 1].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      currentRegionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  const zoomIn = () => {
    const r = currentRegionRef.current;
    const newRegion = {
      ...r,
      latitudeDelta: r.latitudeDelta / 2,
      longitudeDelta: r.longitudeDelta / 2,
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const zoomOut = () => {
    const r = currentRegionRef.current;
    const newRegion = {
      ...r,
      latitudeDelta: Math.min(r.latitudeDelta * 2, 150),
      longitudeDelta: Math.min(r.longitudeDelta * 2, 150),
    };
    currentRegionRef.current = newRegion;
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const fitRoute = () => {
    if (hasCoordinates && mapRef.current) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  };

  const getMapStatusText = () => {
    if (mapLoading) return null;
    if (logs.length === 0) return "No GPS logs received from server.";
    if (!hasCoordinates) {
      return `${nullCoordCount} log${nullCoordCount !== 1 ? "s" : ""} received — GPS fix not yet acquired (lat/lng null).`;
    }
    return null;
  };

  const mapStatusText = getMapStatusText();

  return (
    <View style={styles.container}>
      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Select Bus:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedBus}
            onValueChange={(itemValue) => setSelectedBus(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="All Buses" value="" />
            {buses.map((bus, idx) => (
              <Picker.Item
                key={bus.id ?? bus.bus_no ?? idx}
                label={bus.bus_no || bus.id || `Bus ${idx}`}
                value={bus.bus_no || bus.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        {mapLoading ? (
          <View
            style={[styles.map, styles.centerContainer, styles.mapLoadingBg]}
          >
            <ActivityIndicator size="large" color="#805ad5" />
            <Text style={styles.mapLoadingText}>Loading map data…</Text>
          </View>
        ) : (
          <>
            <MapView
              provider={PROVIDER_GOOGLE}
              ref={mapRef}
              style={styles.map}
              initialRegion={DEFAULT_REGION}
              onRegionChangeComplete={(region) => {
                currentRegionRef.current = region;
              }}
            >
              {hasCoordinates && coordinates.length > 1 && (
                <Polyline
                  coordinates={coordinates}
                  strokeColor="#805ad5"
                  strokeWidth={4}
                />
              )}
              {hasCoordinates && (
                <Marker
                  coordinate={coordinates[coordinates.length - 1]}
                  title="Current Location"
                  pinColor="purple"
                />
              )}
            </MapView>

            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={zoomIn}
                activeOpacity={0.8}
              >
                <Text style={styles.zoomBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={zoomOut}
                activeOpacity={0.8}
              >
                <Text style={styles.zoomBtnText}>−</Text>
              </TouchableOpacity>
              {hasCoordinates && (
                <TouchableOpacity
                  style={[styles.zoomBtn, styles.fitBtn]}
                  onPress={fitRoute}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fitBtnText}>⤢</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Overlay banner when no valid coordinates */}
            {mapStatusText && (
              <View style={styles.mapBanner}>
                <Text style={styles.mapBannerIcon}>⚠️</Text>
                <Text style={styles.mapBannerText}>{mapStatusText}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Logs List Section */}
      <View style={styles.listSection}>
        {loading && logs.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#805ad5" />
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={renderLog}
            contentContainerStyle={styles.listContainer}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && logs.length > 0 ? (
                <ActivityIndicator
                  size="small"
                  color="#805ad5"
                  style={styles.footerLoader}
                />
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>
                    No GPS tracking logs found.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  mapContainer: {
    flex: 0.4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingBg: {
    backgroundColor: "#ede9f6",
  },
  mapLoadingText: {
    marginTop: 10,
    color: "#805ad5",
    fontSize: 14,
  },
  zoomControls: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -52 }],
    alignItems: "center",
    gap: 6,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e0d7f8",
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#805ad5",
    lineHeight: 26,
  },
  fitBtn: {
    backgroundColor: "rgba(128,90,213,0.12)",
    borderColor: "#805ad5",
    marginTop: 4,
  },
  fitBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#805ad5",
  },
  mapBanner: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBannerIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  mapBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#555",
  },
  listSection: {
    flex: 0.6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  footerLoader: {
    marginVertical: 16,
  },
  logCard: {
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#805ad5",
  },
  logDivider: {
    height: 1,
    backgroundColor: "#f0ebfa",
    marginVertical: 8,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  logRowGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 6,
  },
  logBadge: {
    flex: 1,
    backgroundColor: "#f8f6ff",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0d7f8",
  },
  logBadgeTopic: {
    flex: 1.2,
    backgroundColor: "#fff7ed",
    borderColor: "#fcd9a8",
  },
  logBadgeLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  logBadgeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4a2d8f",
  },
  logBadgeTopicText: {
    color: "#b45309",
    fontSize: 11,
  },
  logLabel: {
    fontWeight: "600",
    color: "#555",
    fontSize: 12,
  },
  logValue: {
    color: "#333",
    flexShrink: 1,
    textAlign: "right",
    fontSize: 12,
  },
  nullValue: {
    color: "#c05621",
    fontStyle: "italic",
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
});

export default GPSTracking;
