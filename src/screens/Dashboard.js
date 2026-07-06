import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

export default function Dashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState('Master');

  const renderMaster = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Bus Asset Management</Text>
      <Text style={styles.subtitle}>Select an action below to get started</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#3182ce', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Bus Master')}>
          <Text style={styles.cardTitle}>🚌 Bus Master</Text>
          <Text style={styles.cardDesc}>Manage buses and generate Master QRs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#263b80', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Trip')}>
          <Text style={styles.tripTitle}>🚌 Trip</Text>
          <Text style={styles.cardDesc}>Manage Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#38a169', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Inventory')}>
          <Text style={styles.invTitle}>📦 Inventory</Text>
          <Text style={styles.cardDesc}>Track parts and hardware availability</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#805ad5', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Box')}>
          <Text style={[styles.cardTitle, { color: '#805ad5' }]}>📦 Box Management</Text>
          <Text style={styles.cardDesc}>Create and assign IoT Boxes to Buses</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity style={[styles.card, { borderLeftColor: '#e53e3e', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Add Hardware')}>
          <Text style={[styles.cardTitle, { color: '#e53e3e' }]}>➕ Add Hardware</Text>
          <Text style={styles.cardDesc}>Add new hardware parts</Text>
        </TouchableOpacity> */}
        {/* <TouchableOpacity style={[styles.card, { borderLeftColor: '#dd6b20', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Assign Components')}>
          <Text style={[styles.cardTitle, { color: '#dd6b20' }]}>🔗 Assign Components</Text>
          <Text style={styles.cardDesc}>Assign components to hardware</Text>
        </TouchableOpacity> */}
        {/* <TouchableOpacity style={[styles.card, { borderLeftColor: '#319795', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Replace Part')}>
          <Text style={[styles.cardTitle, { color: '#319795' }]}>🔄 Replace Part</Text>
          <Text style={styles.cardDesc}>Replace hardware parts</Text>
        </TouchableOpacity> */}
        {/* <TouchableOpacity style={[styles.card, { borderLeftColor: '#718096', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Deactivate Part')}>
          <Text style={[styles.cardTitle, { color: '#718096' }]}>❌ Deactivate Part</Text>
          <Text style={styles.cardDesc}>Deactivate hardware parts</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#d69e2e', borderLeftWidth: 4 }]} onPress={() => Alert.alert('Coming Soon', 'History module is under development.')}>
          <Text style={styles.hisTitle}>📜 History</Text>
          <Text style={styles.cardDesc}>View past actions and maintenance records</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAdmin = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Admin Modules</Text>
      <Text style={styles.subtitle}>Select an administrative action</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#e53e3e', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Entry Logs')}>
          <Text style={[styles.cardTitle, { color: '#e53e3e' }]}>📋 Entry Logs</Text>
          <Text style={styles.cardDesc}>View bus entry and exit records</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.card, { borderLeftColor: '#805ad5', borderLeftWidth: 4 }]}
          onPress={() => navigation.navigate('Face Captures')}
        >
          <Text style={[styles.cardTitle, { color: '#805ad5' }]}>🧑 Face Captures</Text>
          <Text style={styles.cardDesc}>View face capture counter records</Text>
        </TouchableOpacity>
         <TouchableOpacity 
          style={[styles.card, { borderLeftColor: '#805ad5', borderLeftWidth: 4 }]}
          onPress={() => navigation.navigate('GPS Tracking')}
        >
          <Text style={[styles.cardTitle, { color: '#805ad5' }]}>📍 GPS Tracking</Text>
          <Text style={styles.cardDesc}>View real-time GPS tracking logs</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
           <TouchableOpacity 
          style={[styles.tab, activeTab === 'Admin' && styles.activeTab]} 
          onPress={() => setActiveTab('Admin')}
        >
          <Text style={[styles.tabText, activeTab === 'Admin' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Master' && styles.activeTab]} 
          onPress={() => setActiveTab('Master')}
        >
          <Text style={[styles.tabText, activeTab === 'Master' && styles.activeTabText]}>Master</Text>
        </TouchableOpacity>
     
      </View>
      
      {activeTab === 'Master' ? renderMaster() : renderAdmin()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 30,
    textAlign: 'center',
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3182ce',
    marginBottom: 4,
  },
   hisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d69e2e',
    marginBottom: 4,
  },
   invTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#38a169',
    marginBottom: 4,
  },
   tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#263b80',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#4a5568',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3182ce',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#3182ce',
  },
});
