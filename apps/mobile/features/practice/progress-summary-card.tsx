import { Text, View, useWindowDimensions } from 'react-native';

import type { ProgressSummary } from './progress-summary';

export function ProgressSummaryCard({ summary }: { summary: ProgressSummary }) {
  const { fontScale } = useWindowDimensions();
  const dayMinWidth = 28 * fontScale;
  return <View className="gap-5 rounded-2xl border border-border bg-surface p-4">
    <Text accessibilityRole="header" className="text-xl font-semibold text-foreground">Last 7 days</Text>
    <View className="flex-row flex-wrap gap-4">
      <View className="min-w-32 flex-1 gap-1" accessible accessibilityLabel={`${summary.drillsCompleted.toLocaleString()} drills completed`}>
        <Text selectable className="text-3xl font-semibold tabular-nums text-foreground">{summary.drillsCompleted.toLocaleString()}</Text>
        <Text className="text-sm text-muted-foreground">Drills completed</Text>
      </View>
      <View className="min-w-32 flex-1 gap-1" accessible accessibilityLabel={`${summary.daysPracticed.toLocaleString()} days practiced`}>
        <Text selectable className="text-3xl font-semibold tabular-nums text-foreground">{summary.daysPracticed.toLocaleString()}</Text>
        <Text className="text-sm text-muted-foreground">Days practiced</Text>
      </View>
    </View>
    <View className="flex-row flex-wrap gap-1">
      {summary.days.map(day => <View key={day.key} accessible
        accessibilityLabel={`${day.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}: ${day.count.toLocaleString()} ${day.count === 1 ? 'completion' : 'completions'}`}
        style={{ minWidth: dayMinWidth, flexBasis: dayMinWidth }}
        className={`flex-1 items-center gap-2 rounded-xl border px-1 py-3 ${day.count > 0 ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
        <Text className="text-center text-xs text-foreground">{day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
        <Text selectable className="text-center text-lg font-semibold tabular-nums text-foreground">{day.count.toLocaleString()}</Text>
      </View>)}
    </View>
    <Text className="text-sm leading-6 text-muted-foreground">Practice activity, not a skill score.</Text>
  </View>;
}
