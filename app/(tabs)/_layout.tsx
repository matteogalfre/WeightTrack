import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { useApp } from '@/context/AppContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { activeProfile } = useApp();
  const isFemale = activeProfile?.gender === 'female';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { 
          backgroundColor: '#1a1a1a', 
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerLeft: () => <ProfileSwitcher />,
        headerLeftContainerStyle: { paddingLeft: 16 },
        headerTitle: '',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarLabel: 'Accueil',
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="balance-scale" color={color} />,
          tabBarLabel: 'Poids',
        }}
      />
      <Tabs.Screen
        name="measurements"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="arrows-h" color={color} />,
          tabBarLabel: 'Mesures',
        }}
      />
      <Tabs.Screen
        name="cycle"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="moon-o" color={color} />,
          tabBarLabel: 'Cycle',
          href: isFemale ? '/cycle' : null, // Only show for female profiles
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
          tabBarLabel: 'Stats',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          tabBarLabel: 'Réglages',
        }}
      />
      {/* Hidden - profile management is now in ProfileSwitcher */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
