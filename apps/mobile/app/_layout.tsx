import '../global.css';

import { NativeTabs } from 'expo-router/native-tabs';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="progress">
          <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="trending_up" />
          <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <StatusBar style="dark" />
    </>
  );
}
