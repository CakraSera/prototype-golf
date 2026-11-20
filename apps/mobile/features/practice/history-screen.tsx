import type { Completion } from '@golf/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, RefreshControl, SectionList, Text, View } from 'react-native';

import { colors } from '../../theme';
import { Action, ChoiceIcon, Heading, Notice, describeShot } from './controls';
import { StateDrawing } from './flight-preview';
import { buildProgressSummary } from './progress-summary';
import { ProgressSummaryCard } from './progress-summary-card';
import { usePractice } from './provider';


export function HistoryScreen() {
  const router = useRouter();
  const { history, historyPending, historyError, saved, loadHistory, newReport, pending } = usePractice();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    let midnight: ReturnType<typeof setTimeout>;
    const updateWindow = () => {
      clearTimeout(midnight);
      const current = new Date();
      setNow(current);
      const nextMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      midnight = setTimeout(updateWindow, nextMidnight.getTime() - current.getTime());
    };
    updateWindow();
    void loadHistory();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') updateWindow();
    });
    return () => {
      clearTimeout(midnight);
      subscription.remove();
    };
  }, [loadHistory]));
  const summary = useMemo(() => history === null ? null : buildProgressSummary(history, now), [history, now]);
  useEffect(() => {
    if (__DEV__ && summary && summary.invalidTimestampCount > 0) {
      console.warn(`Progress omitted ${summary.invalidTimestampCount} completion(s) with invalid timestamps.`);
    }
  }, [history, summary?.invalidTimestampCount]);
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }), [now]);
  const sections = useMemo(() => {
    const groups = new Map<string, { title: string; data: Completion[] }>();
    const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const today = now.toDateString();
    for (const entry of history ?? []) {
      const date = new Date(entry.completedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = date.toDateString();
      let group = groups.get(key);
      if (!group) {
        group = { title: key === today ? 'Today' : dayFormat.format(date), data: [] };
        groups.set(key, group);
      }
      group.data.push(entry);
    }
    return [...groups.values()];
  }, [history, now]);

  return <SectionList<Completion, { title: string; data: Completion[] }>
    style={{ flex: 1, backgroundColor: colors.background }}
    contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 576, alignSelf: 'center' }}
    sections={sections}
    keyExtractor={item => item.id}
    stickySectionHeadersEnabled={false}
    refreshControl={<RefreshControl refreshing={historyPending && history !== null} onRefresh={() => void loadHistory()} tintColor={colors.foreground} />}
    ListHeaderComponent={<View className="gap-4 pb-5">
      <Heading>Progress</Heading>
      <Text className="text-base leading-6 text-muted-foreground">Your practice, ready to pick up again.</Text>
      {saved && <Notice>Practice saved to your account.</Notice>}
      {historyError && <>
        <Notice error>{`${saved ? 'Your practice was saved, but history could not refresh.' : history === null ? 'Could not load your history.' : 'Could not refresh your history.'}${history !== null ? ' Showing your last loaded activity and history.' : ''} ${historyError}`}</Notice>
        <Action secondary label="Retry loading history" disabled={historyPending} onPress={() => void loadHistory()} />
      </>}
      {history === null && !historyError && <View className="items-center gap-3 py-8">
        <ActivityIndicator color={colors.foreground} />
        <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">Loading your history…</Text>
      </View>}
      {summary && <ProgressSummaryCard summary={summary} />}
      {history !== null && !historyError && <Action secondary label={historyPending ? 'Refreshing…' : 'Refresh history'} disabled={historyPending} onPress={() => void loadHistory()} />}
    </View>}
    ListEmptyComponent={history !== null && history.length === 0 ? <View className="gap-3 pb-6">
      <StateDrawing history />
      <Text accessibilityRole="header" className="text-center text-xl font-semibold text-foreground">Your first drill starts here</Text>
      <Text className="text-center text-base leading-7 text-muted-foreground">Completed drills will appear here. No scores or streaks to catch up with.</Text>
      <Action label="Go to Today" disabled={pending === 'save'} onPress={() => router.navigate('/')} />
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
    ListFooterComponent={history !== null && history.length > 0 ? <View className="pt-6"><Action label="Report a new shot →" disabled={pending === 'save'} onPress={newReport} /></View> : undefined}
  />;
}
