import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useApp, Gender } from '@/context/AppContext';

type Mode = 'select' | 'create' | 'edit';

export default function ProfileSwitcher() {
  const { data, activeProfile, setActiveProfile, addProfile, updateProfile, deleteProfile } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('select');
  
  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  // Initialize edit form when switching to edit mode
  useEffect(() => {
    if (mode === 'edit' && activeProfile) {
      setName(activeProfile.name);
      setGender(activeProfile.gender);
      setHeight(String(activeProfile.height));
      setTargetWeight(activeProfile.targetWeight ? String(activeProfile.targetWeight) : '');
    }
  }, [mode, activeProfile]);

  const getEmoji = (g: Gender) => g === 'male' ? '👨' : '👩';

  const resetForm = () => {
    setName('');
    setGender('male');
    setHeight('');
    setTargetWeight('');
    setMode('select');
  };

  const handleCreate = () => {
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
    resetForm();
  };

  const handleUpdate = () => {
    if (!activeProfile) return;
    if (!name.trim()) { Alert.alert('Erreur', 'Entrez un nom'); return; }
    if (!height || parseInt(height) < 50 || parseInt(height) > 250) { 
      Alert.alert('Erreur', 'Taille invalide (50-250 cm)'); 
      return; 
    }
    
    updateProfile(activeProfile.id, {
      name: name.trim(),
      gender,
      height: parseInt(height),
      targetWeight: targetWeight ? parseFloat(targetWeight.replace(',', '.')) : undefined,
    });
    resetForm();
    setModalVisible(false);
  };

  const handleSelect = (id: string) => {
    setActiveProfile(id);
    setModalVisible(false);
  };

  const handleDelete = (id: string, profileName: string) => {
    Alert.alert(
      'Supprimer le profil',
      `Supprimer "${profileName}" et toutes ses données ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteProfile(id)
        }
      ]
    );
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.bubble} 
        onPress={() => setModalVisible(true)}
      >
        {activeProfile ? (
          <>
            <Text style={styles.bubbleEmoji}>{getEmoji(activeProfile.gender)}</Text>
            <Text style={styles.bubbleName} numberOfLines={1}>{activeProfile.name}</Text>
            <Text style={styles.bubbleArrow}>▼</Text>
          </>
        ) : (
          <Text style={styles.bubbleAdd}>+ Profil</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => { setModalVisible(false); resetForm(); }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.dropdown}>
            {mode === 'select' ? (
              <>
                <Text style={styles.dropdownTitle}>Changer de profil</Text>
                
                <ScrollView style={styles.profileList}>
                  {data.profiles.map(profile => (
                    <TouchableOpacity
                      key={profile.id}
                      style={[
                        styles.profileItem,
                        profile.id === activeProfile?.id && styles.profileItemActive
                      ]}
                      onPress={() => handleSelect(profile.id)}
                      onLongPress={() => handleDelete(profile.id, profile.name)}
                    >
                      <Text style={styles.profileEmoji}>{getEmoji(profile.gender)}</Text>
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile.name}</Text>
                        <Text style={styles.profileDetails}>
                          {profile.height} cm
                          {profile.targetWeight && ` • Objectif: ${profile.targetWeight} kg`}
                        </Text>
                      </View>
                      {profile.id === activeProfile?.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.buttonRow}>
                  {activeProfile && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => setMode('edit')}
                    >
                      <Text style={styles.editButtonText}>✏️ Modifier</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.addButton, !activeProfile && { flex: 1 }]}
                    onPress={() => setMode('create')}
                  >
                    <Text style={styles.addButtonText}>+ Nouveau</Text>
                  </TouchableOpacity>
                </View>

                {data.profiles.length > 0 && (
                  <Text style={styles.hint}>Appui long pour supprimer</Text>
                )}
              </>
            ) : (
              <>
                <View style={styles.formHeader}>
                  <TouchableOpacity onPress={resetForm}>
                    <Text style={styles.backButton}>← Retour</Text>
                  </TouchableOpacity>
                  <Text style={styles.dropdownTitle}>
                    {mode === 'create' ? 'Nouveau profil' : 'Modifier le profil'}
                  </Text>
                </View>

                <ScrollView style={styles.form}>
                  <Text style={styles.label}>Nom</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Prénom"
                    placeholderTextColor="#666"
                    autoFocus={mode === 'create'}
                  />

                  <Text style={styles.label}>Genre</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity
                      style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                      onPress={() => setGender('male')}
                    >
                      <Text style={styles.genderEmoji}>👨</Text>
                      <Text style={styles.genderText}>Homme</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                      onPress={() => setGender('female')}
                    >
                      <Text style={styles.genderEmoji}>👩</Text>
                      <Text style={styles.genderText}>Femme</Text>
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
                </ScrollView>

                <TouchableOpacity 
                  style={styles.createButton} 
                  onPress={mode === 'create' ? handleCreate : handleUpdate}
                >
                  <Text style={styles.createButtonText}>
                    {mode === 'create' ? 'Créer le profil' : 'Enregistrer'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  bubbleEmoji: { fontSize: 20 },
  bubbleName: { color: '#fff', fontSize: 14, fontWeight: '600', maxWidth: 80 },
  bubbleArrow: { color: '#888', fontSize: 10 },
  bubbleAdd: { color: '#6366f1', fontSize: 14, fontWeight: '600' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 16,
  },
  dropdown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  profileList: { maxHeight: 250 },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  profileItemActive: {
    backgroundColor: '#6366f130',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  profileEmoji: { fontSize: 28, marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  profileDetails: { color: '#888', fontSize: 13, marginTop: 2 },
  checkmark: { color: '#6366f1', fontSize: 18, fontWeight: 'bold' },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: { color: '#6366f1', fontSize: 14, fontWeight: 'bold' },
  addButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  hint: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 12 },

  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { color: '#6366f1', fontSize: 16, marginRight: 16 },
  form: { maxHeight: 320 },
  label: { color: '#888', fontSize: 14, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderBtnActive: { borderColor: '#6366f1' },
  genderEmoji: { fontSize: 28, marginBottom: 4 },
  genderText: { color: '#fff', fontSize: 14 },

  createButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
