import type { Completion } from '@golf/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, Text, View } from 'react-native';

import { colors } from '../../theme';
import { Action, ChoiceIcon, Heading, Notice, describeShot } from './controls';
import { StateDrawing } from './flight-preview';
import { usePractice } from './provider';

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function HistoryScreen() {
  const { history, historyPending, historyError, saved, loadHistory, newReport, pending } = usePractice();
  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));
  const sections = useMemo(() => {
    const groups = new Map<string, { title: string; data: Completion[] }>();
    const today = new Date().toDateString();
    for (const entry of history ?? []) {
      const date = new Date(entry.completedAt);
      const key = date.toDateString();
      let group = groups.get(key);
      if (!group) {
        group = { title: key === today ? 'Today' : dayFormat.format(date), data: [] };
        groups.set(key, group);
      }
      group.data.push(entry);
    }
    return [...groups.values()];
  }, [history]);

  return <SectionList<Completion, { title: string; data: Completion[] }>
    style={{ flex: 1, backgroundColor: colors.background }}
    contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 576, alignSelf: 'center' }}
    sections={sections}
    keyExtractor={item => item.id}
    stickySectionHeadersEnabled={false}
    refreshControl={<RefreshControl refreshing={historyPending && history !== null} onRefresh={() => void loadHistory()} tintColor={colors.foreground} />}
    ListHeaderComponent={<View className="gap-4 pb-5">
      <Heading>History</Heading>
      {history !== null && <Text className="text-base text-muted-foreground">{history.length} completed {history.length === 1 ? 'drill' : 'drills'} · Only you</Text>}
      {saved && <Notice>Practice saved</Notice>}
      {historyError && <>
        <Notice error>{history === null ? `Could not load your history. ${historyError}` : `Could not refresh your history. Showing your last loaded history. ${historyError}`}</Notice>
        <Action secondary label="Retry loading history" disabled={historyPending} onPress={() => void loadHistory()} />
      </>}
      {history === null && !historyError && <View className="items-center gap-3 py-8">
        <ActivityIndicator color={colors.foreground} />
        <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">Loading your history…</Text>
      </View>}
      {history !== null && <Action secondary label={historyPending ? 'Refreshing…' : 'Refresh history'} disabled={historyPending} onPress={() => void loadHistory()} />}
    </View>}
    ListEmptyComponent={history !== null && history.length === 0 ? <View className="gap-3 pb-6">
      <StateDrawing history />
      <Text accessibilityRole="header" className="text-center text-xl font-semibold text-foreground">No practice yet</Text>
      <Text className="text-center text-base leading-7 text-muted-foreground">Your completed drills will appear here.</Text>
    </View> : undefined}
    renderSectionHeader={({ section }) => <Text accessibilityRole="header" className="pb-3 pt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</Text>}
    renderItem={({ item }) => <View className="mb-3 flex-row flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-4">
      <ChoiceIcon field="start" value={item.match.shot.start} />
      <View className="min-w-36 flex-1 gap-2">
        <Text className="text-base font-semibold text-foreground">{item.match.drill.title}</Text>
        <Text className="text-xs leading-5 text-muted-foreground">{describeShot(item.match.shot)}</Text>
      </View>
      <Text className="text-xs text-muted-foreground">{timeFormat.format(new Date(item.completedAt))}</Text>
    </View>}
    ListFooterComponent={<View className="pt-6"><Action label="Report a shot →" disabled={pending === 'save'} onPress={newReport} /></View>}
  />;
}
