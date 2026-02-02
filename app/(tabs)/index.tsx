import { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useApp, PHASE_INFO, getNextPeriodDate } from '@/context/AppContext';

// IMC calculation and interpretation
const calculateBMI = (weight: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
};

const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: '#3b82f6' };
  if (bmi < 25) return { label: 'Poids normal', color: '#22c55e' };
  if (bmi < 30) return { label: 'Surpoids', color: '#f59e0b' };
  if (bmi < 35) return { label: 'Obésité modérée', color: '#ef4444' };
  if (bmi < 40) return { label: 'Obésité sévère', color: '#dc2626' };
  return { label: 'Obésité morbide', color: '#991b1b' };
};

// Calculate trend over a period
const calculateTrend = (entries: { weight: number; date: string }[], days: number): number | null => {
  if (entries.length < 2) return null;
  
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const recentEntries = entries.filter(e => new Date(e.date) >= cutoff);
  if (recentEntries.length < 2) return null;
  
  const oldest = recentEntries[recentEntries.length - 1].weight;
  const newest = recentEntries[0].weight;
  
  return newest - oldest;
};

export default function HomeScreen() {
  const { data, activeProfile, isLoading, getCurrentPhase } = useApp();

  const weightEntries = useMemo(() => {
    if (!activeProfile) return [];
    return data.weightEntries
      .filter(e => e.profileId === activeProfile.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.weightEntries, activeProfile]);

  const latestWeight = weightEntries[0]?.weight;
  
  const bmi = useMemo(() => {
    if (!latestWeight || !activeProfile) return null;
    return calculateBMI(latestWeight, activeProfile.height);
  }, [latestWeight, activeProfile]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    return getBMICategory(bmi);
  }, [bmi]);

  const trends = useMemo(() => ({
    week: calculateTrend(weightEntries, 7),
    month: calculateTrend(weightEntries, 30),
    quarter: calculateTrend(weightEntries, 90),
  }), [weightEntries]);

  // Cycle data for female profiles
  const isFemale = activeProfile?.gender === 'female';
  const currentPhase = isFemale ? getCurrentPhase() : null;
  
  const cycleInfo = useMemo(() => {
    if (!isFemale || !activeProfile || !data.cycleEntries) return null;
    const cycles = data.cycleEntries.filter(c => c.profileId === activeProfile.id);
    if (cycles.length === 0) return null;
    
    const settings = activeProfile.cycleSettings || { cycleDuration: 28, periodDuration: 5 };
    const nextPeriod = getNextPeriodDate(cycles, settings);
    
    if (!nextPeriod) return null;
    
    const daysUntil = Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
    return { nextPeriod, daysUntil };
  }, [data.cycleEntries, activeProfile, isFemale]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Chargement...</Text>
      </View>
    );
  }

  if (!activeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>WeightTrack Pro</Text>
        <Text style={styles.subtitle}>Créez un profil pour commencer</Text>
        <Link href="/modal" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Créer un profil</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  const measurementCount = data.measurementEntries.filter(e => e.profileId === activeProfile.id).length;

  return (
    <ScrollView style={styles.container}>
      {/* Quick summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.greeting}>Bonjour {activeProfile.name} 👋</Text>
        <Text style={styles.summaryText}>{activeProfile.height} cm</Text>
      </View>

      {/* Quick Add */}
      <Link href="/modal" asChild>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Ajouter pesée</Text>
        </TouchableOpacity>
      </Link>

      {/* Current Weight + BMI */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Poids actuel</Text>
        {latestWeight ? (
          <>
            <Text style={styles.bigNumber}>{latestWeight.toFixed(1)} kg</Text>
            {bmi && bmiCategory && (
              <View style={styles.bmiContainer}>
                <Text style={styles.bmiValue}>IMC: {bmi.toFixed(1)}</Text>
                <View style={[styles.bmiTag, { backgroundColor: bmiCategory.color + '30' }]}>
                  <Text style={[styles.bmiLabel, { color: bmiCategory.color }]}>{bmiCategory.label}</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noData}>Aucune pesée</Text>
        )}
      </View>

      {/* Cycle phase card (female only) */}
      {isFemale && currentPhase && (
        <View style={[styles.cycleCard, { borderLeftColor: PHASE_INFO[currentPhase.phase].color }]}>
          <View style={styles.cycleHeader}>
            <Text style={styles.cycleEmoji}>{PHASE_INFO[currentPhase.phase].emoji}</Text>
            <View style={styles.cycleInfo}>
              <Text style={styles.cyclePhaseName}>{PHASE_INFO[currentPhase.phase].label}</Text>
              <Text style={styles.cycleDayInfo}>Jour {currentPhase.dayInCycle} du cycle</Text>
            </View>
            {cycleInfo && cycleInfo.daysUntil > 0 && cycleInfo.daysUntil <= 7 && (
              <View style={styles.cyclePrediction}>
                <Text style={styles.cyclePredictionText}>🩸 {cycleInfo.daysUntil}j</Text>
              </View>
            )}
          </View>
          {currentPhase.phase === 'luteal' && (
            <Text style={styles.cycleHint}>💧 Rétention d'eau possible</Text>
          )}
        </View>
      )}

      {/* Trends */}
      {(trends.week !== null || trends.month !== null || trends.quarter !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tendances</Text>
          <View style={styles.trendsGrid}>
            {trends.week !== null && (
              <View style={styles.trendItem}>
                <Text style={styles.trendPeriod}>7 jours</Text>
                <Text style={[styles.trendValue, { color: trends.week < 0 ? '#22c55e' : trends.week > 0 ? '#ef4444' : '#888' }]}>
                  {trends.week > 0 ? '+' : ''}{trends.week.toFixed(1)} kg
                </Text>
              </View>
            )}
            {trends.month !== null && (
              <View style={styles.trendItem}>
                <Text style={styles.trendPeriod}>30 jours</Text>
                <Text style={[styles.trendValue, { color: trends.month < 0 ? '#22c55e' : trends.month > 0 ? '#ef4444' : '#888' }]}>
                  {trends.month > 0 ? '+' : ''}{trends.month.toFixed(1)} kg
                </Text>
              </View>
            )}
            {trends.quarter !== null && (
              <View style={styles.trendItem}>
                <Text style={styles.trendPeriod}>3 mois</Text>
                <Text style={[styles.trendValue, { color: trends.quarter < 0 ? '#22c55e' : trends.quarter > 0 ? '#ef4444' : '#888' }]}>
                  {trends.quarter > 0 ? '+' : ''}{trends.quarter.toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Goal */}
      {activeProfile.targetWeight && latestWeight && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Objectif</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalCurrent}>{latestWeight.toFixed(1)}</Text>
            <Text style={styles.goalArrow}>→</Text>
            <Text style={styles.goalTarget}>{activeProfile.targetWeight} kg</Text>
          </View>
          {(() => {
            const target = activeProfile.targetWeight;
            const current = latestWeight;
            const firstWeight = weightEntries[weightEntries.length - 1]?.weight || current;
            const isGaining = target > firstWeight; // Objectif de prise de poids
            const isLosing = target < firstWeight; // Objectif de perte de poids
            
            let progress = 0;
            let remaining = 0;
            let goalReached = false;

            if (isGaining) {
              // Prise de poids : 67 -> 70
              goalReached = current >= target;
              remaining = target - current;
              progress = goalReached ? 100 : Math.max(0, ((current - firstWeight) / (target - firstWeight)) * 100);
            } else if (isLosing) {
              // Perte de poids : 80 -> 70
              goalReached = current <= target;
              remaining = current - target;
              progress = goalReached ? 100 : Math.max(0, ((firstWeight - current) / (firstWeight - target)) * 100);
            } else {
              // Objectif = poids initial
              goalReached = Math.abs(current - target) < 0.5;
              remaining = Math.abs(current - target);
              progress = goalReached ? 100 : 50;
            }

            return (
              <>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
                </View>
                <View style={styles.goalInfo}>
                  {goalReached ? (
                    <Text style={styles.goalReached}>🎉 Objectif atteint!</Text>
                  ) : (
                    <Text style={styles.remaining}>
                      {isGaining ? '↑' : '↓'} {Math.abs(remaining).toFixed(1)} kg restants
                    </Text>
                  )}
                  {!goalReached && progress > 0 && (
                    <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
                  )}
                </View>
              </>
            );
          })()}
        </View>
      )}

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{weightEntries.length}</Text>
          <Text style={styles.statLabel}>pesées</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{measurementCount}</Text>
          <Text style={styles.statLabel}>mensurations</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 24 },
  text: { color: '#888', fontSize: 16 },
  button: { backgroundColor: '#6366f1', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  summaryCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  summaryText: { color: '#888', fontSize: 14, marginTop: 4 },
  
  addButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  bigNumber: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  noData: { color: '#666', fontSize: 18, fontStyle: 'italic' },
  
  bmiContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  bmiValue: { color: '#888', fontSize: 16 },
  bmiTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  bmiLabel: { fontSize: 13, fontWeight: '600' },
  
  trendsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  trendItem: { alignItems: 'center', flex: 1 },
  trendPeriod: { color: '#888', fontSize: 12, marginBottom: 4 },
  trendValue: { fontSize: 18, fontWeight: 'bold' },
  
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalCurrent: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  goalArrow: { color: '#888', fontSize: 20 },
  goalTarget: { color: '#6366f1', fontSize: 24, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: '#333', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  goalInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  remaining: { color: '#888', fontSize: 14 },
  goalReached: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  progressText: { color: '#6366f1', fontSize: 14, fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 14, marginTop: 4 },
  
  // Cycle card
  cycleCard: { 
    backgroundColor: '#2a2a2a', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  cycleHeader: { flexDirection: 'row', alignItems: 'center' },
  cycleEmoji: { fontSize: 28, marginRight: 12 },
  cycleInfo: { flex: 1 },
  cyclePhaseName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cycleDayInfo: { color: '#888', fontSize: 13, marginTop: 2 },
  cyclePrediction: { backgroundColor: '#ef444430', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  cyclePredictionText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  cycleHint: { color: '#888', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
