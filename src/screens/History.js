import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { getBusBoxDetailsAPI } from '../utils/storage';

// ─── Category badge colours ─────────────────────────────────────────────────
const CATEGORY_COLORS = {
  gate_camera: '#3182ce',
  fullbus_camera: '#805ad5',
  gps: '#38a169',
  GPS: '#38a169',
  step_sensor: '#e53e3e',
};

const categoryLabel = (cat) => {
  switch ((cat || '').toLowerCase()) {
    case 'gate_camera':    return '🎥 Gate Camera';
    case 'fullbus_camera': return '📹 Full Bus Camera';
    case 'gps':            return '📍 GPS';
    case 'step_sensor':    return '🦶 Step Sensor';
    default:               return cat || 'Unknown';
  }
};

// ─── Small badge ─────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ─── Component row ────────────────────────────────────────────────────────────
const ComponentRow = ({ item }) => {
  const color = CATEGORY_COLORS[(item.category || '').toLowerCase()] ||
                CATEGORY_COLORS[item.category] || '#718096';
  return (
    <View style={styles.compRow}>
      <View style={styles.compHeader}>
        <Badge label={categoryLabel(item.category)} color={color} />
        <Badge
          label={item.status || 'N/A'}
          color={item.status === 'Assigned' ? '#38a169' : '#718096'}
        />
      </View>
      <Text style={styles.compId}>ID: {item.comp_id}</Text>
      {item.position && item.position !== 'none' && (
        <Text style={styles.compMeta}>Position: {item.position}</Text>
      )}
      {item.notes ? <Text style={styles.compMeta}>Notes: {item.notes}</Text> : null}
      {item.camera && (
        <View style={styles.cameraBox}>
          <Text style={styles.cameraTitle}>📷 Camera Config</Text>
          <Text style={styles.cameraMeta}>IP: {item.camera.ip}</Text>
          <Text style={styles.cameraMeta}>Port: {item.camera.port}</Text>
          <Text style={styles.cameraMeta}>Stream: {item.camera.stream}</Text>
          <Text style={styles.cameraMeta}>User: {item.camera.user}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Box section ──────────────────────────────────────────────────────────────
const BoxSection = ({ title, icon, accentColor, boxData }) => {
  const [expanded, setExpanded] = useState(false);

  if (!boxData?.assigned) {
    return (
      <View style={[styles.boxSection, { borderLeftColor: '#cbd5e0' }]}>
        <Text style={styles.boxTitle}>{icon} {title}</Text>
        <Text style={styles.unassigned}>Not Assigned</Text>
      </View>
    );
  }

  return (
    <View style={[styles.boxSection, { borderLeftColor: accentColor }]}>
      <TouchableOpacity
        style={styles.boxHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.boxTitle, { color: accentColor }]}>
          {icon} {title}
        </Text>
        <View style={styles.boxHeaderRight}>
          <Badge
            label={boxData.status || 'Unknown'}
            color={boxData.status === 'Active' ? '#38a169' : '#718096'}
          />
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.boxId} numberOfLines={1}>
        Box ID: {boxData.box_id}
      </Text>

      {expanded && (
        <View style={styles.compList}>
          <Text style={styles.compListTitle}>
            Components ({boxData.components?.length || 0})
          </Text>
          {(boxData.components || []).length === 0 ? (
            <Text style={styles.emptyText}>No components assigned</Text>
          ) : (
            (boxData.components || []).map((comp) => (
              <ComponentRow key={comp.id} item={comp} />
            ))
          )}
        </View>
      )}
    </View>
  );
};

// ─── Bus card ─────────────────────────────────────────────────────────────────
const BusCard = ({ bus }) => {
  const [expanded, setExpanded] = useState(false);

  const piCount    = bus.pi_box?.components?.length || 0;
  const sensorCount = bus.sensor_box?.components?.length || 0;

  return (
    <View style={styles.busCard}>
      {/* Card header – always visible */}
      <TouchableOpacity
        style={styles.busCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.75}
      >
        <View style={styles.busCardLeft}>
          <Text style={styles.busNo}>🚌 {bus.bus_no}</Text>
          <Text style={styles.busRoute}>{bus.route}</Text>
        </View>
        <View style={styles.busCardRight}>
          <Badge
            label={bus.is_active ? 'Active' : 'Inactive'}
            color={bus.is_active ? '#38a169' : '#e53e3e'}
          />
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Summary row */}
      <View style={styles.busSummary}>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipLabel}>🕐 Dep</Text>
          <Text style={styles.summaryChipValue}>{bus.departure_time}</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipLabel}>🕑 Arr</Text>
          <Text style={styles.summaryChipValue}>{bus.arrival_time}</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipLabel}>📏 Kms</Text>
          <Text style={styles.summaryChipValue}>{bus.kms}</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipLabel}>📦 Comps</Text>
          <Text style={styles.summaryChipValue}>{piCount + sensorCount}</Text>
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.busDetail}>
          {/* Staff */}
          <View style={styles.staffGrid}>
            <StaffItem label="Driver 1"    value={bus.driver_1} />
            <StaffItem label="Driver 2"    value={bus.driver_2} />
            <StaffItem label="Conductor 1" value={bus.conductor_1} />
            <StaffItem label="Conductor 2" value={bus.conductor_2} />
            <StaffItem label="Reliever 1"  value={bus.reliever_1} />
            <StaffItem label="Reliever 2"  value={bus.reliever_2} />
          </View>

          {/* Device ID */}
          {bus.device_id ? (
            <Text style={styles.deviceId}>Device ID: {bus.device_id}</Text>
          ) : null}

          {/* Boxes */}
          <BoxSection
            title="Pi Box"
            icon="💻"
            accentColor="#3182ce"
            boxData={bus.pi_box}
          />
          <BoxSection
            title="Sensor Box"
            icon="📡"
            accentColor="#805ad5"
            boxData={bus.sensor_box}
          />
        </View>
      )}
    </View>
  );
};

const StaffItem = ({ label, value }) => (
  <View style={styles.staffItem}>
    <Text style={styles.staffLabel}>{label}</Text>
    <Text style={styles.staffValue}>{value || '—'}</Text>
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function History() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getBusBoxDetailsAPI();
      setBuses(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch bus details');
      Alert.alert('Error', err.message || 'Failed to fetch bus details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = buses.filter((b) =>
    (b.bus_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.route || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3182ce" />
        <Text style={styles.loadingText}>Loading bus details…</Text>
      </View>
    );
  }

  if (error && buses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text
            style={styles.searchPlaceholder}
            onPress={() => {}}
          >
            Search by bus no. or route…
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{filtered.length} buses</Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#3182ce']}
            tintColor="#3182ce"
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚌</Text>
            <Text style={styles.emptyStateText}>No buses found</Text>
          </View>
        ) : (
          filtered.map((bus) => <BusCard key={bus.bus_no} bus={bus} />)
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#718096', fontSize: 15 },
  errorIcon: { fontSize: 48 },
  errorText: { marginTop: 8, color: '#e53e3e', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: '#3182ce', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f4f8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 6,
  },
  searchIcon: { fontSize: 15 },
  searchPlaceholder: { color: '#a0aec0', fontSize: 14 },
  totalBadge: {
    backgroundColor: '#ebf8ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  totalText: { color: '#3182ce', fontWeight: '700', fontSize: 13 },

  list: { flex: 1 },
  listContent: { padding: 16, gap: 14 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 52 },
  emptyStateText: { marginTop: 12, color: '#718096', fontSize: 16 },

  // Bus card
  busCard: {
    backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  busCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    justifyContent: 'space-between',
  },
  busCardLeft: { flex: 1 },
  busNo: { fontSize: 18, fontWeight: '700', color: '#1a202c' },
  busRoute: { fontSize: 13, color: '#718096', marginTop: 2 },
  busCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Summary row
  busSummary: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  summaryChip: {
    backgroundColor: '#f7fafc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 70,
  },
  summaryChipLabel: { fontSize: 10, color: '#a0aec0', fontWeight: '600' },
  summaryChipValue: { fontSize: 13, color: '#2d3748', fontWeight: '700', marginTop: 2 },

  chevron: { fontSize: 12, color: '#a0aec0', marginLeft: 4 },

  // Bus detail
  busDetail: { padding: 16 },
  deviceId: { fontSize: 12, color: '#a0aec0', marginBottom: 12 },

  staffGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  staffItem: {
    backgroundColor: '#f7fafc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    minWidth: '45%', flex: 1,
  },
  staffLabel: { fontSize: 11, color: '#a0aec0', fontWeight: '600' },
  staffValue: { fontSize: 13, color: '#2d3748', fontWeight: '600', marginTop: 2 },

  // Box section
  boxSection: {
    borderLeftWidth: 3, borderRadius: 10,
    backgroundColor: '#f7fafc',
    padding: 12, marginBottom: 10,
  },
  boxHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  boxHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boxTitle: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  boxId: { fontSize: 11, color: '#a0aec0', marginTop: 4, marginBottom: 2 },
  unassigned: { fontSize: 13, color: '#a0aec0', marginTop: 4 },

  // Component list
  compList: { marginTop: 10 },
  compListTitle: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#a0aec0' },

  compRow: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  compHeader: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  compId: { fontSize: 12, color: '#4a5568', fontWeight: '600' },
  compMeta: { fontSize: 11, color: '#a0aec0', marginTop: 2 },

  cameraBox: {
    backgroundColor: '#ebf8ff', borderRadius: 6, padding: 8, marginTop: 6,
  },
  cameraTitle: { fontSize: 12, fontWeight: '700', color: '#3182ce', marginBottom: 4 },
  cameraMeta: { fontSize: 11, color: '#2c5282' },

  // Badge
  badge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
