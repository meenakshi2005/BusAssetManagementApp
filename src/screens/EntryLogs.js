import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { getBusesAPI } from "../utils/storage";
import { getEntryLogsAPI } from "../utils/entryLogsAPI";
import { getAllTripsAPI } from "../utils/tripAPI";

// ─────────────────────────────────────────────────────────────
//  THEME — Light
// ─────────────────────────────────────────────────────────────
const T = {
  // backgrounds
  pageBg: "#F4F6FB",
  cardBg: "#FFFFFF",
  headerBg: "#FFFFFF",
  inputBg: "#F8FAFC",
  surfaceMuted: "#F1F5F9",

  // borders
  borderLight: "#E2E8F0",
  borderMid: "#CBD5E1",

  // text
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  // brand
  brand: "#4F46E5", // indigo
  brandLight: "#EEF2FF",
  brandMid: "#818CF8",

  // accents
  green: "#16A34A",
  greenLight: "#DCFCE7",
  greenMid: "#22C55E",

  amber: "#D97706",
  amberLight: "#FEF3C7",
  amberMid: "#F59E0B",

  violet: "#7C3AED",
  violetLight: "#EDE9FE",

  red: "#DC2626",
  redLight: "#FEF2F2",

  // shadows
  shadow: "#64748B",
};

// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

const formatDateStr = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTimeStr = (date) => {
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

const fmtDisplay = (date) => {
  if (!date) return "—";
  return (
    `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}` +
    `  ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const fmtTimeOnly = (iso) => {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "N/A";
  }
};

const fmtDateOnly = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const mon = [
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
    ][d.getMonth()];
    return `${pad(d.getDate())} ${mon} ${d.getFullYear()}`;
  } catch {
    return "";
  }
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

// Human-readable label for a trip in the dropdown
const fmtTripLabel = (trip) => {
  if (!trip) return "Trip";
  const bus = trip.bus_no || "Unknown Bus";
  const start = trip.start_datetime ? fmtDateOnly(trip.start_datetime) : "";
  const time = trip.start_datetime ? fmtTimeOnly(trip.start_datetime) : "";
  return `${bus} · ${start} ${time}`.trim();
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
    : "— Select Date —";

  const timeLabel = value
    ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
    : "— Select Time —";

  return (
    <View style={styles.filterField}>
      {/* label */}
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

      {showDate && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onDateChange}
          maximumDate={new Date()} // ✅ Future dates disabled
          themeVariant="light"
        />
      )}

      {showTime && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          onChange={onTimeChange}
          themeVariant="light"
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({
  borderColor,
  iconBg,
  iconColor,
  icon,
  label,
  value,
  badgeBg,
  badgeTextColor,
  badgeLabel,
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: borderColor }]}>
      {/* icon */}
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Text style={[styles.statIconText, { color: iconColor }]}>{icon}</Text>
      </View>

      {/* text */}
      <View style={styles.statBody}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: borderColor }]}>{value}</Text>
      </View>

      {/* badge */}
      <View style={[styles.statBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.statBadgeText, { color: badgeTextColor }]}>
          {badgeLabel}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  LOG CARD
// ─────────────────────────────────────────────────────────────
function LogCard({ item }) {
  const isEntry = item.direction === "ENTRY";
  const accentColor = isEntry ? T.greenMid : T.amberMid;
  const badgeBg = isEntry ? T.greenLight : T.amberLight;
  const badgeTxt = isEntry ? T.green : T.amber;

  return (
    <View style={styles.logCard}>
      <View style={[styles.logAccentBar, { backgroundColor: accentColor }]} />

      {/* top row */}
      <View style={styles.logTopRow}>
        <View style={[styles.dirBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.dirArrow, { color: accentColor }]}>
            {isEntry ? "↑" : "↓"}
          </Text>
          <Text style={[styles.dirLabel, { color: badgeTxt }]}>
            {item.direction || "N/A"}
          </Text>
        </View>

        <View style={styles.busBadge}>
          <Text style={styles.busBadgeTag}>BUS</Text>
          <Text style={styles.busBadgeVal}>{item.bus_id || "—"}</Text>
        </View>
      </View>

      {/* bottom row */}
      <View style={styles.logBottomRow}>
        <View style={styles.logInfoCell}>
          <View style={[styles.logInfoDot, { backgroundColor: T.brand }]} />
          <View>
            <Text style={styles.logInfoVal}>{fmtTimeOnly(item.timestamp)}</Text>
            <Text style={styles.logInfoSub}>{fmtDateOnly(item.timestamp)}</Text>
          </View>
        </View>

        {item.duration_seconds !== undefined && (
          <View style={styles.logInfoCell}>
            <View
              style={[styles.logInfoDot, { backgroundColor: T.amberMid }]}
            />
            <View>
              <Text style={styles.logInfoVal}>{item.duration_seconds}s</Text>
              <Text style={styles.logInfoSub}>Duration</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function EntryLogs() {
  // ── filters ───────────────────────────────────────
  const [selectedBus, setSelectedBus] = useState("");
  const [selectedTrip, setSelectedTrip] = useState("");
  const [fromDate, setFromDate] = useState(makeToday8am);
  const [toDate, setToDate] = useState(makeToday5pm);

  // ── data ──────────────────────────────────────────
  const [logs, setLogs] = useState([]);
  const [busList, setBusList] = useState([]);
  const [tripList, setTripList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 100;
  const activeLoad = useRef(false);

  // ── fetch ──────────────────────────────────────────
  const fetchLogs = useCallback(
    async (newOffset = 0, isRefresh = false) => {
      if (activeLoad.current && !isRefresh) return;
      activeLoad.current = true;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const params = {
          limit,
          offset: newOffset,
          ...(selectedBus ? { bus_id: selectedBus } : {}),
          ...(selectedTrip ? { trip_id: selectedTrip } : {}),
          ...(fromDate
            ? {
                date: formatDateStr(fromDate),
                start_time: formatTimeStr(fromDate),
              }
            : {}),
          ...(toDate
            ? {
                end_time: formatTimeStr(toDate),
              }
            : {}),
        };
        const response = await getEntryLogsAPI(params);
        const raw = response.logs || response.data || response || [];
        const arr = Array.isArray(raw) ? raw : [];

        if (newOffset === 0) {
          setLogs(arr);
        } else {
          setLogs((prev) => [...prev, ...arr]);
        }
        setHasMore(arr.length >= limit);
      } catch (err) {
        setError(err.message || "Failed to load logs. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        activeLoad.current = false;
      }
    },
    [selectedBus, selectedTrip, fromDate, toDate],
  );

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const data = await getBusesAPI();
        if (data && data.length) {
          const ids = data.map((b) => b.bus_no).filter(Boolean);
          setBusList([...new Set(ids)]);
        }
      } catch (err) {
        console.error("Failed to fetch buses:", err);
      }
    };

    fetchBuses();
    fetchLogs(0);
  }, []);

  // ── trips list, scoped to the selected bus ─────────
  // Refetches whenever selectedBus changes (GET /trips?bus_no=...),
  // and falls back to all trips when no bus is selected.
  useEffect(() => {
    let cancelled = false;

    const fetchTrips = async () => {
      try {
        const data = await getAllTripsAPI(selectedBus || undefined);
        const raw = data?.trips || data?.data || data || [];
        const arr = Array.isArray(raw) ? raw : [];
        if (!cancelled) setTripList(arr);
      } catch (err) {
        console.error("Failed to fetch trips:", err);
      }
    };

    fetchTrips();
    // Selecting a different bus invalidates the previously chosen trip
    setSelectedTrip("");

    return () => {
      cancelled = true;
    };
  }, [selectedBus]);

  const applyFilters = () => {
    setOffset(0);
    setHasMore(true);
    setLogs([]);
    fetchLogs(0);
  };
  const loadMore = () => {
    if (hasMore && !loading) {
      const n = offset + limit;
      setOffset(n);
      fetchLogs(n);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    fetchLogs(0, true);
  };

  // ── computed stats ────────────────────────────────
  const totalEntry = logs.filter((l) => l && l.direction === "ENTRY").length;
  const totalExit = logs.filter((l) => l && l.direction === "EXIT").length;
  const occupancy = Math.max(0, totalEntry - totalExit);

  // ─────────────────────────────────────────────────
  //  LIST HEADER
  // ─────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* ══════════════════════════════════════════
          LIGHT HEADER PANEL
      ══════════════════════════════════════════ */}
      <View style={styles.headerPanel}>
        {/* eyebrow */}
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>TRANSIT OPERATIONS</Text>
          </View>
        </View>

        {/* title */}
        <Text style={styles.headerTitle}>Fleet Passenger</Text>

        {/* subtitle / meta */}
        <Text style={styles.headerSub}>
          Showing logs for {fmtDateOnly(fromDate?.toISOString())}
        </Text>

        {/* ── divider ── */}
        <View style={styles.headerDivider} />

        {/* ── filter fields ── */}
        <Text style={styles.filterSectionLabel}>FILTER BY</Text>

        {/* ✅ Bus — full width row */}
        <View style={styles.filterField}>
          <View style={styles.filterLabelRow}>
            <Text style={styles.filterLabelIcon}>🚌</Text>
            <Text style={styles.filterLabel}>BUS</Text>
          </View>
          <View
            style={{
              backgroundColor: T.inputBg,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: T.borderLight,
              height: 45, // ✅ fixed height — not minHeight
              justifyContent: "center", // ✅ centers picker vertically
              overflow: "hidden",
            }}
          >
            <Picker
              selectedValue={selectedBus}
              onValueChange={(val) => setSelectedBus(val)}
              mode="dropdown"
              style={{
                width: "100%",
                height: 49,
                color: selectedBus === "" ? T.textMuted : T.textPrimary,
                backgroundColor: "transparent",
                marginTop: Platform.OS === "android" ? -4 : 0, // ✅ Android text offset fix
              }}
              dropdownIconColor={T.textMuted}
            >
              <Picker.Item label="All Buses" value="" color={T.textMuted} />
              {busList.map((id) => (
                <Picker.Item
                  key={id}
                  label={id}
                  value={id}
                  color={T.textPrimary}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* ✅ Trip — full width row, same pattern as Bus */}
        <View style={styles.filterField}>
          <View style={styles.filterLabelRow}>
            <Text style={styles.filterLabelIcon}>🧭</Text>
            <Text style={styles.filterLabel}>TRIP</Text>
          </View>
          <View
            style={{
              backgroundColor: T.inputBg,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: T.borderLight,
              height: 45,
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Picker
              selectedValue={selectedTrip}
              onValueChange={(val) => setSelectedTrip(val)}
              mode="dropdown"
              style={{
                width: "100%",
                height: 49,
                color: selectedTrip === "" ? T.textMuted : T.textPrimary,
                backgroundColor: "transparent",
                marginTop: Platform.OS === "android" ? -4 : 0,
              }}
              dropdownIconColor={T.textMuted}
            >
              <Picker.Item label="All Trips" value="" color={T.textMuted} />
              {tripList.map((trip) => (
                <Picker.Item
                  key={trip.trip_id}
                  label={fmtTripLabel(trip)}
                  value={trip.trip_id}
                  color={T.textPrimary}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* ✅ FROM and TO — side by side below */}
        <View style={styles.filterRow}>
          <DateTimeField label="FROM" value={fromDate} onChange={setFromDate} />
          <DateTimeField label="TO" value={toDate} onChange={setToDate} />
        </View>

        {/* ── apply button ── */}
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={applyFilters}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════
          STAT CARDS
      ══════════════════════════════════════════ */}
      <View style={styles.summaryContainer}>
        {/* Total Entry */}
        <View style={[styles.summaryCard, { borderTopColor: "#22c55e" }]}>
          <Text style={[styles.summaryValue, { color: "#22c55e" }]}>
            {totalEntry}
          </Text>
          <Text style={styles.summaryTitle}>Total Entry</Text>
        </View>

        {/* Total Exit */}
        <View style={[styles.summaryCard, { borderTopColor: "#f59e0b" }]}>
          <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>
            {totalExit}
          </Text>
          <Text style={styles.summaryTitle}>Total Exit</Text>
        </View>

        {/* Occupancy */}
        <View
          style={[
            styles.summaryCard,
            { borderTopColor: "#6366f1", marginRight: 0 },
          ]}
        >
          <Text style={[styles.summaryValue, { color: "#6366f1" }]}>
            {occupancy}
          </Text>
          <Text style={styles.summaryTitle}>Occupancy</Text>
        </View>
      </View>

      {/* ══════════════════════════════════════════
          SECTION HEADER
      ══════════════════════════════════════════ */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionTitle}>Entry / Exit Logs</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{logs.length} records</Text>
        </View>
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────
  //  ROOT RENDER
  // ─────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={T.pageBg} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchLogs(0)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={logs}
        keyExtractor={(item, i) => item ? `${item.bus_id}-${item.timestamp}-${i}` : i.toString()}
        renderItem={({ item }) => item ? <LogCard item={item} /> : null}
        ListHeaderComponent={ListHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.brand}
            colors={[T.brand]}
          />
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={T.brand} />
              <Text style={styles.footerLoaderText}>Loading more…</Text>
            </View>
          ) : !hasMore && logs.length > 0 ? (
            <View style={styles.footerEndRow}>
              <View style={styles.footerLine} />
              <Text style={styles.footerEndText}>All logs loaded</Text>
              <View style={styles.footerLine} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIconText}>📋</Text>
              </View>
              <Text style={styles.emptyTitle}>No logs found</Text>
              <Text style={styles.emptySub}>
                Adjust your filters or pull down to refresh.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={applyFilters}>
                <Text style={styles.emptyBtnText}>Reload</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={T.brand} />
              <Text style={[styles.emptySub, { marginTop: 14 }]}>
                Fetching logs…
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.pageBg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 44,
  },

  // ── Light header panel ────────────────────────────
  headerPanel: {
    backgroundColor: T.cardBg,
    marginHorizontal: -16, // bleed to edges
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
    // subtle bottom shadow
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  // eyebrow
  eyebrowRow: {
    marginBottom: 12,
  },
  eyebrowPill: {
    alignSelf: "flex-start",
    backgroundColor: T.brandLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: "800",
    color: T.brand,
    letterSpacing: 1.5,
  },

  // title
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: T.textPrimary,
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 12,
    color: T.textMuted,
    fontWeight: "500",
    marginBottom: 18,
  },

  // divider
  headerDivider: {
    height: 1,
    backgroundColor: T.borderLight,
    marginBottom: 16,
  },

  // filter section
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterField: {
    flex: 1,
    marginBottom: 12, // ✅ spacing when stacked vertically
  },
  filterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  filterLabelIcon: {
    fontSize: 11,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textSecondary,
    letterSpacing: 0.9,
  },
  filterInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 9,
    height: 45, // ✅ fixed height instead of minHeight
  },
  filterInputText: {
    flex: 1,
    fontSize: 11,
    color: T.textPrimary,
    fontWeight: "600",
  },
  filterInputIcon: {
    fontSize: 13,
    color: T.textMuted,
    marginTop: -2,
  },

  // apply button
  applyBtn: {
    backgroundColor: T.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: T.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  applyBtnText: {
    color: T.textInverse,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  // ── Stat cards ────────────────────────────────────
  statsWrap: {
    gap: 10,
    paddingTop: 18,
    paddingBottom: 6,
  },
  statCard: {
    backgroundColor: T.cardBg,
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderLeftWidth: 4,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statIconText: {
    fontSize: 22,
    fontWeight: "800",
  },
  statBody: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textMuted,
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Section header ────────────────────────────────
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 20,
    backgroundColor: T.brand,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: 0.1,
  },
  sectionBadge: {
    backgroundColor: T.brandLight,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.brand,
  },

  // ── Log card ──────────────────────────────────────
  logCard: {
    backgroundColor: T.cardBg,
    borderRadius: 14,
    marginBottom: 10,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 20,
    paddingRight: 14,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
    overflow: "hidden",
  },
  logAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  // log top row
  logTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dirBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  dirArrow: {
    fontSize: 14,
    fontWeight: "800",
  },
  dirLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  busBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.surfaceMuted,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.borderLight,
  },
  busBadgeTag: {
    fontSize: 9,
    color: T.textMuted,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  busBadgeVal: {
    fontSize: 12,
    color: T.textPrimary,
    fontWeight: "700",
  },

  // log bottom row
  logBottomRow: {
    flexDirection: "row",
    gap: 20,
  },
  logInfoCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logInfoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  logInfoVal: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textPrimary,
  },
  logInfoSub: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 1,
  },

  // ── Error banner ──────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.redLight,
    borderLeftWidth: 4,
    borderLeftColor: T.red,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorMsg: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: T.red,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryText: {
    color: T.textInverse,
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Footer ────────────────────────────────────────
  footerLoader: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 7,
  },
  footerLoaderText: {
    fontSize: 12,
    color: T.textMuted,
  },
  footerEndRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.borderLight,
  },
  footerEndText: {
    fontSize: 11,
    color: T.textMuted,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  // ── Empty state ────────────────────────────────────
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: T.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: T.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 4,
    backgroundColor: T.brand,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 22,
    shadowColor: T.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyBtnText: {
    color: T.textInverse,
    fontSize: 13,
    fontWeight: "800",
  },

  // ── Bus picker bottom sheet ───────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.40)",
  },
  sheet: {
    backgroundColor: T.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === "ios" ? 38 : 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.borderMid,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
  },
  sheetDoneBtn: {
    backgroundColor: T.brandLight,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sheetDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.brand,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingBottom: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginRight: 18,
    borderTopWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: 0.3,
  },
});