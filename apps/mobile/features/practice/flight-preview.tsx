import { useId } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '../../theme';
import type { Draft } from './provider';

export function FlightPreview({ shot }: { shot: Draft }) {
  const gridId = `grid${useId().replace(/:/g, '')}`;
  const start = shot.start === 'left' ? -1 : shot.start === 'right' ? 1 : 0;
  const bend = shot.curve === 'left' ? -1 : shot.curve === 'right' ? 1 : 0;
  const end = 151 + start * 30 + bend * 45;
  const endY = 27 + Math.abs(start + bend) * 2;
  const height = shot.height === 'low' ? 1 : shot.height === 'normal' ? 2 : shot.height === 'high' ? 3 : 0;
  return (
    <View className="overflow-hidden rounded-xl border border-border">
      <View accessible accessibilityRole="image" accessibilityLabel={`Flight preview. Start ${shot.start ?? 'not selected'}, curve ${shot.curve ?? 'not selected'}, height ${shot.height ?? 'not selected'}.`}>
        <Svg width="100%" viewBox="0 0 300 104" style={{ aspectRatio: 300 / 104 }}>
          <Defs><Pattern id={gridId} width={13} height={13} patternUnits="userSpaceOnUse"><Path d="M13 0H0v13" fill="none" stroke={colors.border} strokeWidth={0.4} /></Pattern></Defs>
          <Rect width={300} height={104} fill={`url(#${gridId})`} />
          <G fill="none" stroke={colors.mutedForeground} strokeWidth={0.8} opacity={0.55}>
            <Path d="M83 107c7-7 16-14 23-19 14-11 15-21 12-31-3-13 3-21 13-26 12-6 25-5 35-1 10 4 18 13 18 23 0 11-8 20-4 31 2 6 11 13 20 22" />
            <Path d="M77 107c6-8 15-15 24-23 12-9 14-17 12-26-4-13 1-25 15-32 12-7 28-7 42-1 12 6 20 15 20 28 0 10-7 19-5 28 2 8 9 14 22 24" strokeDasharray="3 3" />
            <Path d="M145 14c4-3 12-2 15 0 4 3 3 8-2 10-4 3-13 3-17 0-3-3-1-7 4-10z" fill={colors.primary} />
            <Path d="M215 44c6-1 11 3 9 7-1 3-7 6-12 4-5-1-8-4-5-7 2-3 4-3 8-4z" />
            <Path d="M96 65l2-4 2 3m5 3 2-4 1 3m-43 10 1-3 2 3m151-10 2-4 2 3m18 8 1-3 2 3M82 42l2-4 2 3" />
          </G>
          <Path d="M151 88V22" stroke={colors.mutedForeground} strokeWidth={1.2} strokeDasharray="3 3" />
          <Path d="M151 22V7l11 3.7-11 4" stroke={colors.foreground} strokeWidth={1.2} fill={colors.primary} />
          <Ellipse cx={151} cy={22} rx={2.3} ry={1} fill={colors.foreground} />
          {(shot.start || shot.curve) && <>
            <Path d={`M151 89 C${151 + start * 10} 68 ${151 + start * 24 + bend * 18} 39 ${end} ${endY}`} fill="none" stroke={colors.foreground} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx={end} cy={endY} r={3} fill={colors.background} stroke={colors.foreground} strokeWidth={1.5} />
          </>}
          <Circle cx={151} cy={89} r={3.3} fill={colors.background} stroke={colors.foreground} strokeWidth={1.5} />
          <Path d="M147 96h8M120 82l-16 7H88" stroke={colors.mutedForeground} strokeWidth={0.7} fill="none" />
          <SvgText x={84} y={91} textAnchor="end" fontSize={6.4} fill={colors.mutedForeground}>TEE</SvgText>
          {height > 0 && <>
            <SvgText x={269} y={92} textAnchor="end" fontSize={6.2} fill={colors.mutedForeground}>HEIGHT</SvgText>
            {[0, 1, 2].map(n => <Rect key={n} x={273 + n * 5} y={92 - (n + 1) * 3.4} width={3} height={(n + 1) * 3.4} fill={height > n ? colors.foreground : colors.border} />)}
          </>}
        </Svg>
      </View>
      <Text className="px-3 pb-2 text-xs uppercase tracking-widest text-muted-foreground">Flight preview</Text>
    </View>
  );
}

export function StateDrawing({ history = false }: { history?: boolean }) {
  return <View className="items-center py-5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={180} height={117} viewBox="0 0 160 104" fill="none">
      {history ? <G stroke={colors.foreground} strokeWidth={1.6}>
        <Rect x={45} y={18} width={67} height={73} rx={4} stroke={colors.border} />
        <Rect x={40} y={14} width={67} height={73} rx={4} fill={colors.background} />
        <Path d="M53 35h41M53 46h41M53 57h30M53 68h26" stroke={colors.border} />
        <Path d="M57 18v-8m13 8v-8m14 8v-8m13 8v-8M120 53v24m0-24 13 4-13 6m-4 15h9" />
      </G> : <G stroke={colors.foreground} strokeLinecap="round">
        <Path d="M20 79c18-5 29-12 49-13s33 3 58-5" stroke={colors.border} />
        <Path d="M46 80q5-39 31-53" strokeDasharray="3 4" strokeWidth={2} />
        <Circle cx={46} cy={80} r={4} fill={colors.background} />
        <Path d="M105 61V22l17 5-17 7m-5 28h10" strokeWidth={1.7} />
        <Path d="m72 22 9 9m0-9-9 9" strokeWidth={2.6} />
      </G>}
    </Svg>
  </View>;
}
