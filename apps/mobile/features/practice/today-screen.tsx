import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';

import { useSession } from '../auth/session';
import { ConfidenceCheck, PartnerCheck } from './check-in';
import { Action, Back, ChoiceIcon, Heading, Notice, Summary, capitalize, fields } from './controls';
import { FlightPreview, StateDrawing } from './flight-preview';
import type { PracticeProgress } from './progress';
import { usePractice, type Draft } from './provider';
import { SamplePicker } from './sample-picker';

const reportHelp = {
  start: 'Watch the first part of the flight. Did it leave left of your target, on the target line, or to the right? Where it lands is separate.',
  curve: 'Watch the path after the ball starts. Does it bend left, stay straight or bend right? A ball can start right and still curve left.',
  height: 'Compare the flight with your usual shot using the same club. If you don’t know what normal looks like yet, ask someone to help you watch.',
};

function PlayerCard({ username, fullName, progress, unavailable, onBadgePress }: {
  username: string; fullName: string; progress: PracticeProgress | null; unavailable: boolean; onBadgePress: () => void;
}) {
  const initials = fullName.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
  const next = progress?.nextBadge;
  return <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
    <View className="flex-row items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary" aria-hidden>
        <Text className="text-base font-semibold text-foreground">{initials}</Text>
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text selectable className="text-lg font-semibold text-foreground">{username}</Text>
        {progress && <Text className="text-sm text-muted-foreground">Level {progress.level} · {progress.rank}</Text>}
      </View>
    </View>
    {progress ? <Pressable accessibilityRole="button" accessibilityHint="Opens Achievements in Progress"
      onPress={onBadgePress} className="min-h-12 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-primary/20 px-3 py-2 active:opacity-70">
      <Text className="text-sm font-semibold text-foreground">{next ? `Next badge · ${next.name}` : 'All badges earned'}</Text>
      <Text className="text-xs text-foreground">{next ? `${next.count}/${next.target} ${next.unit} →` : 'Achievements →'}</Text>
    </Pressable> : <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">
      {unavailable ? 'Player progress unavailable. Open Progress to retry.' : 'Loading player progress…'}
    </Text>}
  </View>;
}

export function TodayScreen() {
  const practice = usePractice();
  const { user } = useSession();
  const { draft, stage, match, pending, error, checkIn, attempt, history, historyError, progress,
    setDraft, findDrill, start, back, save, loadHistory, repeatLast, updateCheckIn, openAchievements } = practice;
  const [helpField, setHelpField] = useState<keyof Draft | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const latest = useRef(practice);
  latest.current = practice;
  const scrollToTop = useCallback(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, []);
  useEffect(scrollToTop, [stage, scrollToTop]);
  useFocusEffect(useCallback(() => {
    void loadHistory();
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const value = latest.current;
      if (value.stage === 'report' && !value.pending) return false;
      value.back();
      return true;
    });
    return () => subscription.remove();
  }, [loadHistory]));
  const valid = Boolean(draft.start && draft.curve && draft.height);
  const lastDrill = history?.[0];

  return <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
    <View className="mx-auto w-full max-w-xl gap-5 px-6 pb-10 pt-6">
      {stage === 'report' ? <>
        <Heading>Today</Heading>
        {user && <PlayerCard username={user.username} fullName={user.fullName} progress={progress}
          unavailable={historyError !== null} onBadgePress={openAchievements} />}
        {lastDrill && <View className="gap-2 rounded-xl border border-border px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pick up where you left off</Text>
          <Text className="text-base font-semibold text-foreground">{lastDrill.match.drill.title}</Text>
          <Action label="Repeat last drill" secondary disabled={Boolean(pending)} onPress={repeatLast} />
        </View>}
        <Text accessibilityRole="header" className="text-2xl font-semibold tracking-tight text-foreground">Report a shot</Text>
        <Text className="text-base leading-6 text-muted-foreground">Describe your ball flight relative to your target.</Text>
        <FlightPreview shot={draft} />
        {fields.map(field => <View key={field.key} className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text accessibilityRole="header" className="text-sm font-semibold text-foreground">{field.label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Not sure about ${field.label.toLowerCase()}`}
              accessibilityState={{ expanded: helpField === field.key }} aria-expanded={helpField === field.key}
              className="min-h-11 justify-center px-2 active:opacity-70" onPress={() => {
                if (helpField === field.key) {
                  setHelpField(null);
                } else {
                  const unfinished = { ...draft };
                  delete unfinished[field.key];
                  setDraft(unfinished);
                  setHelpField(field.key);
                }
              }}>
              <Text className="text-sm font-semibold text-muted-foreground">Not sure</Text>
            </Pressable>
          </View>
          {helpField === field.key && <Text accessibilityLiveRegion="polite" className="rounded-lg bg-primary/15 px-3 py-3 text-sm leading-5 text-foreground">
            {reportHelp[field.key]} Watch another shot, then choose when you’re sure.
          </Text>}
          <View role="group" accessibilityLabel={field.help} className="flex-row flex-wrap gap-2">
            {field.values.map(value => {
              const selected = draft[field.key] === value;
              return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${field.label}: ${capitalize(value)}`} accessibilityState={{ selected }} aria-pressed={selected}
                onPress={() => { setHelpField(null); setDraft({ ...draft, [field.key]: value }); }}
                className={`min-w-20 flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-4 active:opacity-70 ${selected ? 'border-foreground bg-primary' : 'border-border bg-background'}`}>
                <ChoiceIcon field={field.key} value={value} />
                <Text className="text-center text-sm font-medium text-foreground">{capitalize(value)}</Text>
              </Pressable>;
            })}
          </View>
        </View>)}
        {error && <Notice error>{`Could not find your drill. ${error} Your shot is still here.`}</Notice>}
        <Action label={pending === 'match' ? 'Finding your drill…' : error ? 'Retry finding my drill' : 'Find my drill →'} disabled={!valid || Boolean(pending)} onPress={() => void findDrill()} />
        <SamplePicker draft={draft} onSelect={shot => { setHelpField(null); setDraft(shot); }} onClose={scrollToTop} />
      </> : stage === 'unmatched' ? <>
        <Back label="Back to report" onPress={back} />
        <Heading>No matching drill</Heading>
        <StateDrawing />
        <Text className="text-center text-base leading-7 text-muted-foreground">This shot pattern has no drill in the catalog yet.</Text>
        <Summary shot={draft} />
        <Action label="Edit shot" onPress={back} />
        <SamplePicker draft={draft} onSelect={setDraft} onClose={scrollToTop} />
      </> : match ? <>
        <Back label={stage === 'practice' ? 'Suggested drill' : 'Edit shot'} onPress={back} disabled={pending === 'save'} />
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stage === 'practice' ? 'Practice in progress' : 'Suggested drill'}</Text>
        <Heading>{match.drill.title}</Heading>
        <FlightPreview shot={match.shot} />
        <View className="gap-3 rounded-xl border border-border px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stage === 'practice' ? 'Your next shot' : 'Your ball flight'}</Text>
          <Text className="text-lg leading-7 text-foreground">{stage === 'practice' ? match.drill.instruction : match.feedback}</Text>
        </View>
        {stage === 'recommendation' ? <>
          <Summary shot={draft} />
          <ConfidenceCheck phase="before" value={checkIn.confidenceBefore} disabled={Boolean(pending)}
            onChange={confidenceBefore => updateCheckIn({ confidenceBefore })} />
        </> : <>
          <Text className="text-sm leading-5 text-muted-foreground">Try the instruction. You can mark this drill complete without any check-ins.</Text>
          <ConfidenceCheck phase="after" value={checkIn.confidenceAfter} disabled={Boolean(pending)}
            onChange={confidenceAfter => updateCheckIn({ confidenceAfter })} />
          <PartnerCheck key={attempt} checkIn={checkIn} reading={progress?.reading} disabled={Boolean(pending)} onChange={updateCheckIn} />
        </>}
        {error && <Notice error>{stage === 'practice' ? `Could not save your practice. ${error} Try again; your attempt is preserved.` : error}</Notice>}
        {stage === 'practice'
          ? <Action label={pending === 'save' ? 'Saving practice…' : error ? 'Retry save' : 'Mark complete ✓'} disabled={Boolean(pending)} onPress={() => void save()} />
          : <Action label="Start drill →" onPress={start} />}
      </> : null}
    </View>
  </ScrollView>;
}
