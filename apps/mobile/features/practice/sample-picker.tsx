import type { Shot } from '@golf/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChoiceIcon, describeShot } from './controls';
import type { Draft } from './provider';

// Input presets only: recommendations and catalog content always come from the API.
const samples: { label: string; shot: Shot; icon: keyof Shot }[] = [
  { label: 'Starts right', shot: { start: 'right', curve: 'straight', height: 'normal' }, icon: 'start' },
  { label: 'Curves right', shot: { start: 'straight', curve: 'right', height: 'normal' }, icon: 'curve' },
  { label: 'Flies low', shot: { start: 'straight', curve: 'straight', height: 'low' }, icon: 'height' },
  { label: 'Unmatched shot', shot: { start: 'left', curve: 'left', height: 'high' }, icon: 'curve' },
];

export function SamplePicker({ draft, onSelect, onClose }: { draft: Draft; onSelect: (shot: Shot) => void; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  function close() {
    setOpen(false);
    onClose();
  }
  return <View className="gap-3 border-t border-border pt-6">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => open ? close() : setOpen(true)} className="min-h-12 justify-center py-3">
      <Text className="text-center text-sm font-semibold text-foreground">{open ? 'Hide sample shots' : 'Try a sample shot'}</Text>
    </Pressable>
    {open && <Text className="text-sm text-muted-foreground">Choose a shot to fill the report.</Text>}
    {open && samples.map(({ label, shot, icon }) => {
      const selected = shot.start === draft.start && shot.curve === draft.curve && shot.height === draft.height;
      return <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} aria-pressed={selected} onPress={() => { onSelect(shot); close(); }}
        className={`min-h-16 flex-row items-center gap-3 rounded-xl border px-4 py-3 active:opacity-70 ${selected ? 'border-foreground' : 'border-border'}`}>
        <ChoiceIcon field={icon} value={shot[icon]} />
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">{label}</Text>
          <Text className="text-xs text-muted-foreground">{describeShot(shot)}</Text>
        </View>
        <Text className="text-foreground">{selected ? '✓' : '→'}</Text>
      </Pressable>;
    })}
  </View>;
}
