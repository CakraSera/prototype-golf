import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme';
import type { FlightDiagram } from './articles';

const diagramPaths = {
  start: 'm12 29 9-23m-5 3 5-3 1 5',
  curve: 'M12 29c0-11 2-17 13-21m-1 5 2-6-6 1',
  height: 'M5 26q10-16 24-5m-5 1 6 0-2-5',
};

export function FlightThumbnail({ kind, size }: { kind: FlightDiagram; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
    <Path d="M6 29h23M15 29V6" stroke={colors.border} strokeWidth={1.2} strokeDasharray="2 3" />
    <Path d={diagramPaths[kind]} stroke={colors.foreground} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={kind === 'height' ? 5 : 12} cy={kind === 'height' ? 26 : 29} r={1.8} fill={colors.foreground} />
  </Svg>;
}

const iconPaths = {
  search: 'M15 15l5.5 5.5',
  close: 'm5 5 14 14M19 5 5 19',
  flag: 'M5 21V3m0 1 13 3-13 5m-3 9h8',
  history: 'M4 7a8 8 0 1 1-1 7M4 3v5h5m3-1v5l3 2',
};

export function GuideIcon({ name }: { name: keyof typeof iconPaths }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
    {name === 'search' && <Circle cx={10} cy={10} r={6.5} stroke={colors.foreground} strokeWidth={1.6} />}
    <Path d={iconPaths[name]} stroke={colors.foreground} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
