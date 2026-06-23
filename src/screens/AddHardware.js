import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import RNPickerSelect from 'react-native-picker-select';
import uuid from 'react-native-uuid';
import { saveComponents, getComponents } from '../utils/storage';

export default function AddHardware() {
  const [category, setCategory] = useState('');
  const [hardwareId, setHardwareId] = useState('');
  const [dateOfPurchase, setDateOfPurchase] = useState(new Date().toISOString().split('T')[0]);
  const [vendorName, setVendorName] = useState('');
  const [generatedQR, setGeneratedQR] = useState(null);

  const categories = [
    { label: 'Esp32', value: 'Esp32' },
    { label: 'Pi zero', value: 'Pi zero' },
    { label: 'Pi 3', value: 'Pi 3' },
    { label: 'Battery bank', value: 'Battery bank' },
    { label: 'Wifi hotspot', value: 'Wifi hotspot' },
    { label: 'Buck converter', value: 'Buck converter' },
  ];

  const handleGenerate = async () => {
    if (!category || !hardwareId || !vendorName) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const newComponent = {
      id: uuid.v4(),
      category,
      hardwareId,
      dateOfPurchase,
      vendorName,
      status: 'active',
      busId: null,
    };

    try {
      const existing = await getComponents();
      existing.push(newComponent);
      await saveComponents(existing);

      setGeneratedQR(newComponent.id);
      Alert.alert('Success', 'Component added and QR generated!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save component');
    }
  };

  const handleReset = () => {
    setCategory('');
    setHardwareId('');
    setVendorName('');
    setGeneratedQR(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => setCategory(value)}
          items={categories}
          value={category}
          placeholder={{ label: 'Select a category...', value: null }}
          style={pickerSelectStyles}
        />
      </View>

      <Text style={styles.label}>Hardware ID (or Serial Number)</Text>
      <TextInput
        style={styles.input}
        value={hardwareId}
        onChangeText={setHardwareId}
        placeholder="e.g. SN-123456"
      />

      <Text style={styles.label}>Date of Purchase</Text>
      <TextInput
        style={styles.input}
        value={dateOfPurchase}
        onChangeText={setDateOfPurchase}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Vendor Name</Text>
      <TextInput
        style={styles.input}
        value={vendorName}
        onChangeText={setVendorName}
        placeholder="e.g. Amazon, Local Store"
      />

      {!generatedQR ? (
        <TouchableOpacity style={styles.button} onPress={handleGenerate}>
          <Text style={styles.buttonText}>Generate QR Code</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.qrContainer}>
          <Text style={styles.qrLabel}>Component QR Code (ID: {generatedQR.substring(0, 8)}...)</Text>
          <View style={styles.qrWrapper}>
            <QRCode value={generatedQR} size={200} />
          </View>
          <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={handleReset}>
            <Text style={styles.buttonText}>Add Another Component</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#3182ce',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  resetButton: {
    backgroundColor: '#4a5568',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3748',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderRadius: 10,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: 'black',
    paddingRight: 30, 
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: 'black',
    paddingRight: 30, 
  },
});
