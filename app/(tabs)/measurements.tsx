import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useApp } from '@/context/AppContext';

type MeasurementField = {
  key: 'waist' | 'hips' | 'chest' | 'thighs' | 'calves' | 'arms';
  label: string;
  icon: string;
};

const FIELDS: MeasurementField[] = [
  { key: 'waist', label: 'Tour de taille', icon: '📏' },
  { key: 'hips', label: 'Hanches', icon: '🦴' },
  { key: 'chest', label: 'Poitrine', icon: '👕' },
  { key: 'thighs', label: 'Cuisses', icon: '🦵' },
  { key: 'calves', label: 'Mollets', icon: '🦶' },
  { key: 'arms', label: 'Bras', icon: '💪' },
];

export default function MeasurementsScreen() {
  const { data, activeProfile, addMeasurementEntry, deleteMeasurementEntry } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  if (!activeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Créez un profil d'abord</Text>
      </View>
    );
  }

  const entries = data.measurementEntries
    .filter(e => e.profileId === activeProfile.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestEntry = entries[0];

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleSave = () => {
    const measurement: Record<string, number | undefined> = {};
    let hasValue = false;
    
    FIELDS.forEach(f => {
      const val = formValues[f.key];
      if (val) {
        const num = parseFloat(val.replace(',', '.'));
        if (!isNaN(num) && num > 0 && num < 300) {
          measurement[f.key] = num;
          hasValue = true;
        }
      }
    });

    if (!hasValue) {
      Alert.alert('Erreur', 'Entrez au moins une mesure');
      return;
    }

    addMeasurementEntry(measurement);
    setFormValues({});
    setModalVisible(false);
  };

  const getChange = (key: string): number | null => {
    if (entries.length < 2) return null;
    const current = entries[0]?.[key as keyof typeof entries[0]] as number | undefined;
    const previous = entries[1]?.[key as keyof typeof entries[1]] as number | undefined;
    if (current && previous) {
      return current - previous;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Ajouter des mensurations</Text>
        </TouchableOpacity>

        {latestEntry && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dernières mesures</Text>
            <Text style={styles.cardDate}>{formatDate(latestEntry.date)}</Text>
            <View style={styles.measurementsGrid}>
              {FIELDS.map(f => {
                const value = latestEntry[f.key];
                const change = getChange(f.key);
                if (!value) return null;
                return (
                  <View key={f.key} style={styles.measureItem}>
                    <Text style={styles.measureIcon}>{f.icon}</Text>
                    <Text style={styles.measureLabel}>{f.label}</Text>
                    <Text style={styles.measureValue}>{value} cm</Text>
                    {change !== null && change !== 0 && (
                      <Text style={[styles.measureChange, { color: change < 0 ? '#22c55e' : '#ef4444' }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Historique ({entries.length})</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune mensuration enregistrée</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.historyCard}
              onLongPress={() => Alert.alert('Supprimer', 'Supprimer cette entrée?', [
                { text: 'Annuler' },
                { text: 'Supprimer', onPress: () => deleteMeasurementEntry(entry.id), style: 'destructive' }
              ])}
            >
              <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
              <View style={styles.historyValues}>
                {FIELDS.map(f => {
                  const value = entry[f.key];
                  if (!value) return null;
                  return (
                    <Text key={f.key} style={styles.historyValue}>
                      {f.icon} {value}
                    </Text>
                  );
                })}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelles mensurations</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {FIELDS.map(f => (
                <View key={f.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{f.icon} {f.label} (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={formValues[f.key] || ''}
                    onChangeText={(text) => setFormValues(prev => ({ ...prev, [f.key]: text }))}
                    placeholder="--"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  scrollView: { flex: 1, padding: 16 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#888', fontSize: 16 },
  addButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardDate: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 16 },
  measurementsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  measureItem: { width: '50%', paddingHorizontal: 8, marginBottom: 16 },
  measureIcon: { fontSize: 20, marginBottom: 4 },
  measureLabel: { color: '#888', fontSize: 12 },
  measureValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  measureChange: { fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  emptyCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  historyCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 8 },
  historyDate: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  historyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  historyValue: { color: '#888', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalClose: { color: '#888', fontSize: 24, padding: 4 },
  modalScroll: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#fff', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  saveButton: { backgroundColor: '#6366f1', margin: 20, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
