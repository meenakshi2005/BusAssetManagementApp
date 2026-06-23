import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getComponents, saveComponents, getHistory, saveHistory } from '../utils/storage';

export default function DeactivatePart() {
  const [permission, requestPermission] = useCameraPermissions();
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

    try {
      const components = await getComponents();
      const compIndex = components.findIndex(c => c.id === data);

      if (compIndex !== -1) {
        Alert.alert(
          'Confirm Deactivation',
          `Are you sure you want to mark ${components[compIndex].category} (${components[compIndex].hardwareId}) as faulty?`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => setIsScanning(true)
            },
            {
              text: 'Deactivate',
              style: 'destructive',
              onPress: async () => {
                const oldBusId = components[compIndex].busId;
                components[compIndex].status = 'faulty';
                components[compIndex].busId = null; // Remove from bus if it was assigned
                
                await saveComponents(components);

                // Save history
                const history = await getHistory();
                history.push({
                  timestamp: new Date().toISOString(),
                  action: 'deactivated',
                  busId: oldBusId,
                  oldPartId: data,
                  newPartId: null,
                });
                await saveHistory(history);

                Alert.alert('Success', 'Component marked as faulty.', [
                  { text: 'OK', onPress: () => setIsScanning(true) }
                ]);
              }
            }
          ]
        );
      } else {
        Alert.alert('Not Found', 'Component QR not recognized.', [
          { text: 'OK', onPress: () => setIsScanning(true) }
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred during scanning.');
      setTimeout(() => setIsScanning(true), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Scan Part QR to Deactivate</Text>
      
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
        <Text style={styles.statusText}>Point camera at a component's QR code</Text>
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
    backgroundColor: '#c53030', // Red for danger
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
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    margin: 20,
  }
});
