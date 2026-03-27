import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type MetricCardProps = {
  title: string;
  value: string;
  hint?: string;
};

export function MetricCard({ title, value, hint }: MetricCardProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <View style={styles.valueRow}>
        <ThemedText style={styles.value}>{value}</ThemedText>
      </View>
      {!!hint && <ThemedText style={styles.hint}>{hint}</ThemedText>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    gap: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  hint: {
    opacity: 0.7,
  },
});
