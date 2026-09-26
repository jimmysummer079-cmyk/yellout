import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme/tokens';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? colors.amber : colors.mist, fontSize: 11, fontWeight: focused ? '700' : '500' }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(7,11,20,0.96)',
          borderTopColor: colors.voidBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.mist,
      }}
    >
      <Tabs.Screen
        name="vent"
        options={{
          title: '树洞倾诉',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎙</Text>,
          tabBarLabel: ({ focused }) => <TabLabel label="树洞倾诉" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plaza"
        options={{
          title: '同温层广场',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>〰</Text>,
          tabBarLabel: ({ focused }) => <TabLabel label="同温层广场" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
