import { useWindowDimensions } from 'react-native';

/** Returns responsive layout info — desktop breakpoint at 768px */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return { isDesktop: width >= 768, width, height };
}
