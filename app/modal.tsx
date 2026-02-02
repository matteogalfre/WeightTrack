import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Gender } from '@/context/AppContext';

const QUICK_WEIGHTS = [-0.5, -0.2, +0.2, +0.5];

export default function ModalScreen() {
  const { activeProfile, data, addProfile, addWeightEntry } = useApp();
  const [mode, setMode] = useState<'weight' | 'profile'>(activeProfile ? 'weight' : 'profile');
  
  // Get last weight for quick adjustments
  const lastWeight = data.weightEntries
    .filter(e => e.profileId === activeProfile?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weight;
  
  // Weight state
  const [weight, setWeight] = useState(lastWeight?.toFixed(1) || '');
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday'>('today');
  
  // Profile state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  const handleQuickAdjust = (delta: number) => {
    const current = parseFloat(weight.replace(',', '.')) || lastWeight || 70;
    setWeight((current + delta).toFixed(1));
  };

  const handleSaveWeight = () => {
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 500) {
      Alert.alert('Erreur', 'Poids invalide (entre 20 et 500 kg)');
      return;
    }
    
    const date = selectedDate === 'yesterday' 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString();
    
    addWeightEntry(w, date);
    router.back();
  };

  const handleSaveProfile = () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Entrez un nom'); return; }
    if (!height || parseInt(height) < 50 || parseInt(height) > 250) { 
      Alert.alert('Erreur', 'Taille invalide (50-250 cm)'); 
      return; 
    }
    
    addProfile({
      name: name.trim(),
      gender,
      height: parseInt(height),
      targetWeight: targetWeight ? parseFloat(targetWeight.replace(',', '.')) : undefined,
    });
    router.back();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {activeProfile && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'weight' && styles.tabActive]}
            onPress={() => setMode('weight')}
          >
            <Text style={[styles.tabText, mode === 'weight' && styles.tabTextActive]}>⚖️ Pesée</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'profile' && styles.tabActive]}
            onPress={() => setMode('profile')}
          >
            <Text style={[styles.tabText, mode === 'profile' && styles.tabTextActive]}>👤 Profil</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'weight' && activeProfile ? (
        <View style={styles.form}>
          {/* Date selector */}
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={[styles.dateBtn, selectedDate === 'today' && styles.dateBtnActive]}
              onPress={() => setSelectedDate('today')}
            >
              <Text style={[styles.dateText, selectedDate === 'today' && styles.dateTextActive]}>
                Aujourd'hui
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, selectedDate === 'yesterday' && styles.dateBtnActive]}
              onPress={() => setSelectedDate('yesterday')}
            >
              <Text style={[styles.dateText, selectedDate === 'yesterday' && styles.dateTextActive]}>
                Hier
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Poids (kg)</Text>
          <TextInput
            style={styles.weightInput}
            value={weight}
            onChangeText={setWeight}
            placeholder="70.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            autoFocus
          />

          {/* Quick adjust buttons */}
          {lastWeight && (
            <View style={styles.quickAdjust}>
              {QUICK_WEIGHTS.map(delta => (
                <TouchableOpacity
                  key={delta}
                  style={styles.quickBtn}
                  onPress={() => handleQuickAdjust(delta)}
                >
                  <Text style={styles.quickBtnText}>
                    {delta > 0 ? '+' : ''}{delta}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveWeight}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Prénom"
            placeholderTextColor="#666"
            autoFocus={!activeProfile}
          />

          <Text style={styles.label}>Genre</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
              onPress={() => setGender('male')}
            >
              <Text style={styles.genderEmoji}>👨</Text>
              <Text style={styles.genderLabel}>Homme</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
              onPress={() => setGender('female')}
            >
              <Text style={styles.genderEmoji}>👩</Text>
              <Text style={styles.genderLabel}>Femme</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Taille (cm)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder="170"
            placeholderTextColor="#666"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Objectif de poids (kg) - optionnel</Text>
          <TextInput
            style={styles.input}
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="70"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Créer le profil</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  tabs: { flexDirection: 'row', marginBottom: 24, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { color: '#888', fontSize: 16 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  form: {},
  label: { color: '#888', fontSize: 14, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  
  // Date selector
  dateSelector: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dateBtn: { flex: 1, backgroundColor: '#2a2a2a', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dateBtnActive: { borderColor: '#6366f1' },
  dateText: { color: '#888', fontSize: 14 },
  dateTextActive: { color: '#fff', fontWeight: '600' },
  
  // Weight input
  weightInput: { 
    backgroundColor: '#2a2a2a', 
    borderRadius: 16, 
    padding: 24, 
    color: '#fff', 
    fontSize: 40, 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Quick adjust
  quickAdjust: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16 },
  quickBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  quickBtnText: { color: '#6366f1', fontSize: 16, fontWeight: 'bold' },
  
  // Gender
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  genderBtnActive: { borderColor: '#6366f1' },
  genderEmoji: { fontSize: 28, marginBottom: 4 },
  genderLabel: { color: '#fff', fontSize: 14 },
  
  saveButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginTop: 32, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
