import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useApp, PHASE_INFO } from '@/context/AppContext';
import SwipeableRow from '@/components/SwipeableRow';

export default function WeightScreen() {
  const { data, activeProfile, deleteWeightEntry, getPhaseForDate } = useApp();
  
  const isFemale = activeProfile?.gender === 'female';

  if (!activeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Créez un profil d'abord</Text>
      </View>
    );
  }

  const entries = data.weightEntries
    .filter(e => e.profileId === activeProfile.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
      <Link href="/modal" asChild>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Ajouter pesée</Text>
        </TouchableOpacity>
      </Link>

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Historique ({entries.length})</Text>
        {entries.length > 0 && (
          <Text style={styles.swipeHint}>← Glisser pour supprimer</Text>
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucune pesée</Text>
        </View>
      ) : (
        entries.map((entry, i) => {
          const prev = entries[i + 1];
          const change = prev ? entry.weight - prev.weight : null;
          const phase = isFemale ? getPhaseForDate(new Date(entry.date)) : null;
          
          return (
            <SwipeableRow key={entry.id} onDelete={() => deleteWeightEntry(entry.id)}>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.leftContent}>
                    <View style={styles.weightRow}>
                      <Text style={styles.weight}>{entry.weight.toFixed(1)} kg</Text>
                      {phase && (
                        <View style={[styles.phaseBadge, { backgroundColor: PHASE_INFO[phase.phase].color + '30' }]}>
                          <Text style={styles.phaseEmoji}>{PHASE_INFO[phase.phase].emoji}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.date}>{formatDate(entry.date)}</Text>
                  </View>
                  {change !== null && (
                    <View style={styles.changeContainer}>
                      <Text style={[styles.change, { color: change > 0 ? '#ef4444' : change < 0 ? '#22c55e' : '#888' }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </SwipeableRow>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#888', fontSize: 16 },
  addButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginBottom: 24, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  swipeHint: { color: '#666', fontSize: 12 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 8 },
  emptyCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftContent: { flex: 1 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weight: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  phaseEmoji: { fontSize: 14 },
  date: { color: '#888', fontSize: 14, marginTop: 4 },
  changeContainer: { alignItems: 'flex-end' },
  change: { fontSize: 16, fontWeight: 'bold' },
});
