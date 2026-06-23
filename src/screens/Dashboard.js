import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

export default function Dashboard({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bus Asset Management</Text>
      <Text style={styles.subtitle}>Select an action below to get started</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, { borderLeftColor: '#3182ce', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Bus Master')}>
          <Text style={styles.cardTitle}>🚌 Bus Master</Text>
          <Text style={styles.cardDesc}>Manage buses and generate Master QRs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { borderLeftColor: '#38a169', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Inventory')}>
          <Text style={styles.cardTitle}>📦 Inventory</Text>
          <Text style={styles.cardDesc}>Track parts and hardware availability</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { borderLeftColor: '#805ad5', borderLeftWidth: 4 }]} onPress={() => navigation.navigate('Box')}>
          <Text style={[styles.cardTitle, { color: '#805ad5' }]}>📦 Box Management</Text>
          <Text style={styles.cardDesc}>Create and assign IoT Boxes to Buses</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { borderLeftColor: '#d69e2e', borderLeftWidth: 4 }]} onPress={() => Alert.alert('Coming Soon', 'History module is under development.')}>
          <Text style={styles.cardTitle}>📜 History</Text>
          <Text style={styles.cardDesc}>View past actions and maintenance records</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
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
  cardDesc: {
    fontSize: 14,
    color: '#4a5568',
  },
});
