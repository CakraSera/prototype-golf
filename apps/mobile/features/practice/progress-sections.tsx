import type { Completion } from '@golf/shared';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme';
import type { Badge, PracticeProgress } from './progress';

const readingIcon = { ios: 'eye', android: 'visibility', web: 'visibility' } as const;
const independenceIcon = { ios: 'safari', android: 'explore', web: 'explore' } as const;
const confidenceIcon = { ios: 'sun.max', android: 'light_mode', web: 'light_mode' } as const;
const flagIcon = { ios: 'flag.fill', android: 'flag', web: 'flag' } as const;
const badgeIcons = {
  'first-swing': flagIcon,
  'flight-reader': readingIcon,
  'self-starter': independenceIcon,
  'steady-nerves': confidenceIcon,
};
const badgeDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function changeLabel(before: number, after: number, unit: string) {
  const delta = after - before;
  if (delta === 0) return 'No change';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${unit}${Math.abs(delta) === 1 ? '' : 's'}`;
}

function SkillStat({ icon, title, score, note, value, max = 5, divided = false }: {
  icon: ComponentProps<typeof SymbolView>['name']; title: string; score: string; note: string;
  value: number; max?: number; divided?: boolean;
}) {
  return <View className={`flex-row items-start gap-3 px-4 py-3 ${divided ? 'border-t border-border' : ''}`}>
    <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/20" aria-hidden>
      <SymbolView name={icon} size={17} tintColor={colors.foreground} />
    </View>
    <View className="flex-1 gap-2">
      <View className="flex-row flex-wrap justify-between gap-x-3 gap-y-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-sm font-semibold text-foreground">{score}</Text>
      </View>
      <View className="max-w-48 flex-row gap-1" aria-hidden>
        {Array.from({ length: max }, (_, index) => <View key={index}
          className={`h-1 flex-1 rounded-full ${index < value ? 'bg-primary' : 'bg-border'}`} />)}
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">{note}</Text>
    </View>
  </View>;
}

export function SkillStats({ progress }: { progress: PracticeProgress }) {
  const { reading, independence, confidence } = progress;
  const latest = reading.latest;
  const baseline = reading.baseline;
  const latestAction = independence.latest;
  let shotNote = 'Ask a partner to check five shot paths.';
  if (latest && baseline) {
    shotNote = latest === baseline
      ? `Baseline from ${latest.completion.match.drill.title}. Compare on another day.`
      : `${changeLabel(baseline.score, latest.score, 'shot')} since your first check (${baseline.score}/5). Latest drill · ${latest.completion.match.drill.title}.`;
  }
  let actionNote = 'Ask a partner to watch you explain and try one move.';
  if (latestAction) {
    const current = latestAction.unaided ? 'Unaided' : 'Needed help';
    const prior = independence.previous;
    actionNote = prior
      ? `${prior.unaided ? 'Unaided' : 'Needed help'} last time · ${current.toLowerCase()} on ${latestAction.completion.match.drill.title}.`
      : `First check · ${current} on ${latestAction.completion.match.drill.title}.`;
  }
  let confidenceNote = 'Rate your confidence before and after a drill to see the change.';
  if (confidence.pair) {
    const { before, after, completion } = confidence.pair;
    const pairedDrill = completion.id !== confidence.latest?.completion.id ? 'Last paired drill · ' : '';
    confidenceNote = `${pairedDrill}${changeLabel(before, after, 'point')} · ${before}/5 before, ${after}/5 after ${completion.match.drill.title}.`;
  } else if (confidence.latest) {
    confidenceNote = `After ${confidence.latest.completion.match.drill.title}. Add a before rating next time to compare.`;
  }
  return <View className="overflow-hidden rounded-2xl border border-border">
    <View className="flex-row items-center gap-3 bg-secondary px-4 py-4">
      <View className="h-12 w-12 items-center justify-center rounded-2xl border border-primary" aria-hidden>
        <SymbolView name={flagIcon} size={25} tintColor={colors.primary} />
      </View>
      <View className="flex-1 gap-1">
        <Text accessibilityRole="header" className="text-lg font-semibold text-background">Skill stats</Text>
        <Text className="text-base font-semibold text-primary">Level {progress.level} · {progress.rank}</Text>
        <Text className="text-xs text-background">{progress.level - 1} of 3 skill badges earned</Text>
      </View>
    </View>
    <SkillStat icon={readingIcon} title="Shot reading" score={latest ? `${latest.score}/5` : 'Unscored'} note={shotNote} value={latest?.score ?? 0} />
    <SkillStat divided icon={independenceIcon} title="Independence"
      score={latestAction ? `${independence.days} ${independence.days === 1 ? 'day' : 'days'} unaided` : 'Unscored'}
      note={actionNote} value={independence.days} max={2} />
    <SkillStat divided icon={confidenceIcon} title="Confidence" score={confidence.latest ? `${confidence.latest.score}/5 after` : 'Unrated'}
      note={confidenceNote} value={confidence.latest?.score ?? 0} />
  </View>;
}

function BadgeTile({ badge }: { badge: Badge }) {
  const [expanded, setExpanded] = useState(false);
  const earned = badge.earnedBy;
  return <View className={`min-w-36 flex-1 basis-2/5 rounded-xl border border-border ${earned ? 'bg-primary/15' : ''}`}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setExpanded(value => !value)} className="gap-2 px-3 py-3 active:opacity-70">
      <View className={`h-8 w-8 items-center justify-center rounded-full ${earned ? 'bg-primary' : 'bg-primary/20'}`} aria-hidden>
        <SymbolView name={badgeIcons[badge.id]} size={17} tintColor={colors.foreground} />
      </View>
      <Text className="text-sm font-semibold text-foreground">{badge.name}</Text>
      <Text className="text-xs text-muted-foreground">{earned ? '✓ Earned' : `Locked · ${badge.count}/${badge.target}`}</Text>
    </Pressable>
    {expanded && <View className="gap-2 border-t border-border px-3 py-3">
      <Text className="text-sm leading-5 text-foreground">{badge.requirement}</Text>
      {earned && <Text className="text-xs leading-5 text-muted-foreground">
        Earned {badgeDate.format(new Date(earned.completedAt))} · {earned.match.drill.title}
      </Text>}
    </View>}
  </View>;
}

export function Achievements({ progress }: { progress: PracticeProgress }) {
  const next = progress.nextBadge;
  const earned = progress.badges.filter(badge => badge.earnedBy).length;
  return <View className="gap-3">
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <Text accessibilityRole="header" className="text-xl font-semibold text-foreground">Achievements</Text>
      <Text className="text-sm text-muted-foreground">{earned}/{progress.badges.length} earned</Text>
    </View>
    <View className="flex-row flex-wrap items-start gap-3">
      {progress.badges.map(badge => <BadgeTile key={badge.id} badge={badge} />)}
    </View>
    <Text className="text-sm leading-5 text-muted-foreground">{next
      ? `Next unlock · ${next.name}. ${next.requirement}`
      : 'All four earned. Tap a badge to see which drill earned it.'}</Text>
  </View>;
}

function LastSevenDays({ history }: { history: Completion[] }) {
  const today = new Date();
  const days = new Map<string, { date: Date; count: number }>();
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.set(date.toDateString(), { date, count: 0 });
  }
  let completed = 0;
  for (const entry of history) {
    const day = days.get(new Date(entry.completedAt).toDateString());
    if (day) {
      day.count++;
      completed++;
    }
  }
  const practiceDays = Array.from(days.values());
  const activeDays = practiceDays.filter(day => day.count > 0).length;
  return <View className="gap-4 border-t border-border px-4 py-4">
    <Text accessibilityRole="header" className="text-base font-semibold text-foreground">Last 7 days</Text>
    <Text className="text-sm text-foreground">{completed} {completed === 1 ? 'drill' : 'drills'} completed · {activeDays} {activeDays === 1 ? 'day' : 'days'} practiced</Text>
    <View className="flex-row justify-between gap-1">
      {practiceDays.map(({ date, count }) => <View key={date.toDateString()} accessible
        accessibilityLabel={`${dayLabel.format(date)}: ${count} completed ${count === 1 ? 'drill' : 'drills'}`}
        className={`flex-1 items-center gap-1 rounded-lg py-2 ${count > 0 ? 'bg-primary/20' : ''}`}>
        <Text className="text-xs text-muted-foreground">{weekday.format(date)}</Text>
        <Text className="text-sm font-semibold text-foreground">{count}</Text>
      </View>)}
    </View>
    <Text className="text-xs text-muted-foreground">Practice activity, not a skill score.</Text>
  </View>;
}

export function PracticeActivity({ history }: { history: Completion[] }) {
  const [open, setOpen] = useState(false);
  return <View className="rounded-xl border border-border">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open}
      onPress={() => setOpen(value => !value)} className="min-h-12 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70">
      <Text className="text-base font-semibold text-foreground">Practice activity</Text>
      <Text aria-hidden className="text-base text-muted-foreground">{open ? '−' : '+'}</Text>
    </Pressable>
    {open && <LastSevenDays history={history} />}
  </View>;
}
