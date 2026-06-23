import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getBuses, getComponents, saveComponents } from '../utils/storage';

export default function MapComponents() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBusId, setScannedBusId] = useState(null);
  const [busDetails, setBusDetails] = useState(null);
  const [scannedComponentIds, setScannedComponentIds] = useState([]);
  const [scanningMode, setScanningMode] = useState('bus'); // 'bus' or 'component'
  const [isScanning, setIsScanning] = useState(true);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }) => {
    if (!isScanning) return;
    setIsScanning(false);

    if (scanningMode === 'bus') {
      const buses = await getBuses();
      const foundBus = buses.find(b => b.id === data);
      
      if (foundBus) {
        setScannedBusId(data);
        setBusDetails(foundBus);
        setScanningMode('component');
        Alert.alert('Bus Found', `Master QR scanned for ${foundBus.busNumber}. Now scan components.`);
      } else {
        Alert.alert('Not Found', 'This QR does not match any known Bus Master QR.', [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
        return;
      }
    } else if (scanningMode === 'component') {
      if (scannedComponentIds.includes(data)) {
        Alert.alert('Already Scanned', 'You have already scanned this component.', [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
        return;
      }

      const components = await getComponents();
      const compIndex = components.findIndex(c => c.id === data);
      
      if (compIndex !== -1) {
        // Link it to the bus
        components[compIndex].busId = scannedBusId;
        await saveComponents(components);
        
        setScannedComponentIds(prev => [...prev, data]);
        Alert.alert('Success', `Added ${components[compIndex].category} to ${busDetails.busNumber}`, [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
      } else {
        Alert.alert('Not Found', 'Component QR not recognized.', [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
        return;
      }
    }
    
    // Slight delay before re-enabling scanning automatically (handled by alerts here mostly)
    setTimeout(() => setIsScanning(true), 2000);
  };

  const handleReset = () => {
    setScannedBusId(null);
    setBusDetails(null);
    setScannedComponentIds([]);
    setScanningMode('bus');
    setIsScanning(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>
        {scanningMode === 'bus' ? 'Step 1: Scan Master Bus QR' : `Step 2: Scan Components for ${busDetails?.busNumber}`}
      </Text>
      
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.statusText}>
          {scanningMode === 'component' ? `Components Scanned: ${scannedComponentIds.length}` : 'Awaiting Bus Scan...'}
        </Text>
        {scanningMode === 'component' && (
          <TouchableOpacity style={styles.doneButton} onPress={handleReset}>
            <Text style={styles.buttonText}>Finish & Scan New Bus</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
    fontWeight: 'bold',
    backgroundColor: '#2d3748',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: '#2d3748',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  doneButton: {
    backgroundColor: '#38a169',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    margin: 20,
  }
});
