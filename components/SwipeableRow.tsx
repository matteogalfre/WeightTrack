import React, { useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        style={styles.deleteContainer}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.View style={[styles.deleteButton, { opacity }]}>
          <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
            🗑️
          </Animated.Text>
          <Animated.Text style={[styles.deleteLabel, { transform: [{ scale }] }]}>
            Supprimer
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteContainer: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderRadius: 12,
    marginBottom: 8,
  },
  deleteText: {
    fontSize: 22,
  },
  deleteLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
