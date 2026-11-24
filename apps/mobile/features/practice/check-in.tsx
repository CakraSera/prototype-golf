import type { Direction, ShotRead } from '@golf/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '../../theme';
import { Action, capitalize } from './controls';
import { practiceLocalDay, type PracticeProgress } from './progress';
import type { CheckInDraft } from './provider';

type ReadingShot = { start: Direction; curve: Direction; path: string; end: number };
const baselineShots: ReadingShot[] = [
  { start: 'right', curve: 'straight', path: 'M96 109 L155 23', end: 155 },
  { start: 'straight', curve: 'left', path: 'M96 109 C96 80 95 46 39 23', end: 39 },
  { start: 'left', curve: 'straight', path: 'M96 109 L36 23', end: 36 },
  { start: 'straight', curve: 'right', path: 'M96 109 C96 81 98 48 155 23', end: 155 },
  { start: 'right', curve: 'left', path: 'M96 109 C123 80 148 46 89 23', end: 89 },
];
const followUpShots: ReadingShot[] = [
  { start: 'straight', curve: 'right', path: 'M96 109 C96 70 112 44 163 23', end: 163 },
  { start: 'left', curve: 'right', path: 'M96 109 C68 85 49 47 106 23', end: 106 },
  { start: 'right', curve: 'straight', path: 'M96 109 L139 23', end: 139 },
  { start: 'left', curve: 'straight', path: 'M96 109 L48 23', end: 48 },
  { start: 'straight', curve: 'left', path: 'M96 109 C96 75 81 44 29 23', end: 29 },
];
const verdicts = [
  ['correct', 'Both correct'], ['different', 'Different answer'], ['unsure', 'I’m not sure'],
] as const;

function CheckChoice({ label, accessibilityLabel, selected, disabled, onPress }: {
  label: string; accessibilityLabel?: string; selected: boolean; disabled: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected, disabled }} aria-pressed={selected} disabled={disabled} onPress={onPress}
    className={`min-h-11 min-w-10 flex-1 items-center justify-center rounded-lg border px-2 py-2 active:opacity-70 ${selected ? 'border-foreground bg-primary' : 'border-border bg-background'} ${disabled ? 'opacity-60' : ''}`}>
    <Text className="text-center text-sm font-semibold text-foreground">{label}</Text>
  </Pressable>;
}

export function ConfidenceCheck({ phase, value, disabled, onChange }: {
  phase: 'before' | 'after'; value: number | undefined; disabled: boolean; onChange: (value: number | undefined) => void;
}) {
  const heading = phase === 'before' ? 'Before your drill' : 'After your drill';
  return <View className="gap-3 rounded-xl border border-border px-4 py-4">
    <Text accessibilityRole="header" className="text-base font-semibold text-foreground">{heading} · Optional</Text>
    <Text className="text-sm leading-5 text-muted-foreground">How sure are you about what to try on your next ball?</Text>
    <View className="flex-row gap-2" role="group" accessibilityLabel={`${heading} confidence`}>
      {[1, 2, 3, 4, 5].map(rating => <CheckChoice key={rating} label={String(rating)}
        accessibilityLabel={`${heading}: ${rating} out of 5`} selected={value === rating}
        disabled={disabled} onPress={() => onChange(value === rating ? undefined : rating)} />)}
    </View>
    <View className="flex-row flex-wrap justify-between gap-2">
      <Text className="text-xs text-muted-foreground">1 · I’m guessing</Text>
      <Text className="text-xs text-muted-foreground">5 · I know what I’ll try</Text>
    </View>
  </View>;
}

function ReadingFlight({ shot, reflected }: { shot: ReadingShot; reflected: boolean }) {
  return <View className="items-center rounded-xl border border-border" accessible accessibilityRole="image"
    accessibilityLabel="Overhead shot path from the tee toward the flag. The dashed line is the target line.">
    <Svg width="100%" height={132} viewBox="0 0 192 128" fill="none">
      <Path d="M96 112V15" stroke={colors.mutedForeground} strokeDasharray="4 4" />
      <Path d="M96 20V5l14 4-14 5" fill={colors.primary} stroke={colors.foreground} />
      <G transform={reflected ? 'translate(192 0) scale(-1 1)' : undefined}>
        <Path d={shot.path} stroke={colors.foreground} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={shot.end} cy={23} r={3.5} fill={colors.foreground} />
      </G>
      <Circle cx={96} cy={109} r={4.5} fill={colors.background} stroke={colors.foreground} strokeWidth={2} />
      <SvgText x={85} y={119} fontSize={10} textAnchor="end" fill={colors.mutedForeground}>Tee</SvgText>
    </Svg>
  </View>;
}

export function PartnerCheck({ checkIn, reading, disabled, onChange }: {
  checkIn: CheckInDraft; reading: PracticeProgress['reading'] | undefined; disabled: boolean;
  onChange: (change: Partial<CheckInDraft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [assessment, setAssessment] = useState<{ round: number; answers: ShotRead[]; showKey: boolean } | null>(null);
  const now = new Date();
  const checkedToday = reading?.days.has(practiceLocalDay(now.getTime(), -now.getTimezoneOffset()));
  const round = assessment?.round ?? 0;
  const reflected = round > 0 && round % 2 === 0;
  const paths = round === 0 ? baselineShots : followUpShots;
  const shot = assessment ? paths[(assessment.answers.length + (round > 1 ? round : 0)) % paths.length] : undefined;
  const answer = (direction: Direction) => capitalize(!reflected || direction === 'straight'
    ? direction : direction === 'left' ? 'right' : 'left');

  function record(verdict: ShotRead) {
    if (!assessment || !assessment.showKey || disabled) return;
    const answers = [...assessment.answers, verdict];
    if (answers.length === 5) {
      onChange({ shotReads: answers });
      setAssessment(null);
    } else {
      setAssessment({ ...assessment, answers, showKey: false });
    }
  }

  return <View className="rounded-xl border border-border">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open}
      onPress={() => setOpen(value => !value)} className="min-h-12 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70">
      <Text className="flex-1 text-base font-semibold text-foreground">Practice partner checks · Optional</Text>
      <Text aria-hidden className="text-base text-muted-foreground">{open ? '−' : '+'}</Text>
    </Pressable>
    {open && <View className="gap-3 border-t border-border px-4 py-4">
      <Text accessibilityRole="header" className="text-base font-semibold text-foreground">Explain and try</Text>
      <Text className="text-sm leading-5 text-muted-foreground">Ask what the golfer will try on the next ball. Watch one attempt. Did they explain and try one move without help?</Text>
      <View className="flex-row gap-2">
        <CheckChoice label="Yes, unaided" selected={checkIn.actedIndependently === true} disabled={disabled}
          onPress={() => onChange({ actedIndependently: checkIn.actedIndependently === true ? undefined : true })} />
        <CheckChoice label="Needed help" selected={checkIn.actedIndependently === false} disabled={disabled}
          onPress={() => onChange({ actedIndependently: checkIn.actedIndependently === false ? undefined : false })} />
      </View>
      <Text accessibilityRole="header" className="pt-2 text-base font-semibold text-foreground">Read five shots</Text>
      {checkIn.shotReads ? <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-foreground">
        Five shots checked · {checkIn.shotReads.filter(read => read === 'correct').length} of 5 correct. Mark the drill complete to save.
      </Text> : assessment && shot ? <>
        <Text accessibilityLiveRegion="polite" className="text-sm font-semibold text-foreground">Shot {assessment.answers.length + 1} of 5</Text>
        <ReadingFlight shot={shot} reflected={reflected} />
        <Text className="text-sm leading-5 text-muted-foreground">Ask where the ball started relative to the flag and which way it bent.</Text>
        {assessment.showKey ? <>
          <Text accessibilityLiveRegion="polite" className="text-sm font-semibold text-foreground">Observer key · Start {answer(shot.start)} · Curve {answer(shot.curve)}</Text>
          <View className="flex-row gap-2">
            {verdicts.map(([value, label]) => <CheckChoice key={value} label={label} selected={false} disabled={disabled} onPress={() => record(value)} />)}
          </View>
        </> : <Action secondary label="Show observer key" disabled={disabled} onPress={() => setAssessment({ ...assessment, showKey: true })} />}
        <Text className="text-xs text-muted-foreground">An unfinished five-shot check is not scored.</Text>
      </> : !reading ? <Text className="text-sm leading-5 text-muted-foreground">Load your practice history to start a five-shot check. You can still save this drill.</Text>
        : checkedToday ? <Text className="text-sm leading-5 text-muted-foreground">Today’s five-shot check is saved. Try a new set on another day.</Text> : <>
        <Text className="text-sm leading-5 text-muted-foreground">Have a partner confirm both the start and curve for each path. Only the first completed check each day counts.</Text>
        <Action secondary label="Show first shot" disabled={disabled} onPress={() => setAssessment({ round: reading.days.size, answers: [], showKey: false })} />
      </>}
    </View>}
  </View>;
}
