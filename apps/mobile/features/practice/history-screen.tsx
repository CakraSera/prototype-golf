import type { Completion } from '@golf/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, Text, View, type ViewInstance } from 'react-native';

import { colors } from '../../theme';
import { Action, ChoiceIcon, Heading, Notice, describeShot } from './controls';
import { StateDrawing } from './flight-preview';
import { Achievements, PracticeActivity, SkillStats } from './progress-sections';
import { usePractice } from './provider';

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
type HistorySection = { title: string; data: Completion[] };

export function HistoryScreen() {
  const { history, historyPending, historyError, progress, savedId, achievementJump, consumeAchievementJump,
    loadHistory, newReport, pending } = usePractice();
  const list = useRef<SectionList<Completion, HistorySection>>(null);
  const header = useRef<ViewInstance>(null);
  const achievements = useRef<ViewInstance>(null);
  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));
  useFocusEffect(useCallback(() => {
    if (!achievementJump) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      const scroll = list.current?.getScrollResponder();
      if (!scroll || !header.current || !achievements.current) return;
      achievements.current.measureLayout(header.current, (_, y) => {
        if (!active) return;
        scroll.scrollTo({ y: y + 24, animated: false });
        consumeAchievementJump();
      });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [achievementJump, consumeAchievementJump]));
  const sections = useMemo(() => {
    const groups = new Map<string, HistorySection>();
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

  const unlocked = savedId ? progress?.badges.filter(badge => badge.earnedBy?.id === savedId) : undefined;
  const savedMessage = unlocked?.length
    ? `Practice saved · ${unlocked.map(badge => badge.name).join(' and ')} unlocked`
    : 'Practice saved';

  return <SectionList<Completion, HistorySection>
    ref={list}
    style={{ flex: 1, backgroundColor: colors.background }}
    contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 576, alignSelf: 'center' }}
    sections={sections}
    keyExtractor={item => item.id}
    stickySectionHeadersEnabled={false}
    refreshControl={<RefreshControl refreshing={historyPending && history !== null} onRefresh={() => void loadHistory()} tintColor={colors.foreground} />}
    ListHeaderComponent={<View ref={header} collapsable={false} className="gap-5 pb-5">
      <Heading>Progress</Heading>
      {savedId && <Notice>{savedMessage}</Notice>}
      {historyError && <>
        <Notice error>{history === null ? `Could not load your history. ${historyError}` : `Could not refresh your history. Showing your last loaded history. ${historyError}`}</Notice>
        <Action secondary label="Retry loading history" disabled={historyPending} onPress={() => void loadHistory()} />
      </>}
      {history === null && !historyError && <View className="items-center gap-3 py-8">
        <ActivityIndicator color={colors.foreground} />
        <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">Loading your history…</Text>
      </View>}
      {history !== null && <Action secondary label={historyPending ? 'Refreshing…' : 'Refresh history'} disabled={historyPending} onPress={() => void loadHistory()} />}
      {progress && history !== null && <>
        <SkillStats progress={progress} />
        <View ref={achievements} collapsable={false}>
          <Achievements progress={progress} />
        </View>
        <PracticeActivity history={history} />
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text accessibilityRole="header" className="text-xl font-semibold text-foreground">Completed practice</Text>
          <Text className="text-sm text-muted-foreground">{history.length} total · Only you</Text>
        </View>
      </>}
    </View>}
    ListEmptyComponent={history !== null && history.length === 0 ? <View className="gap-3 pb-6">
      <StateDrawing history />
      <Text accessibilityRole="header" className="text-center text-xl font-semibold text-foreground">No practice yet</Text>
      <Text className="text-center text-base leading-7 text-muted-foreground">Your completed drills and any check-ins will appear here.</Text>
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
