import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function ProfileScreen() {
  const { data, activeProfile, setActiveProfile, deleteProfile } = useApp();

  const getEmoji = (g: string) => g === 'male' ? '👨' : '👩';

  return (
    <ScrollView style={styles.container}>
      <Link href="/modal" asChild>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouveau profil</Text>
        </TouchableOpacity>
      </Link>

      <Text style={styles.sectionTitle}>Profils ({data.profiles.length})</Text>

      {data.profiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucun profil</Text>
        </View>
      ) : (
        data.profiles.map(profile => {
          const isActive = profile.id === activeProfile?.id;
          return (
            <TouchableOpacity
              key={profile.id}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => setActiveProfile(profile.id)}
              onLongPress={() => Alert.alert('Supprimer', `Supprimer ${profile.name}?`, [
                { text: 'Annuler' },
                { text: 'Supprimer', onPress: () => deleteProfile(profile.id) }
              ])}
            >
              <View style={styles.row}>
                <Text style={styles.emoji}>{getEmoji(profile.gender)}</Text>
                <View style={styles.info}>
                  <Text style={styles.name}>{profile.name}</Text>
                  <Text style={styles.details}>{profile.height} cm</Text>
                </View>
                {isActive && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Actif</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  addButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginBottom: 24, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  cardActive: { borderColor: '#6366f1' },
  emptyCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 32, marginRight: 16 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  details: { color: '#888', fontSize: 14, marginTop: 4 },
  badge: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
