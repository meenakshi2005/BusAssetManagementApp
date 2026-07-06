import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import { getGPSTrackingLogsAPI } from '../utils/tripAPI';
import { getBusesAPI } from '../utils/storage';

const GPSTracking = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('CONSULTITBUS03');

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    setLogs([]);
    setPage(1);
    fetchLogs(0, selectedBus);
  }, [selectedBus]);

  const fetchBuses = async () => {
    try {
      const busList = await getBusesAPI();
      setBuses(busList || []);
    } catch (error) {
      console.log('Error fetching buses', error);
    }
  };

  const fetchLogs = async (offset = 0, currentBus = selectedBus) => {
    if (loading) return;
    setLoading(true);
    try {
      const limit = 100;
      const response = await getGPSTrackingLogsAPI(limit, offset, '', currentBus);
      if (response && response.logs) {
        if (offset === 0) {
          setLogs(response.logs);
        } else {
          setLogs(prev => [...prev, ...response.logs]);
        }
        setTotalPages(response.total_pages || 1);
        setPage(response.page || 1);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch GPS logs');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      fetchLogs(page * 100);
    }
  };

  const renderLog = ({ item }) => (
    <View style={styles.logCard}>
      {/* <View style={styles.logHeader}>
        <Text style={styles.logId}>ID: {item.id}</Text>
        <Text style={styles.logTopic}>{item.topic}</Text>
      </View> */}
      {/* <View style={styles.logRow}>
        <Text style={styles.logLabel}>Bus:</Text>
        <Text style={styles.logValue}>{item.bus_id || selectedBus}</Text>
      </View> */}
      <View style={styles.logRow}>
        <Text style={styles.logLabel}>Timestamp:</Text>
        <Text style={styles.logValue}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
      {/* <View style={styles.logRow}>
        <Text style={styles.logLabel}>Location:</Text>
        <Text style={styles.logValue}>{item.latitude}, {item.longitude}</Text>
      </View> */}
      <View style={styles.logRow}>
        <Text style={styles.logLabel}>Speed:</Text>
        <Text style={styles.logValue}>{item.speed} km/h</Text>
      </View>
    </View>
  );

  // Extract coordinates for Polyline, reverse to get oldest to newest order
  const coordinates = logs
    .filter(log => log.latitude != null && log.longitude != null)
    .map(log => ({
      latitude: log.latitude,
      longitude: log.longitude,
    }))
    .reverse();

  // Determine initial region based on latest location
  const initialRegion = coordinates.length > 0 ? {
    latitude: coordinates[coordinates.length - 1].latitude,
    longitude: coordinates[coordinates.length - 1].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null;

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
                key={idx} 
                label={bus.bus_no || bus.id || `Bus ${idx}`} 
                value={bus.bus_no || bus.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        {initialRegion ? (
          <MapView
            style={styles.map}
            initialRegion={initialRegion}
          >
            <Polyline
              coordinates={coordinates}
              strokeColor="#805ad5" // Purple color matching your theme
              strokeWidth={4}
            />
            {coordinates.length > 0 && (
              <Marker
                coordinate={coordinates[coordinates.length - 1]}
                title="Current Location"
                pinColor="#805ad5"
              />
            )}
          </MapView>
        ) : (
          <View style={[styles.map, styles.centerContainer]}>
            <Text style={styles.emptyText}>No map data available</Text>
          </View>
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
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLog}
            contentContainerStyle={styles.listContainer}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && logs.length > 0 ? (
                <ActivityIndicator size="small" color="#805ad5" style={{ marginVertical: 16 }} />
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No GPS tracking logs found.</Text>
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
    backgroundColor: '#f5f5f5',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  mapContainer: {
    flex: 0.4, // Takes up 40% of screen height
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  listSection: {
    flex: 0.6, // Takes up 60% of screen height
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  logCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#805ad5',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  logId: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  logTopic: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logLabel: {
    fontWeight: '600',
    color: '#555',
  },
  logValue: {
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
  }
});

export default GPSTracking;
