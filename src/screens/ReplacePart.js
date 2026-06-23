import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getBuses, getComponents, saveComponents, getHistory, saveHistory } from '../utils/storage';

export default function ReplacePart() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(1); // 1: Bus, 2: Old Part, 3: New Part
  const [scannedBusId, setScannedBusId] = useState(null);
  const [oldPartId, setOldPartId] = useState(null);
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
      if (step === 1) {
        const buses = await getBuses();
        const foundBus = buses.find(b => b.id === data);
        if (foundBus) {
          setScannedBusId(data);
          setStep(2);
          Alert.alert('Bus Found', `Master QR scanned for ${foundBus.busNumber}. Now scan the OLD part.`);
        } else {
          Alert.alert('Not Found', 'This QR does not match any known Bus Master QR.', [{ text: 'OK' }]);
        }
      } else if (step === 2) {
        const components = await getComponents();
        const oldPart = components.find(c => c.id === data && c.busId === scannedBusId);
        if (oldPart) {
          setOldPartId(data);
          setStep(3);
          Alert.alert('Old Part Identified', `Scanned ${oldPart.category}. Now scan the NEW part.`);
        } else {
          Alert.alert('Error', 'Component not found or not assigned to this bus.', [{ text: 'OK' }]);
        }
      } else if (step === 3) {
        const components = await getComponents();
        const newPartIndex = components.findIndex(c => c.id === data);
        const oldPartIndex = components.findIndex(c => c.id === oldPartId);

        if (newPartIndex !== -1 && oldPartIndex !== -1) {
          if (components[newPartIndex].busId) {
            Alert.alert('Error', 'This new part is already assigned to a bus!', [{ text: 'OK' }]);
            setIsScanning(true);
            return;
          }

          // Unlink old, link new
          components[oldPartIndex].busId = null;
          components[oldPartIndex].status = 'faulty'; // Assuming replaced means faulty
          components[newPartIndex].busId = scannedBusId;

          await saveComponents(components);

          // Save history
          const history = await getHistory();
          history.push({
            timestamp: new Date().toISOString(),
            action: 'replaced',
            busId: scannedBusId,
            oldPartId: oldPartId,
            newPartId: data,
          });
          await saveHistory(history);

          Alert.alert('Success', 'Part replaced successfully!', [
            { text: 'Done', onPress: handleReset }
          ]);
          return; // Skip setting isScanning since we reset
        } else {
          Alert.alert('Error', 'New component QR not recognized.', [{ text: 'OK' }]);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred during scanning.');
    }

    setTimeout(() => setIsScanning(true), 2000);
  };

  const handleReset = () => {
    setStep(1);
    setScannedBusId(null);
    setOldPartId(null);
    setIsScanning(true);
  };

  const getInstruction = () => {
    switch(step) {
      case 1: return 'Step 1: Scan Master Bus QR';
      case 2: return 'Step 2: Scan OLD Part QR';
      case 3: return 'Step 3: Scan NEW Part QR';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>{getInstruction()}</Text>
      
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
        <TouchableOpacity style={styles.cancelButton} onPress={handleReset}>
          <Text style={styles.buttonText}>Cancel / Restart</Text>
        </TouchableOpacity>
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
    backgroundColor: '#e53e3e',
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
  cancelButton: {
    backgroundColor: '#4a5568',
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
