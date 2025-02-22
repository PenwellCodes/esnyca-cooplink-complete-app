import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const WavyBackground = ({ height, color }) => (
  <View style={[styles.container, { height }]}>
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      style={styles.svg}
    >
      <Path
        fill={color}
        d="M0,160L1440,320L1440,0L0,0Z"
        transform="rotate(180 720 160)"
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    bottom: 0,
  },
});

export default WavyBackground;
