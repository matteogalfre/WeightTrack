import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Platform, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useApp, PHASE_INFO } from '@/context/AppContext';

type ExportFormat = 'json' | 'csv_weight' | 'csv_measurements' | 'csv_cycles';

export default function SettingsScreen() {
  const { data, activeProfile, exportData, importData, getPhaseForDate } = useApp();
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const shareFile = async (content: string, fileName: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      Alert.alert('Succes', 'Fichier telecharge!');
    } else {
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { 
          mimeType: mimeType === 'application/json' ? 'application/octet-stream' : mimeType, 
          dialogTitle: 'Exporter',
          UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Succes', `Fichier sauvegarde: ${fileName}`);
      }
    }
  };

  const generateWeightCSV = () => {
    const headers = ['Date', 'Heure', 'Profil', 'Poids (kg)', 'Phase cycle'];
    const rows = data.weightEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(entry => {
        const profile = data.profiles.find(p => p.id === entry.profileId);
        const date = new Date(entry.date);
        const phase = profile?.gender === 'female' ? getPhaseForDate(date) : null;
        return [
          date.toLocaleDateString('fr-FR'),
          date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          profile?.name || 'Inconnu',
          entry.weight.toFixed(1),
          phase ? PHASE_INFO[phase.phase].label : '',
        ].join(';');
      });
    return [headers.join(';'), ...rows].join('\n');
  };

  const generateMeasurementsCSV = () => {
    const headers = ['Date', 'Profil', 'Taille (cm)', 'Hanches (cm)', 'Poitrine (cm)', 'Cuisses (cm)', 'Mollets (cm)', 'Bras (cm)'];
    const rows = data.measurementEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(entry => {
        const profile = data.profiles.find(p => p.id === entry.profileId);
        return [
          new Date(entry.date).toLocaleDateString('fr-FR'),
          profile?.name || 'Inconnu',
          entry.waist || '',
          entry.hips || '',
          entry.chest || '',
          entry.thighs || '',
          entry.calves || '',
          entry.arms || '',
        ].join(';');
      });
    return [headers.join(';'), ...rows].join('\n');
  };

  const generateCyclesCSV = () => {
    const headers = ['Date début', 'Profil', 'Durée cycle (jours)'];
    const cycles = (data.cycleEntries || [])
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    const rows = cycles.map((entry, index) => {
      const profile = data.profiles.find(p => p.id === entry.profileId);
      const nextCycle = cycles[index + 1];
      const duration = nextCycle 
        ? Math.round((new Date(entry.startDate).getTime() - new Date(nextCycle.startDate).getTime()) / (24 * 60 * 60 * 1000))
        : '';
      return [
        new Date(entry.startDate).toLocaleDateString('fr-FR'),
        profile?.name || 'Inconnu',
        duration,
      ].join(';');
    });
    return [headers.join(';'), ...rows].join('\n');
  };

  const handleExport = async (format: ExportFormat) => {
    setExportModalVisible(false);
    
    const date = new Date().toISOString().split('T')[0];
    let content: string;
    let fileName: string;
    let mime: string;

    try {
      switch (format) {
        case 'json':
          content = exportData();
          fileName = `weighttrack_backup_${date}.json`;
          mime = 'application/json';
          break;
        case 'csv_weight':
          content = generateWeightCSV();
          fileName = `weighttrack_poids_${date}.csv`;
          mime = 'text/csv';
          break;
        case 'csv_measurements':
          content = generateMeasurementsCSV();
          fileName = `weighttrack_mensurations_${date}.csv`;
          mime = 'text/csv';
          break;
        case 'csv_cycles':
          content = generateCyclesCSV();
          fileName = `weighttrack_cycles_${date}.csv`;
          mime = 'text/csv';
          break;
        default:
          return;
      }
    } catch (error) {
      console.error('Export generation error:', error);
      Alert.alert('Erreur', 'Impossible de generer les donnees');
      return;
    }

    setTimeout(async () => {
      try {
        await shareFile(content, fileName, mime);
      } catch (error) {
        console.error('Export share error:', error);
        Alert.alert('Erreur', 'Impossible de partager le fichier');
      }
    }, 300);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      let jsonString: string;

      if (Platform.OS === 'web') {
        // Web import
        const response = await fetch(file.uri);
        jsonString = await response.text();
      } else {
        // Mobile import
        jsonString = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      Alert.alert(
        'Confirmer l\'import',
        'Cette action remplacera toutes les données actuelles. Continuer?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            style: 'destructive',
            onPress: () => {
              const success = importData(jsonString);
              if (success) {
                Alert.alert('Succès', 'Données importées avec succès!');
              } else {
                Alert.alert('Erreur', 'Fichier invalide ou corrompu');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      '⚠️ Supprimer toutes les données',
      'Cette action est irréversible. Toutes les données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            importData(JSON.stringify({
              profiles: [],
              activeProfileId: null,
              weightEntries: [],
              measurementEntries: [],
            }));
            Alert.alert('Succès', 'Toutes les données ont été supprimées');
          },
        },
      ]
    );
  };

  const cycleCount = (data.cycleEntries || []).length;
  const hasFemaleProfile = data.profiles.some(p => p.gender === 'female');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
      <Text style={styles.sectionTitle}>Exporter</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📤 Exporter les données</Text>
        <Text style={styles.cardDescription}>
          Sauvegardez vos données en JSON (backup complet) ou CSV (pour Excel/Google Sheets).
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => setExportModalVisible(true)}>
          <Text style={styles.buttonText}>Choisir le format d'export</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Importer</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📂 Restaurer une sauvegarde</Text>
        <Text style={styles.cardDescription}>
          Importez un fichier JSON précédemment exporté. Cela remplacera toutes les données actuelles.
        </Text>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleImport}>
          <Text style={styles.buttonTextSecondary}>Importer (JSON)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Données actuelles</Text>

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Profils</Text>
          <Text style={styles.statValue}>{data.profiles.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Entrées de poids</Text>
          <Text style={styles.statValue}>{data.weightEntries.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Mensurations</Text>
          <Text style={styles.statValue}>{data.measurementEntries.length}</Text>
        </View>
        {hasFemaleProfile && (
          <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.statLabel}>Cycles menstruels</Text>
            <Text style={styles.statValue}>{cycleCount}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Zone de danger</Text>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.cardTitle}>🗑️ Supprimer toutes les données</Text>
        <Text style={styles.cardDescription}>
          Supprime définitivement tous les profils et toutes les données. Cette action est irréversible.
        </Text>
        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handleClearAll}>
          <Text style={styles.buttonText}>Tout supprimer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>WeightTrack Pro v1.0</Text>
        <Text style={styles.footerSubtext}>Toutes les données sont stockées localement</Text>
      </View>

      {/* Export format modal */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir le format</Text>
            
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')}>
              <Text style={styles.exportIcon}>💾</Text>
              <View style={styles.exportInfo}>
                <Text style={styles.exportName}>Sauvegarde complète (JSON)</Text>
                <Text style={styles.exportDesc}>Pour restaurer plus tard</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv_weight')}>
              <Text style={styles.exportIcon}>⚖️</Text>
              <View style={styles.exportInfo}>
                <Text style={styles.exportName}>Historique poids (CSV)</Text>
                <Text style={styles.exportDesc}>Compatible Excel, Google Sheets</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv_measurements')}>
              <Text style={styles.exportIcon}>📏</Text>
              <View style={styles.exportInfo}>
                <Text style={styles.exportName}>Mensurations (CSV)</Text>
                <Text style={styles.exportDesc}>Compatible Excel, Google Sheets</Text>
              </View>
            </TouchableOpacity>

            {hasFemaleProfile && cycleCount > 0 && (
              <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv_cycles')}>
                <Text style={styles.exportIcon}>🔴</Text>
                <View style={styles.exportInfo}>
                  <Text style={styles.exportName}>Cycles menstruels (CSV)</Text>
                  <Text style={styles.exportDesc}>Pour suivi médical</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setExportModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  dangerCard: { borderWidth: 1, borderColor: '#ef444450' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardDescription: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  button: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#6366f1' },
  buttonDanger: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonTextSecondary: { color: '#6366f1', fontSize: 16, fontWeight: 'bold' },
  statsCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  statLabel: { color: '#888', fontSize: 16 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { color: '#888', fontSize: 14 },
  footerSubtext: { color: '#666', fontSize: 12, marginTop: 4 },
  
  // Export modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  exportOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', padding: 16, borderRadius: 12, marginBottom: 12 },
  exportIcon: { fontSize: 28, marginRight: 16 },
  exportInfo: { flex: 1 },
  exportName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  exportDesc: { color: '#888', fontSize: 13, marginTop: 2 },
  cancelButton: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#888', fontSize: 16 },
});
