import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type Gender = 'male' | 'female';

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleSettings {
  cycleDuration: number; // default 28
  periodDuration: number; // default 5
}

export interface Profile {
  id: string;
  name: string;
  gender: Gender;
  height: number;
  birthDate?: string;
  targetWeight?: number;
  cycleSettings?: CycleSettings;
}

export interface WeightEntry {
  id: string;
  profileId: string;
  weight: number;
  date: string;
}

export interface MeasurementEntry {
  id: string;
  profileId: string;
  date: string;
  waist?: number;
  hips?: number;
  chest?: number;
  thighs?: number;
  calves?: number;
  arms?: number;
}

export interface CycleEntry {
  id: string;
  profileId: string;
  startDate: string; // First day of period
}

interface AppData {
  profiles: Profile[];
  activeProfileId: string | null;
  weightEntries: WeightEntry[];
  measurementEntries: MeasurementEntry[];
  cycleEntries: CycleEntry[];
}

const defaultData: AppData = {
  profiles: [],
  activeProfileId: null,
  weightEntries: [],
  measurementEntries: [],
  cycleEntries: [],
};

// Cycle phase calculation
export const PHASE_INFO: Record<CyclePhase, { label: string; emoji: string; color: string; description: string }> = {
  period: { label: 'Règles', emoji: '🔴', color: '#ef4444', description: 'Menstruation' },
  follicular: { label: 'Folliculaire', emoji: '🌸', color: '#f59e0b', description: 'Post-règles, énergie en hausse' },
  ovulation: { label: 'Ovulation', emoji: '✨', color: '#22c55e', description: 'Pic de fertilité' },
  luteal: { label: 'Lutéale', emoji: '🌙', color: '#6366f1', description: 'Pré-règles, rétention possible' },
};

export const getCyclePhase = (
  date: Date,
  cycles: CycleEntry[],
  settings: CycleSettings = { cycleDuration: 28, periodDuration: 5 }
): { phase: CyclePhase; dayInCycle: number; dayInPhase: number } | null => {
  if (cycles.length === 0) return null;
  
  // Sort cycles by date descending
  const sortedCycles = [...cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  
  // Find the most recent cycle that started before or on the given date
  const relevantCycle = sortedCycles.find(c => new Date(c.startDate) <= date);
  if (!relevantCycle) return null;
  
  const cycleStart = new Date(relevantCycle.startDate);
  cycleStart.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const dayInCycle = Math.floor((targetDate.getTime() - cycleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  
  // If beyond cycle duration, we're in a predicted new cycle
  const effectiveDay = ((dayInCycle - 1) % settings.cycleDuration) + 1;
  
  const { periodDuration, cycleDuration } = settings;
  const ovulationDay = Math.round(cycleDuration / 2); // Usually day 14 for 28-day cycle
  const follicularEnd = ovulationDay - 2;
  const ovulationEnd = ovulationDay + 1;
  
  let phase: CyclePhase;
  let dayInPhase: number;
  
  if (effectiveDay <= periodDuration) {
    phase = 'period';
    dayInPhase = effectiveDay;
  } else if (effectiveDay <= follicularEnd) {
    phase = 'follicular';
    dayInPhase = effectiveDay - periodDuration;
  } else if (effectiveDay <= ovulationEnd) {
    phase = 'ovulation';
    dayInPhase = effectiveDay - follicularEnd;
  } else {
    phase = 'luteal';
    dayInPhase = effectiveDay - ovulationEnd;
  }
  
  return { phase, dayInCycle: effectiveDay, dayInPhase };
};

export const getNextPeriodDate = (
  cycles: CycleEntry[],
  settings: CycleSettings = { cycleDuration: 28, periodDuration: 5 }
): Date | null => {
  if (cycles.length === 0) return null;
  
  const sortedCycles = [...cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  
  const lastCycleStart = new Date(sortedCycles[0].startDate);
  const nextPeriod = new Date(lastCycleStart);
  nextPeriod.setDate(nextPeriod.getDate() + settings.cycleDuration);
  
  return nextPeriod;
};

// Context
interface AppContextType {
  data: AppData;
  isLoading: boolean;
  activeProfile: Profile | null;
  addProfile: (profile: Omit<Profile, 'id'>) => void;
  updateProfile: (id: string, updates: Partial<Omit<Profile, 'id'>>) => void;
  setActiveProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  addWeightEntry: (weight: number, date?: string) => void;
  deleteWeightEntry: (id: string) => void;
  addMeasurementEntry: (m: Omit<MeasurementEntry, 'id' | 'profileId' | 'date'>, date?: string) => void;
  deleteMeasurementEntry: (id: string) => void;
  addCycleEntry: (startDate: string) => void;
  deleteCycleEntry: (id: string) => void;
  updateCycleSettings: (settings: CycleSettings) => void;
  getCurrentPhase: () => ReturnType<typeof getCyclePhase>;
  getPhaseForDate: (date: Date) => ReturnType<typeof getCyclePhase>;
  exportData: () => string;
  importData: (jsonString: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@weighttrack').then((json) => {
      if (json) {
        const loaded = JSON.parse(json);
        // Merge with defaults to ensure all fields exist (backward compatibility)
        setData({
          ...defaultData,
          ...loaded,
          cycleEntries: loaded.cycleEntries || [],
        });
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('@weighttrack', JSON.stringify(data));
    }
  }, [data, isLoading]);

  const activeProfile = data.profiles.find(p => p.id === data.activeProfileId) || null;

  const addProfile = useCallback((profile: Omit<Profile, 'id'>) => {
    const newProfile = { ...profile, id: generateId() };
    setData(prev => ({
      ...prev,
      profiles: [...prev.profiles, newProfile],
      activeProfileId: prev.activeProfileId || newProfile.id,
    }));
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<Omit<Profile, 'id'>>) => {
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  }, []);

  const setActiveProfile = useCallback((id: string) => {
    setData(prev => ({ ...prev, activeProfileId: id }));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.filter(p => p.id !== id),
      activeProfileId: prev.activeProfileId === id ? (prev.profiles.filter(p => p.id !== id)[0]?.id || null) : prev.activeProfileId,
      weightEntries: prev.weightEntries.filter(e => e.profileId !== id),
      measurementEntries: prev.measurementEntries.filter(e => e.profileId !== id),
      cycleEntries: (prev.cycleEntries || []).filter(e => e.profileId !== id),
    }));
  }, []);

  const addWeightEntry = useCallback((weight: number, date?: string) => {
    if (!data.activeProfileId) return;
    const entry: WeightEntry = {
      id: generateId(),
      profileId: data.activeProfileId,
      weight,
      date: date || new Date().toISOString(),
    };
    setData(prev => ({ ...prev, weightEntries: [...prev.weightEntries, entry] }));
  }, [data.activeProfileId]);

  const deleteWeightEntry = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      weightEntries: prev.weightEntries.filter(e => e.id !== id),
    }));
  }, []);

  const addMeasurementEntry = useCallback((m: Omit<MeasurementEntry, 'id' | 'profileId' | 'date'>, date?: string) => {
    if (!data.activeProfileId) return;
    const entry: MeasurementEntry = {
      ...m,
      id: generateId(),
      profileId: data.activeProfileId,
      date: date || new Date().toISOString(),
    };
    setData(prev => ({ ...prev, measurementEntries: [...prev.measurementEntries, entry] }));
  }, [data.activeProfileId]);

  const deleteMeasurementEntry = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      measurementEntries: prev.measurementEntries.filter(e => e.id !== id),
    }));
  }, []);

  // Cycle functions
  const addCycleEntry = useCallback((startDate: string) => {
    if (!data.activeProfileId) return;
    const entry: CycleEntry = {
      id: generateId(),
      profileId: data.activeProfileId,
      startDate,
    };
    setData(prev => ({ ...prev, cycleEntries: [...(prev.cycleEntries || []), entry] }));
  }, [data.activeProfileId]);

  const deleteCycleEntry = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      cycleEntries: (prev.cycleEntries || []).filter(e => e.id !== id),
    }));
  }, []);

  const updateCycleSettings = useCallback((settings: CycleSettings) => {
    if (!data.activeProfileId) return;
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => 
        p.id === data.activeProfileId ? { ...p, cycleSettings: settings } : p
      ),
    }));
  }, [data.activeProfileId]);

  const profileCycles = useMemo(() => {
    if (!activeProfile || !data.cycleEntries) return [];
    return data.cycleEntries.filter(c => c.profileId === activeProfile.id);
  }, [data.cycleEntries, activeProfile]);

  const cycleSettings = useMemo(() => {
    return activeProfile?.cycleSettings || { cycleDuration: 28, periodDuration: 5 };
  }, [activeProfile]);

  const getCurrentPhase = useCallback(() => {
    if (!activeProfile || activeProfile.gender !== 'female') return null;
    return getCyclePhase(new Date(), profileCycles, cycleSettings);
  }, [activeProfile, profileCycles, cycleSettings]);

  const getPhaseForDate = useCallback((date: Date) => {
    if (!activeProfile || activeProfile.gender !== 'female') return null;
    return getCyclePhase(date, profileCycles, cycleSettings);
  }, [activeProfile, profileCycles, cycleSettings]);

  const exportData = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString) as AppData;
      if (!imported.profiles || !Array.isArray(imported.profiles)) {
        return false;
      }
      // Ensure cycleEntries exists for backward compatibility
      if (!imported.cycleEntries) {
        imported.cycleEntries = [];
      }
      setData(imported);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AppContext.Provider value={{
      data,
      isLoading,
      activeProfile,
      addProfile,
      updateProfile,
      setActiveProfile,
      deleteProfile,
      addWeightEntry,
      deleteWeightEntry,
      addMeasurementEntry,
      deleteMeasurementEntry,
      addCycleEntry,
      deleteCycleEntry,
      updateCycleSettings,
      getCurrentPhase,
      getPhaseForDate,
      exportData,
      importData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
