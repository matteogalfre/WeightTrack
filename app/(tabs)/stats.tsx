import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useApp, PHASE_INFO, CyclePhase } from '@/context/AppContext';

type Period = '7d' | '30d' | '3m' | '1y' | 'all';
type ChartType = 'weight' | 'measurements';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7J' },
  { key: '30d', label: '30J' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1A' },
  { key: 'all', label: 'Tout' },
];

const MEASUREMENT_COLORS: Record<string, string> = {
  waist: '#f59e0b',
  hips: '#ec4899',
  chest: '#8b5cf6',
  thighs: '#06b6d4',
  calves: '#10b981',
  arms: '#ef4444',
};

const MEASUREMENT_LABELS: Record<string, string> = {
  waist: 'Taille',
  hips: 'Hanches',
  chest: 'Poitrine',
  thighs: 'Cuisses',
  calves: 'Mollets',
  arms: 'Bras',
};

export default function StatsScreen() {
  const { data, activeProfile, getPhaseForDate } = useApp();
  const [period, setPeriod] = useState<Period>('30d');
  const [chartType, setChartType] = useState<ChartType>('weight');
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>('waist');
  
  const screenWidth = Dimensions.get('window').width - 48;
  const isFemale = activeProfile?.gender === 'female';
  const hasCycleData = (data.cycleEntries || []).filter(c => c.profileId === activeProfile?.id).length > 0;

  const filterByPeriod = (entries: { date: string }[]) => {
    const now = new Date();
    let cutoff = new Date(0);
    
    switch (period) {
      case '7d': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '3m': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      case 'all': break;
    }
    
    return entries.filter(e => new Date(e.date) >= cutoff);
  };

  const weightData = useMemo(() => {
    if (!activeProfile) return [];
    
    const entries = data.weightEntries
      .filter(e => e.profileId === activeProfile.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const filtered = filterByPeriod(entries);
    
    return filtered.map((e, i) => ({
      value: e.weight,
      label: i === 0 || i === filtered.length - 1 
        ? new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : '',
      dataPointText: e.weight.toFixed(1),
    }));
  }, [data.weightEntries, activeProfile, period]);

  const measurementData = useMemo(() => {
    if (!activeProfile) return [];
    
    const entries = data.measurementEntries
      .filter(e => e.profileId === activeProfile.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const filtered = filterByPeriod(entries);
    
    return filtered
      .filter(e => e[selectedMeasurement as keyof typeof e])
      .map((e, i, arr) => ({
        value: e[selectedMeasurement as keyof typeof e] as number,
        label: i === 0 || i === arr.length - 1
          ? new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : '',
        dataPointText: String(e[selectedMeasurement as keyof typeof e]),
      }));
  }, [data.measurementEntries, activeProfile, period, selectedMeasurement]);

  const stats = useMemo(() => {
    const entries = chartType === 'weight' ? weightData : measurementData;
    if (entries.length === 0) return null;
    
    const values = entries.map(e => e.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, change, avg, count: entries.length };
  }, [weightData, measurementData, chartType]);

  // Weight stats by cycle phase (only for female profiles with cycle data)
  const weightByPhase = useMemo(() => {
    if (!isFemale || !hasCycleData || !activeProfile) return null;
    
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

    const result: Record<CyclePhase, { avg: number; count: number; diff: number } | null> = {
      period: null,
      follicular: null,
      ovulation: null,
      luteal: null,
    };

    const allWeights = weights.map(w => w.weight);
    const overallAvg = allWeights.length > 0 
      ? allWeights.reduce((a, b) => a + b, 0) / allWeights.length 
      : 0;

    (Object.keys(phaseWeights) as CyclePhase[]).forEach(phase => {
      const ws = phaseWeights[phase];
      if (ws.length > 0) {
        const avg = ws.reduce((a, b) => a + b, 0) / ws.length;
        result[phase] = {
          avg,
          count: ws.length,
          diff: avg - overallAvg,
        };
      }
    });

    return { byPhase: result, overallAvg };
  }, [data.weightEntries, activeProfile, isFemale, hasCycleData, getPhaseForDate]);

  const normalizedChart = useMemo(() => {
    const entries = chartType === 'weight' ? weightData : measurementData;
    if (!stats || entries.length === 0) {
      return { data: entries, yMin: 0, yMax: undefined, offset: 0 };
    }

    const range = stats.max - stats.min;
    const padding = Math.max(range * 0.2, 1);
    const yMin = stats.min - padding;
    const yMax = stats.max + padding;
    const totalRange = yMax - yMin;

    const normalized = entries.map(e => ({
      ...e,
      value: e.value - yMin,
    }));

    return { data: normalized, yMin, yMax, offset: yMin, totalRange };
  }, [weightData, measurementData, chartType, stats]);

  if (!activeProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Créez un profil d'abord</Text>
      </View>
    );
  }

  const chartColor = chartType === 'weight' ? '#6366f1' : MEASUREMENT_COLORS[selectedMeasurement];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
      {/* Type selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, chartType === 'weight' && styles.typeButtonActive]}
          onPress={() => setChartType('weight')}
        >
          <Text style={[styles.typeText, chartType === 'weight' && styles.typeTextActive]}>⚖️ Poids</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, chartType === 'measurements' && styles.typeButtonActive]}
          onPress={() => setChartType('measurements')}
        >
          <Text style={[styles.typeText, chartType === 'measurements' && styles.typeTextActive]}>📏 Mensurations</Text>
        </TouchableOpacity>
      </View>

      {/* Measurement selector */}
      {chartType === 'measurements' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.measurementSelector}>
          {Object.keys(MEASUREMENT_LABELS).map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.measurementButton,
                selectedMeasurement === key && { backgroundColor: MEASUREMENT_COLORS[key] }
              ]}
              onPress={() => setSelectedMeasurement(key)}
            >
              <Text style={[
                styles.measurementText,
                selectedMeasurement === key && styles.measurementTextActive
              ]}>
                {MEASUREMENT_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Period selector */}
      <View style={styles.periodSelector}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        {normalizedChart.data.length >= 2 ? (
          <LineChart
            data={normalizedChart.data}
            width={screenWidth - 32}
            height={220}
            color={chartColor}
            thickness={3}
            dataPointsColor={chartColor}
            dataPointsRadius={5}
            startFillColor={chartColor}
            endFillColor={chartColor}
            startOpacity={0.3}
            endOpacity={0.05}
            areaChart
            curved
            animateOnDataChange
            animationDuration={500}
            yAxisColor="transparent"
            xAxisColor="#333"
            yAxisTextStyle={{ color: '#888', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
            hideRules
            showVerticalLines
            verticalLinesColor="#333"
            noOfSections={5}
            maxValue={normalizedChart.totalRange}
            formatYLabel={(label: string) => (parseFloat(label) + normalizedChart.offset).toFixed(1)}
            spacing={(screenWidth - 80) / Math.max(normalizedChart.data.length - 1, 1)}
            initialSpacing={16}
            endSpacing={16}
            pointerConfig={{
              pointerStripHeight: 160,
              pointerStripColor: chartColor,
              pointerStripWidth: 2,
              pointerColor: chartColor,
              radius: 6,
              pointerLabelWidth: 100,
              pointerLabelHeight: 40,
              activatePointersOnLongPress: true,
              pointerLabelComponent: (items: { value: number }[]) => (
                <View style={styles.pointerLabel}>
                  <Text style={styles.pointerText}>
                    {(items[0].value + normalizedChart.offset).toFixed(1)} {chartType === 'weight' ? 'kg' : 'cm'}
                  </Text>
                </View>
              ),
            }}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              {normalizedChart.data.length === 0 
                ? 'Pas de données sur cette période'
                : 'Il faut au moins 2 points pour afficher le graphique'}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      {stats && stats.count >= 1 && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Variation</Text>
            <Text style={[styles.statValue, { color: stats.change < 0 ? '#22c55e' : stats.change > 0 ? '#ef4444' : '#fff' }]}>
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} {chartType === 'weight' ? 'kg' : 'cm'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Minimum</Text>
            <Text style={styles.statValue}>{stats.min.toFixed(1)} {chartType === 'weight' ? 'kg' : 'cm'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Maximum</Text>
            <Text style={styles.statValue}>{stats.max.toFixed(1)} {chartType === 'weight' ? 'kg' : 'cm'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Moyenne</Text>
            <Text style={styles.statValue}>{stats.avg.toFixed(1)} {chartType === 'weight' ? 'kg' : 'cm'}</Text>
          </View>
        </View>
      )}

      {/* Cycle phase stats (female only) */}
      {chartType === 'weight' && weightByPhase && (
        <View style={styles.cycleStatsCard}>
          <Text style={styles.cycleStatsTitle}>📊 Poids par phase du cycle</Text>
          <Text style={styles.cycleStatsSubtitle}>
            Moyenne générale: {weightByPhase.overallAvg.toFixed(1)} kg
          </Text>
          <View style={styles.phaseStatsGrid}>
            {(Object.keys(PHASE_INFO) as CyclePhase[]).map(phase => {
              const phaseStats = weightByPhase.byPhase[phase];
              return (
                <View key={phase} style={styles.phaseStatItem}>
                  <View style={[styles.phaseIndicator, { backgroundColor: PHASE_INFO[phase].color }]} />
                  <Text style={styles.phaseStatEmoji}>{PHASE_INFO[phase].emoji}</Text>
                  <Text style={styles.phaseStatName}>{PHASE_INFO[phase].label}</Text>
                  {phaseStats ? (
                    <>
                      <Text style={styles.phaseStatAvg}>{phaseStats.avg.toFixed(1)} kg</Text>
                      <Text style={[
                        styles.phaseStatDiff,
                        { color: phaseStats.diff > 0 ? '#ef4444' : phaseStats.diff < 0 ? '#22c55e' : '#888' }
                      ]}>
                        {phaseStats.diff > 0 ? '+' : ''}{phaseStats.diff.toFixed(1)} kg
                      </Text>
                      <Text style={styles.phaseStatCount}>({phaseStats.count} pesées)</Text>
                    </>
                  ) : (
                    <Text style={styles.phaseStatNoData}>Pas de données</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.cycleStatsHint}>
            💡 La phase lutéale peut entraîner une rétention d'eau naturelle
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#888', fontSize: 16 },
  typeSelector: { flexDirection: 'row', backgroundColor: '#2a2a2a', borderRadius: 12, padding: 4, marginBottom: 16 },
  typeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  typeButtonActive: { backgroundColor: '#6366f1' },
  typeText: { color: '#888', fontSize: 14, fontWeight: '600' },
  typeTextActive: { color: '#fff' },
  measurementSelector: { marginBottom: 16 },
  measurementButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2a2a2a', borderRadius: 20, marginRight: 8 },
  measurementText: { color: '#888', fontSize: 14 },
  measurementTextActive: { color: '#fff', fontWeight: 'bold' },
  periodSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  periodButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2a2a2a', borderRadius: 8 },
  periodButtonActive: { backgroundColor: '#6366f1' },
  periodText: { color: '#888', fontSize: 14, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  chartCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16, overflow: 'hidden' },
  noDataContainer: { height: 220, alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: '#666', fontSize: 14, textAlign: 'center' },
  pointerLabel: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pointerText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 16 },
  statCard: { width: '50%', padding: 6 },
  statLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16 },
  
  // Cycle phase stats
  cycleStatsCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 },
  cycleStatsTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cycleStatsSubtitle: { color: '#888', fontSize: 13, marginBottom: 16 },
  phaseStatsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  phaseStatItem: { alignItems: 'center', flex: 1 },
  phaseIndicator: { width: 24, height: 4, borderRadius: 2, marginBottom: 8 },
  phaseStatEmoji: { fontSize: 20, marginBottom: 4 },
  phaseStatName: { color: '#888', fontSize: 10, marginBottom: 4, textAlign: 'center' },
  phaseStatAvg: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  phaseStatDiff: { fontSize: 11, marginTop: 2 },
  phaseStatCount: { color: '#666', fontSize: 9, marginTop: 2 },
  phaseStatNoData: { color: '#666', fontSize: 11, fontStyle: 'italic' },
  cycleStatsHint: { color: '#888', fontSize: 12, marginTop: 16, textAlign: 'center', fontStyle: 'italic' },
});
