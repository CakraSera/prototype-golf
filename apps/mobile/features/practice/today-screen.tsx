import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';

import { Action, Back, ChoiceIcon, Heading, Notice, Summary, capitalize, fields } from './controls';
import { FlightPreview, StateDrawing } from './flight-preview';
import { usePractice } from './provider';
import { SamplePicker } from './sample-picker';

export function TodayScreen() {
  const practice = usePractice();
  const { draft, stage, match, pending, error, setDraft, findDrill, start, back, save } = practice;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const latest = useRef(practice);
  latest.current = practice;
  const scrollToTop = useCallback(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, []);
  useEffect(scrollToTop, [stage, scrollToTop]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const value = latest.current;
      if (value.stage === 'report' && !value.pending) return false;
      value.back();
      return true;
    });
    return () => subscription.remove();
  }, []));
  const valid = Boolean(draft.start && draft.curve && draft.height);

  return <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
    <View className="mx-auto w-full max-w-xl gap-5 px-6 pb-10 pt-6">
      {stage === 'report' ? <>
        <Heading>Report a shot</Heading>
        <Text className="text-base leading-6 text-muted-foreground">Describe your ball flight relative to your target.</Text>
        <FlightPreview shot={draft} />
        {fields.map(field => <View key={field.key} className="gap-3">
          <Text accessibilityRole="header" className="text-sm font-semibold text-foreground">{field.label}</Text>
          <View role="group" accessibilityLabel={field.help} className="flex-row flex-wrap gap-2">
            {field.values.map(value => {
              const selected = draft[field.key] === value;
              return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${field.label}: ${capitalize(value)}`} accessibilityState={{ selected }} aria-pressed={selected}
                onPress={() => setDraft({ ...draft, [field.key]: value })}
                className={`min-w-20 flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-4 active:opacity-70 ${selected ? 'border-foreground bg-primary' : 'border-border bg-background'}`}>
                <ChoiceIcon field={field.key} value={value} />
                <Text className="text-center text-sm font-medium text-foreground">{capitalize(value)}</Text>
              </Pressable>;
            })}
          </View>
        </View>)}
        {error && <Notice error>{`Could not find your drill. ${error} Your shot is still here.`}</Notice>}
        <Action label={pending === 'match' ? 'Finding your drill…' : error ? 'Retry finding my drill' : 'Find my drill →'} disabled={!valid || Boolean(pending)} onPress={() => void findDrill()} />
        <SamplePicker draft={draft} onSelect={setDraft} onClose={scrollToTop} />
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
        {stage === 'recommendation' && <Summary shot={draft} />}
        {error && <Notice error>{stage === 'practice' ? `Could not save your practice. ${error} Try again; your attempt is preserved.` : error}</Notice>}
        {stage === 'practice'
          ? <Action label={pending === 'save' ? 'Saving practice…' : error ? 'Retry save' : 'Mark complete ✓'} disabled={Boolean(pending)} onPress={() => void save()} />
          : <Action label="Start drill →" onPress={start} />}
      </> : null}
    </View>
  </ScrollView>;
}
