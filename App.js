import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './src/screens/Login';
import Dashboard from './src/screens/Dashboard';
import AddHardware from './src/screens/AddHardware';
import BusMaster from './src/screens/BusMaster';
import MapComponents from './src/screens/MapComponents';
import ReplacePart from './src/screens/ReplacePart';
import DeactivatePart from './src/screens/DeactivatePart';
import Inventory from './src/screens/Inventory';
import Box from './src/screens/Box';
import EntryLogs from './src/screens/EntryLogs';
import FaceCaptures from './src/screens/FaceCaptures';
import Trip from './src/screens/Trip';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Add Hardware" component={AddHardware} />
        <Stack.Screen name="Bus Master" component={BusMaster} />
        <Stack.Screen name="Assign Components" component={MapComponents} />
        <Stack.Screen name="Replace Part" component={ReplacePart} />
        <Stack.Screen name="Deactivate Part" component={DeactivatePart} />
        <Stack.Screen name="Inventory" component={Inventory} />
        <Stack.Screen name="Box" component={Box} />
        <Stack.Screen name="Entry Logs" component={EntryLogs} />
        <Stack.Screen name="Face Captures" component={FaceCaptures} />
        <Stack.Screen name="Trip" component={Trip} options={{ title: 'Trips' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
