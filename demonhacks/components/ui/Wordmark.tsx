import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, fonts } from '@/lib/theme';

interface WordmarkProps {
  size?: number; // font size for the text; compass scales to match
  color?: string;
}

/**
 * ExploreChi wordmark: "Expl{compass}reChi"
 * The compass SVG from assets/compass.svg replaces the "o" in "Explore".
 */
export function Wordmark({ size = 26, color = colors.primary }: WordmarkProps) {
  // Size the compass to match x-height (lowercase letter height).
  // Satoshi's x-height is ~72% of the font size.
  const iconSize = size * 0.72;

  return (
    <View style={styles.row}>
      <Text style={[styles.text, { fontSize: size, color }]}>Expl</Text>
      <View style={{ width: iconSize, height: iconSize, marginHorizontal: -size * 0.04, marginTop: size * 0.18 }}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={color}>
          <Path d="M17 3.34a10 10 0 1 1 -15 8.66l.005 -.324a10 10 0 0 1 14.995 -8.336zm-5 14.66a1 1 0 1 0 0 2a1 1 0 0 0 0 -2m3.684 -10.949l-6 2a1 1 0 0 0 -.633 .633l-2.007 6.026l-.023 .086l-.017 .113l-.004 .068v.044l.009 .111l.012 .07l.04 .144l.045 .1l.054 .095l.064 .09l.069 .075l.084 .074l.098 .07l.1 .054l.078 .033l.105 .033l.109 .02l.043 .005l.068 .004h.044l.111 -.009l.07 -.012l.02 -.006l.019 -.002l.074 -.022l6 -2a1 1 0 0 0 .633 -.633l2 -6a1 1 0 0 0 -1.265 -1.265zm-1.265 2.529l-1.21 3.629l-3.629 1.21l1.21 -3.629l3.629 -1.21zm-9.419 1.42a1 1 0 1 0 0 2a1 1 0 0 0 0 -2m14 0a1 1 0 1 0 0 2a1 1 0 0 0 0 -2m-7 -7a1 1 0 1 0 0 2a1 1 0 0 0 0 -2" />
        </Svg>
      </View>
      <Text style={[styles.text, { fontSize: size, color }]}>reChi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: fonts.black,
    letterSpacing: -0.5,
  },
});
