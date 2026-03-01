import { useResponsive } from '@/hooks/useResponsive';
import DesktopLayout from '@/components/explore/DesktopLayout';
import MobileLayout from '@/components/explore/MobileLayout';

export default function DiscoverScreen() {
  const { isDesktop } = useResponsive();
  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
}
