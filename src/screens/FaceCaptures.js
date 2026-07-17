import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { getBusesAPI } from '../utils/storage';

// ─────────────────────────────────────────────────────────────
//  THEME — Light
// ─────────────────────────────────────────────────────────────
const T = {
  pageBg:        '#F4F6FB',
  cardBg:        '#FFFFFF',
  inputBg:       '#F8FAFC',
  surfaceMuted:  '#F1F5F9',
  borderLight:   '#E2E8F0',
  borderMid:     '#CBD5E1',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',
  brand:         '#4F46E5',
  brandLight:    '#EEF2FF',
  green:         '#16A34A',
  amber:         '#D97706',
  violet:        '#7C3AED',
  shadow:        '#64748B',
  red:           '#DC2626',
  redLight:      '#FEE2E2',
};

// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

const formatDateStr = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTimeStr = (date) => {
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

const makeToday8am = () => {
  const d = new Date();
 d.setHours(0, 0, 0, 0);
  return d;
};

const makeToday5pm = () => {
  const d = new Date();
   d.setHours(23, 59, 59, 999);
  return d;
};

// ─────────────────────────────────────────────────────────────
//  DATE-TIME FIELD  (FIX: two separate buttons, no chaining)
// ─────────────────────────────────────────────────────────────
function DateTimeField({ label, value, onChange }) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Only changes the date portion; keeps existing time
  const onDateChange = (_, sel) => {
    setShowDate(false);
    if (sel) {
      const merged = new Date(sel);
      const existing = value || new Date();
      merged.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      onChange(merged);
    }
  };

  // Only changes the time portion; keeps existing date
  const onTimeChange = (_, sel) => {
    setShowTime(false);
    if (sel) {
      const merged = new Date(value || new Date());
      merged.setHours(sel.getHours(), sel.getMinutes(), 0, 0);
      onChange(merged);
    }
  };

  const dateLabel = value
    ? `${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()}`
    : '— Select Date —';

  const timeLabel = value
    ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
    : '— Select Time —';

  return (
    <View style={styles.filterField}>
      <View style={styles.filterLabelRow}>
        <Text style={styles.filterLabelIcon}>📅</Text>
        <Text style={styles.filterLabel}>{label}</Text>
      </View>

      {/* Date picker button */}
      <TouchableOpacity
        style={[styles.filterInput, { marginBottom: 6 }]}
        onPress={() => setShowDate(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterInputText} numberOfLines={1}>
          {dateLabel}
        </Text>
        <Text style={styles.filterInputIcon}>▾</Text>
      </TouchableOpacity>

      {/* Time picker button */}
      <TouchableOpacity
        style={styles.filterInput}
        onPress={() => setShowTime(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterInputText} numberOfLines={1}>
          {timeLabel}
        </Text>
        <Text style={styles.filterInputIcon}>⏰</Text>
      </TouchableOpacity>

      {/* Date picker */}
      {showDate && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onDateChange}
          themeVariant="light"
        />
      )}

      {/* Time picker */}
      {showTime && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour
          onChange={onTimeChange}
          themeVariant="light"
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  PASSENGER CARD
// ─────────────────────────────────────────────────────────────
const PassengerCard = ({ paxId, busId, fromDate, toDate, onPress }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const startDt = `${formatDateStr(fromDate)}T${formatTimeStr(fromDate)}`;
        const endDt   = `${formatDateStr(toDate)}T${formatTimeStr(toDate)}`;

        const url =
          `https://exhibitnow.world/processed/passenger/${paxId}` +
          `?start_datetime=${encodeURIComponent(startDt)}` +
          `&end_datetime=${encodeURIComponent(endDt)}` +
          (busId ? `&bus_id=${busId}` : '');

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const records = json.data || [];
          // Log to help debug direction/reason values
          if (records.length > 0) {
            console.log('[PAX]', paxId, 'sample:', JSON.stringify(records[0]));
          }
          setData(records);
        }
      } catch (err) {
        console.error('[FaceCaptures] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [paxId, busId, fromDate, toDate]);

  if (loading) {
    return (
      <View style={styles.paxCard}>
        <ActivityIndicator
          size="small"
          color={T.brand}
          style={{ marginVertical: 20, alignSelf: 'center' }}
        />
      </View>
    );
  }

  let inCount = 0;
  let outCount = 0;
  let gender = null;
  let age = null;
  data.forEach((d) => {
    // API uses uppercase ENTRY / EXIT (confirmed from EntryLogs.js)
    const dir = String(d.direction || '').toUpperCase().trim();
    const reason = String(d.reason || '').toLowerCase().trim();
    if (dir === 'EXIT' || reason === 'exit' || reason.startsWith('exit_')) {
      outCount++;
    } else {
      inCount++;
    }
    if (!gender && d.gender) gender = d.gender;
    if (!age && d.age) age = d.age;
  });

  const firstRecord = data.length > 0 ? data[0] : null;
  const imagePath =
    firstRecord && firstRecord.processed_path
      ? encodeURI(`https://exhibitnow.world/${firstRecord.processed_path.replace(/^\/+/, '')}`)
      : null;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatTime = (raw) => {
    try {
      const d = new Date(raw);
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${pad(d.getDate())} ${months[d.getMonth()]}, ${pad(hours)}:${pad(d.getMinutes())} ${ampm}`;
    } catch (e) { return null; }
  };

  const timeStr = data
    .map((d) => formatTime(d.processed_at))
    .filter(Boolean)
    .join(' · ') || 'N/A';

  return (
    <TouchableOpacity
      style={styles.paxCard}
      onPress={() => onPress(data, paxId)}
    >
      {imagePath ? (
        <Image
          source={{ uri: imagePath }}
          style={styles.paxImage}
          onError={() => {}}
        />
      ) : (
        <View style={styles.paxImagePlaceholder} />
      )}
      <View style={styles.paxInfo}>
        <Text style={styles.paxIdText}>{paxId}</Text>
        <Text style={styles.paxSubText}>{busId}</Text>
        {(gender || age) ? (
          <Text style={styles.paxSubText}>
            {gender ? `Gender: ${gender}   ` : ''}{age ? `Age: ${age}` : ''}
          </Text>
        ) : null}
        <Text style={styles.paxDateText}>{timeStr}</Text>
      </View>
      <View style={styles.paxBadgesContainer}>
        <View style={styles.inBadge}>
          <Text style={styles.inBadgeText}>IN {inCount}</Text>
        </View>
        <View style={styles.outBadge}>
          <Text style={styles.outBadgeText}>OUT {outCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function FaceCaptures() {
  const [buses, setBuses]             = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [fromDate, setFromDate]       = useState(makeToday8am);
  const [toDate, setToDate]           = useState(makeToday5pm);

  const [loading, setLoading]     = useState(false);
  const [summary, setSummary]     = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [error, setError]         = useState(null);

  // Modal state
  const [selectedPax, setSelectedPax]   = useState(null);
  const [paxDetails, setPaxDetails]     = useState([]);
  const [paxLoading, setPaxLoading]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch bus list
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const data = await getBusesAPI();
        if (data && data.length) {
          const ids = data.map((b) => b.bus_no).filter(Boolean);
          setBuses([...new Set(ids)]);
        }
      } catch (err) {
        console.error('Failed to fetch buses:', err);
      }
    };
    fetchBuses();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDt = `${formatDateStr(fromDate)}T${formatTimeStr(fromDate)}`;
      const endDt   = `${formatDateStr(toDate)}T${formatTimeStr(toDate)}`;

      const url =
        `https://exhibitnow.world/processed/summary` +
        `?start_datetime=${encodeURIComponent(startDt)}` +
        `&end_datetime=${encodeURIComponent(endDt)}` +
        (selectedBus ? `&bus_id=${selectedBus}` : '');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      setSummary(data);
      setPassengers([...(data.passengers || [])].reverse());
    } catch (err) {
      setError(err.message || 'Failed to load face captures summary.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerPress = (details, paxId) => {
    setSelectedPax(paxId);
    setPaxDetails(details);
    setModalVisible(true);
  };

  // ── List Header ──────────────────────────────────────────
  const ListHeader = (
    <View>
      <View style={styles.headerPanel}>
        {/* Eyebrow */}
        {/* <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>AI VISION</Text>
          </View>
        </View> */}

        <Text style={styles.headerTitle}>Face Captures</Text>
        <Text style={styles.headerSub}>
          Analyze processed passengers and captured images.
        </Text>

        <View style={styles.headerDivider} />
        <Text style={styles.filterSectionLabel}>FILTER BY</Text>

        {/* Bus picker — FIX: no style prop on Picker.Item */}
        {/* Bus picker */}
<View style={styles.filterField}>
  <View style={styles.filterLabelRow}>
    <Text style={styles.filterLabelIcon}>🚌</Text>
    <Text style={styles.filterLabel}>BUS</Text>
  </View>

  {/* ✅ FIX: Wrap Picker in a controlled-height container */}
  <View
    style={{
      borderWidth: 1,
      borderColor: '#D1D5DB',       // visible border
      borderRadius: 10,
      height: 45,                   // fixed height — no more clipping
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    }}
  >
    <Picker
      selectedValue={selectedBus}
      onValueChange={(val) => setSelectedBus(val)}
      mode="dropdown"
      style={{
        width: '100%',
        height: 50,
        // ✅ Muted gray when placeholder, dark when selected
        color: selectedBus === '' ? '#9CA3AF' : '#111827',
        backgroundColor: 'transparent',
        marginTop: Platform.OS === 'android' ? -6 : 0, // Android offset fix
      }}
      dropdownIconColor="#6B7280"
    >
      {/* ✅ disabled placeholder — can't be re-selected */}
      <Picker.Item
        label="Select Bus"
        value=""
        enabled={false}
        color="#9CA3AF"
      />
      {buses.map((id) => (
        <Picker.Item
          key={id}
          label={id}
          value={id}
          color="#111827"
        />
      ))}
    </Picker>
  </View>
</View>

        {/* Date range */}
        <View style={styles.filterRow}>
          <DateTimeField
            label="FROM DATE & TIME"
            value={fromDate}
            onChange={setFromDate}
          />
          <DateTimeField
            label="TO DATE & TIME"
            value={toDate}
            onChange={setToDate}
          />
        </View>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={fetchSummary}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      {summary && (
        <>
          {/* <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { borderTopColor: '#3b82f6' }]}>
              <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                {summary.total_processed_images}
              </Text>
              <Text style={styles.summaryTitle}>Images</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: '#10b981' }]}>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {summary.total_unique_passengers}
              </Text>
              <Text style={styles.summaryTitle}>Passengers</Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                { borderTopColor: '#8b5cf6', marginRight: 0 },
              ]}
            >
              <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>
                {summary.total_unique_trips}
              </Text>
              <Text style={styles.summaryTitle}>Trips</Text>
            </View>
          </View> */}

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>Detected Passengers</Text>
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {passengers.length} found
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={T.pageBg} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={passengers}
        keyExtractor={(item, i) => `${item}-${i}`}
        renderItem={({ item }) => (
          <PassengerCard
            paxId={item}
            busId={selectedBus}
            fromDate={fromDate}
            toDate={toDate}
            onPress={handlePassengerPress}
          />
        )}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchSummary}
            tintColor={T.brand}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && summary ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIconText}>🔍</Text>
              <Text style={styles.emptyTitle}>No passengers found</Text>
              <Text style={styles.emptySub}>
                No face captures recorded for this time range.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Passenger Details Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Title row */}
            <View style={styles.modalHeaderInfoRow}>
              <Text style={styles.modalHeaderPaxText}>
                {selectedPax}  {selectedBus}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {paxLoading ? (
              <ActivityIndicator
                size="large"
                color={T.brand}
                style={{ marginTop: 40 }}
              />
            ) : paxDetails.length === 0 ? (
              <Text style={styles.emptySub}>No details found.</Text>
            ) : (
              <FlatList
                data={paxDetails}
                keyExtractor={(item, i) => `detail-${i}-${item.processed_at || i}`}
                nestedScrollEnabled
                renderItem={({ item }) => {
                  const rawPath = item.processed_path || '';
                  const imgUrl = rawPath
                    ? encodeURI(`https://exhibitnow.world/${rawPath.replace(/^\/+/, '')}`)
                    : null;
                  return (
                    <View style={styles.detailCard}>
                      {imgUrl ? (
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.detailImage}
                          resizeMode="cover"
                          onError={() => {}}
                        />
                      ) : null}
                      {/* <Text style={styles.detailReason}>
                        {String(item.reason || 'Captured')}
                      </Text> */}
                      {/* <Text style={styles.detailTime}>
                        Direction: {String(item.direction || 'N/A')}
                      </Text>
                      <Text style={styles.detailTime}>
                        Trip: {String(item.trip_id || 'N/A')}
                      </Text> */}
                      <Text style={styles.detailTime}>
                        Processed:{' '}
                        {(item.processed_at || '')
                          .split('.')[0]
                          .replace('T', ' ') || 'N/A'}
                      </Text>
                      {/* <Text
                        style={styles.detailPath}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        File: {String(rawPath || 'N/A')}
                      </Text> */}
                    </View>
                  );
                }}
                contentContainerStyle={{ padding: 16 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: T.pageBg },
  listContent: { paddingHorizontal: 16, paddingBottom: 44 },

  // Header Panel
  headerPanel: {
    backgroundColor: T.cardBg,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
    elevation: 3,
  },
  eyebrowRow: { marginBottom: 12 },
  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: T.brandLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: T.brand,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: T.textPrimary,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: T.textMuted,
    fontWeight: '500',
    marginBottom: 10,
  },
  headerDivider: {
    height: 1,
    backgroundColor: T.borderLight,
    marginBottom: 12,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: T.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginTop: 12,
  },
  filterField: { flex: 1 },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  filterLabelIcon: { fontSize: 11 },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: T.textSecondary,
    letterSpacing: 0.9,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 42,
  },
  filterInputText: {
    flex: 1,
    fontSize: 11,
    color: T.textPrimary,
    fontWeight: '600',
  },
  filterInputIcon: { fontSize: 13, color: T.textMuted, marginTop: -2 },
  applyBtn: {
    backgroundColor: T.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 5,
    marginTop: 4,
  },
  applyBtnText: {
    color: T.textInverse,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    paddingBottom: 20,
    marginTop: 14,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 12,
    borderTopWidth: 4,
    elevation: 2,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#475569' },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop:16,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccentBar: {
    width: 4,
    height: 20,
    backgroundColor: T.brand,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.textPrimary,
  },
  sectionBadge: {
    backgroundColor: T.brandLight,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: T.brand },

  // Passenger Card
  paxCard: {
    flexDirection: 'row',
    backgroundColor: T.cardBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
  },
  paxImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  paxImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: T.surfaceMuted,
  },
  paxInfo: { flex: 1, justifyContent: 'center' },
  paxIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: T.textPrimary,
    marginBottom: 2,
  },
  paxSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    marginBottom: 2,
  },
  paxDateText: { fontSize: 11, color: T.textMuted, flexShrink: 1, flexWrap: 'wrap' },
  paxBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  inBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inBadgeText: { color: T.green, fontSize: 11, fontWeight: '800' },
  outBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outBadgeText: { color: T.amber, fontSize: 11, fontWeight: '800' },

  // Error / Empty
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.redLight,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: T.red,
  },
  errorIcon: { fontSize: 16 },
  errorMsg: { flex: 1, fontSize: 12, color: '#991B1B', fontWeight: '500' },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconText: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  emptySub: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: T.pageBg,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
    maxHeight: '80%',
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: T.surfaceMuted,
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: T.surfaceMuted,
  },
  modalHeaderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: T.cardBg,
  },
  modalHeaderPaxText: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderLight,
  },
  closeBtnText: { fontSize: 16, color: T.textSecondary },
  detailCard: {
    backgroundColor: T.cardBg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: T.brand,
    elevation: 1,
  },
  detailReason: {
    fontSize: 14,
    fontWeight: 'bold',
    color: T.textPrimary,
    marginBottom: 4,
  },
  detailTime: { fontSize: 12, color: T.textSecondary, marginBottom: 2 },
  detailPath: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});