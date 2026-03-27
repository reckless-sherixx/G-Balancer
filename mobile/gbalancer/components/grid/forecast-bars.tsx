import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type ForecastPoint } from '@/features/grid/types';

type ForecastBarsProps = {
  points: ForecastPoint[];
};

export function ForecastBars({ points }: ForecastBarsProps) {
  if (!points.length) {
    return <ThemedText>No forecast points available.</ThemedText>;
  }

  const maxValue = Math.max(...points.map((item) => Math.max(item.supply, item.demand)), 1);
  const visiblePoints = points.slice(0, 12);

  return (
    <View style={styles.wrapper}>
      {visiblePoints.map((point) => {
        const supplyHeight = Math.max(8, (point.supply / maxValue) * 100);
        const demandHeight = Math.max(8, (point.demand / maxValue) * 100);
        const hour = new Date(point.timestamp).getHours();

        return (
          <View style={styles.column} key={point.timestamp}>
            <View style={styles.barGroup}>
              <View style={[styles.bar, styles.supplyBar, { height: supplyHeight }]} />
              <View style={[styles.bar, styles.demandBar, { height: demandHeight }]} />
            </View>
            <ThemedText style={styles.label}>{`${hour}:00`}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 140,
  },
  column: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    minHeight: 110,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  supplyBar: {
    backgroundColor: '#2e7d32',
  },
  demandBar: {
    backgroundColor: '#c62828',
  },
  label: {
    fontSize: 10,
    opacity: 0.7,
  },
});
