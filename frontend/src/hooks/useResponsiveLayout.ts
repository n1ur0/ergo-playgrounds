import { useState, useEffect, useCallback } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'large';

export interface LayoutConfig {
  screenSize: ScreenSize;
  sidebarCollapsed: boolean;
  showEducationPanel: boolean;
  contentWidth: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useResponsiveLayout() {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEducationPanel, setShowEducationPanel] = useState(true);

  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth;
    
    if (width < 480) {
      setScreenSize('mobile');
      setSidebarCollapsed(true);
      setShowEducationPanel(false);
    } else if (width < 768) {
      setScreenSize('tablet');
      setSidebarCollapsed(false);
      setShowEducationPanel(false);
    } else if (width < 1024) {
      setScreenSize('desktop');
      setSidebarCollapsed(false);
      setShowEducationPanel(true);
    } else {
      setScreenSize('large');
      setSidebarCollapsed(false);
      setShowEducationPanel(true);
    }
  }, []);

  useEffect(() => {
    // Set initial screen size
    updateScreenSize();

    // Add resize listener with debouncing
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateScreenSize]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const toggleEducationPanel = useCallback(() => {
    setShowEducationPanel(prev => !prev);
  }, []);

  const layoutConfig: LayoutConfig = {
    screenSize,
    sidebarCollapsed,
    showEducationPanel,
    contentWidth: showEducationPanel ? '60%' : '100%',
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop' || screenSize === 'large'
  };

  return {
    ...layoutConfig,
    toggleSidebar,
    toggleEducationPanel,
    setSidebarCollapsed,
    setShowEducationPanel
  };
}