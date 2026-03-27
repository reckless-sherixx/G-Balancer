import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type GridAction } from '@/features/grid/types';

type ActionBadgeProps = {
  action: GridAction;
};

const LABELS: Record<GridAction, string> = {
  STORE: 'Store Energy',
  RELEASE: 'Release Energy',
  REDISTRIBUTE: 'Redistribute Zones',
  STABLE: 'No Action Needed',
};

const COLORS: Record<GridAction, string> = {
  STORE: '#2e7d32',
  RELEASE: '#ef6c00',
  REDISTRIBUTE: '#1565c0',
  STABLE: '#6d4c41',
};

export function ActionBadge({ action }: ActionBadgeProps) {
  return (
    <ThemedView style={[styles.badge, { borderColor: COLORS[action] }]}>
      <ThemedText style={[styles.label, { color: COLORS[action] }]}>{LABELS[action]}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
