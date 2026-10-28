import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../theme';

// Круговая схема пластика: точка на месте каждого винта, цвет передаётся
// снаружи (обычно — по отклонению измеренной частоты от опорной).
export default function DrumVisualizer({ lugCount, lugColors, centerColor = colors.brass, size = 220 }) {
  const cx = size / 2;
  const cy = size / 2;
  const shellRadius = size / 2 - 18;
  const lugRadius = shellRadius + 10;

  const points = Array.from({ length: lugCount }).map((_, i) => {
    const angle = (i / lugCount) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + lugRadius * Math.cos(angle),
      y: cy + lugRadius * Math.sin(angle),
      color: lugColors?.[i] ?? colors.line,
    };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={shellRadius} stroke={colors.line} strokeWidth={2} fill={colors.shell} />
        <Circle cx={cx} cy={cy} r={shellRadius - 10} stroke={colors.brassDim} strokeWidth={1} fill="none" />
        {points.map((p, i) => (
          <Line key={`line-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={colors.line} strokeWidth={1} opacity={0.5} />
        ))}
        {points.map((p, i) => (
          <Circle key={`lug-${i}`} cx={p.x} cy={p.y} r={8} fill={p.color} stroke={colors.stage} strokeWidth={2} />
        ))}
        <Circle cx={cx} cy={cy} r={10} fill={centerColor} stroke={colors.stage} strokeWidth={2} />
      </Svg>
    </View>
  );
}
