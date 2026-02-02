import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useApp, PHASE_INFO, getNextPeriodDate, CyclePhase } from '@/context/AppContext';
import SwipeableRow from '@/components/SwipeableRow';

export default function CycleScreen() {
  const { 
    data, 
    activeProfile, 
    addCycleEntry, 
    deleteCycleEntry, 
    updateCycleSettings,
    getCurrentPhase,
    getPhaseForDate,
  } = useApp();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [cycleDuration, setCycleDuration] = useState('28');
  const [periodDuration, setPeriodDuration] = useState('5');

  // Only show for female profiles
  if (!activeProfile || activeProfile.gender !== 'female') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>👩</Text>
        <Text style={styles.title}>Suivi de cycle</Text>
        <Text style={styles.subtitle}>Cette fonctionnalité est disponible uniquement pour les profils femme</Text>
      </View>
    );
  }

  const cycles = (data.cycleEntries || [])
    .filter(c => c.profileId === activeProfile.id)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const currentPhase = getCurrentPhase();
  const settings = activeProfile.cycleSettings || { cycleDuration: 28, periodDuration: 5 };
  const nextPeriod = getNextPeriodDate(cycles, settings);

  // Calculate average cycle length from history
  const averageCycleLength = useMemo(() => {
    if (cycles.length < 2) return null;
    let totalDays = 0;
    for (let i = 0; i < cycles.length - 1; i++) {
      const current = new Date(cycles[i].startDate);
      const previous = new Date(cycles[i + 1].startDate);
      totalDays += Math.round((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));
    }
    return Math.round(totalDays / (cycles.length - 1));
  }, [cycles]);

  // Get weight stats by phase
  const weightByPhase = useMemo(() => {
    const weights = data.weightEntries.filter(w => w.profileId === activeProfile.id);
    const phaseWeights: Record<CyclePhase, number[]> = {
      period: [],
      follicular: [],
      ovulation: [],
      luteal: [],
    };

    weights.forEach(w => {
      const phase = getPhaseForDate(new Date(w.date));
      if (phase) {
        phaseWeights[phase.phase].push(w.weight);
      }
    });

    const result: Record<CyclePhase, { avg: number; count: number } | null> = {
      period: null,
      follicular: null,
      ovulation: null,
      luteal: null,
    };

    (Object.keys(phaseWeights) as CyclePhase[]).forEach(phase => {
      const weights = phaseWeights[phase];
      if (weights.length > 0) {
        result[phase] = {
          avg: weights.reduce((a, b) => a + b, 0) / weights.length,
          count: weights.length,
        };
      }
    });

    return result;
  }, [data.weightEntries, activeProfile.id, getPhaseForDate]);

  // Overall average weight
  const overallAvg = useMemo(() => {
    const weights = data.weightEntries.filter(w => w.profileId === activeProfile.id);
    if (weights.length === 0) return null;
    return weights.reduce((a, b) => a + b.weight, 0) / weights.length;
  }, [data.weightEntries, activeProfile.id]);

  const handleAddPeriod = () => {
    let date: Date;
    
    if (selectedDate === 'today') {
      date = new Date();
    } else if (selectedDate === 'yesterday') {
      date = new Date();
      date.setDate(date.getDate() - 1);
    } else {
      // Parse custom date (format: JJ/MM/AAAA)
      const parts = customDate.split('/');
      if (parts.length !== 3) {
        Alert.alert('Erreur', 'Format de date invalide (JJ/MM/AAAA)');
        return;
      }
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (isNaN(date.getTime())) {
        Alert.alert('Erreur', 'Date invalide');
        return;
      }
    }

    addCycleEntry(date.toISOString());
    setModalVisible(false);
    setCustomDate('');
    setSelectedDate('today');
  };

  const handleSaveSettings = () => {
    const cycle = parseInt(cycleDuration);
    const period = parseInt(periodDuration);
    
    if (isNaN(cycle) || cycle < 20 || cycle > 45) {
      Alert.alert('Erreur', 'Durée du cycle invalide (20-45 jours)');
      return;
    }
    if (isNaN(period) || period < 2 || period > 10) {
      Alert.alert('Erreur', 'Durée des règles invalide (2-10 jours)');
      return;
    }

    updateCycleSettings({ cycleDuration: cycle, periodDuration: period });
    setSettingsVisible(false);
  };

  const openSettings = () => {
    setCycleDuration(String(settings.cycleDuration));
    setPeriodDuration(String(settings.periodDuration));
    setSettingsVisible(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  const daysUntilNextPeriod = nextPeriod 
    ? Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Current phase card */}
      {currentPhase ? (
        <View style={[styles.phaseCard, { borderLeftColor: PHASE_INFO[currentPhase.phase].color }]}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseEmoji}>{PHASE_INFO[currentPhase.phase].emoji}</Text>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{PHASE_INFO[currentPhase.phase].label}</Text>
              <Text style={styles.phaseDay}>Jour {currentPhase.dayInCycle} du cycle</Text>
            </View>
          </View>
          <Text style={styles.phaseDescription}>{PHASE_INFO[currentPhase.phase].description}</Text>
          
          {daysUntilNextPeriod !== null && daysUntilNextPeriod > 0 && (
            <View style={styles.prediction}>
              <Text style={styles.predictionText}>
                🗓️ Prochaines règles dans {daysUntilNextPeriod} jour{daysUntilNextPeriod > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyPhase}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>Commencez le suivi</Text>
          <Text style={styles.emptyText}>Ajoutez votre premier jour de règles pour activer le suivi</Text>
        </View>
      )}

      {/* Add period button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>🔴 Début des règles</Text>
      </TouchableOpacity>

      {/* Phase legend */}
      <View style={styles.legendCard}>
        <View style={styles.legendHeader}>
          <Text style={styles.sectionTitle}>Phases du cycle</Text>
          <TouchableOpacity onPress={openSettings}>
            <Text style={styles.settingsBtn}>⚙️ Paramètres</Text>
          </TouchableOpacity>
        </View>
        {(Object.keys(PHASE_INFO) as CyclePhase[]).map(phase => (
          <View key={phase} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PHASE_INFO[phase].color }]} />
            <Text style={styles.legendEmoji}>{PHASE_INFO[phase].emoji}</Text>
            <View style={styles.legendInfo}>
              <Text style={styles.legendName}>{PHASE_INFO[phase].label}</Text>
              <Text style={styles.legendDesc}>{PHASE_INFO[phase].description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Weight by phase stats */}
      {overallAvg && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Impact sur le poids</Text>
          <Text style={styles.avgInfo}>Moyenne générale: {overallAvg.toFixed(1)} kg</Text>
          <View style={styles.phaseStats}>
            {(Object.keys(PHASE_INFO) as CyclePhase[]).map(phase => {
              const stats = weightByPhase[phase];
              if (!stats) return (
                <View key={phase} style={styles.phaseStat}>
                  <Text style={styles.phaseStatEmoji}>{PHASE_INFO[phase].emoji}</Text>
                  <Text style={styles.phaseStatValue}>--</Text>
                  <Text style={styles.phaseStatLabel}>{PHASE_INFO[phase].label}</Text>
                </View>
              );
              
              const diff = stats.avg - overallAvg;
              return (
                <View key={phase} style={styles.phaseStat}>
                  <Text style={styles.phaseStatEmoji}>{PHASE_INFO[phase].emoji}</Text>
                  <Text style={styles.phaseStatValue}>{stats.avg.toFixed(1)}</Text>
                  <Text style={[
                    styles.phaseStatDiff,
                    { color: diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#888' }
                  ]}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                  </Text>
                  <Text style={styles.phaseStatCount}>({stats.count} pesées)</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Cycle history */}
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Historique ({cycles.length})</Text>
        {averageCycleLength && (
          <Text style={styles.avgCycle}>Moy: {averageCycleLength}j</Text>
        )}
      </View>

      {cycles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucun cycle enregistré</Text>
        </View>
      ) : (
        cycles.map((cycle, index) => {
          const prevCycle = cycles[index + 1];
          const cycleLength = prevCycle 
            ? Math.round((new Date(cycle.startDate).getTime() - new Date(prevCycle.startDate).getTime()) / (24 * 60 * 60 * 1000))
            : null;
          
          return (
            <SwipeableRow key={cycle.id} onDelete={() => deleteCycleEntry(cycle.id)}>
              <View style={styles.cycleCard}>
                <View style={styles.cycleRow}>
                  <View>
                    <Text style={styles.cycleDate}>{formatDate(cycle.startDate)}</Text>
                    {cycleLength && (
                      <Text style={styles.cycleLength}>Cycle de {cycleLength} jours</Text>
                    )}
                  </View>
                  <Text style={styles.cycleEmoji}>🔴</Text>
                </View>
              </View>
            </SwipeableRow>
          );
        })
      )}

      {/* Add period modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Début des règles</Text>
            
            <View style={styles.dateOptions}>
              {(['today', 'yesterday', 'custom'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.dateOption, selectedDate === option && styles.dateOptionActive]}
                  onPress={() => setSelectedDate(option)}
                >
                  <Text style={[styles.dateOptionText, selectedDate === option && styles.dateOptionTextActive]}>
                    {option === 'today' ? "Aujourd'hui" : option === 'yesterday' ? 'Hier' : 'Autre date'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedDate === 'custom' && (
              <TextInput
                style={styles.input}
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleAddPeriod}>
                <Text style={styles.modalBtnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paramètres du cycle</Text>
            
            <Text style={styles.label}>Durée du cycle (jours)</Text>
            <TextInput
              style={styles.input}
              value={cycleDuration}
              onChangeText={setCycleDuration}
              placeholder="28"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Durée des règles (jours)</Text>
            <TextInput
              style={styles.input}
              value={periodDuration}
              onChangeText={setPeriodDuration}
              placeholder="5"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveSettings}>
                <Text style={styles.modalBtnSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 16, textAlign: 'center' },

  phaseCard: { 
    backgroundColor: '#2a2a2a', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  phaseEmoji: { fontSize: 36, marginRight: 12 },
  phaseInfo: { flex: 1 },
  phaseName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  phaseDay: { color: '#888', fontSize: 14, marginTop: 2 },
  phaseDescription: { color: '#aaa', fontSize: 14 },
  prediction: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' },
  predictionText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },

  emptyPhase: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },

  addButton: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  legendCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  legendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settingsBtn: { color: '#6366f1', fontSize: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendEmoji: { fontSize: 20, marginRight: 8 },
  legendInfo: { flex: 1 },
  legendName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  legendDesc: { color: '#888', fontSize: 12 },

  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  avgInfo: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 12 },
  phaseStats: { flexDirection: 'row', justifyContent: 'space-between' },
  phaseStat: { alignItems: 'center', flex: 1 },
  phaseStatEmoji: { fontSize: 24, marginBottom: 4 },
  phaseStatValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  phaseStatDiff: { fontSize: 12, marginTop: 2 },
  phaseStatCount: { color: '#666', fontSize: 10, marginTop: 2 },
  phaseStatLabel: { color: '#888', fontSize: 11, marginTop: 4 },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  avgCycle: { color: '#888', fontSize: 14 },
  emptyCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 32, alignItems: 'center' },
  cycleCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 8 },
  cycleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cycleDate: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cycleLength: { color: '#888', fontSize: 13, marginTop: 4 },
  cycleEmoji: { fontSize: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  dateOptions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateOption: { flex: 1, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dateOptionActive: { borderColor: '#6366f1' },
  dateOptionText: { color: '#888', fontSize: 13 },
  dateOptionTextActive: { color: '#fff', fontWeight: '600' },
  label: { color: '#888', fontSize: 14, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#333' },
  modalBtnCancelText: { color: '#888', fontSize: 16, fontWeight: '600' },
  modalBtnSave: { backgroundColor: '#6366f1' },
  modalBtnSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
