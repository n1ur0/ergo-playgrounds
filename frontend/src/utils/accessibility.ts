// Accessibility utilities for React components

import React from 'react';

// Type definitions for accessibility
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-pressed'?: boolean | 'mixed';
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-busy'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-multiselectable'?: boolean;
  'aria-level'?: number;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
}

// ARIA attributes and roles
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  ALERT: 'alert',
  STATUS: 'status',
  REGION: 'region',
  BANNER: 'banner',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  FORM: 'form',
  SEARCH: 'search',
  APPLICATION: 'application',
  DOCUMENT: 'document',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  LIST: 'list',
  LISTITEM: 'listitem',
  TREE: 'tree',
  TREEITEM: 'treeitem',
  PROGRESSBAR: 'progressbar',
  SLIDER: 'slider',
  TOOLTIP: 'tooltip'
} as const;

export const ARIA_STATES = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',
  INVALID: 'aria-invalid',
  REQUIRED: 'aria-required',
  READONLY: 'aria-readonly',
  BUSY: 'aria-busy',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant'
} as const;

export const ARIA_PROPERTIES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  HASPOPUP: 'aria-haspopup',
  ORIENTATION: 'aria-orientation',
  MULTISELECTABLE: 'aria-multiselectable',
  LEVEL: 'aria-level',
  POSINSET: 'aria-posinset',
  SETSIZE: 'aria-setsize',
  VALUEMIN: 'aria-valuemin',
  VALUEMAX: 'aria-valuemax',
  VALUENOW: 'aria-valuenow',
  VALUETEXT: 'aria-valuetext'
} as const;

// Common accessibility patterns

// Focus management
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static trapStack: (() => void)[] = [];

  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  static restoreFocus(): void {
    const lastFocus = this.focusStack.pop();
    if (lastFocus && lastFocus.isConnected) {
      lastFocus.focus();
    }
  }

  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus the first element
    setTimeout(() => firstElement.focus(), 0);

    const cleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
    };

    this.trapStack.push(cleanup);
    return cleanup;
  }

  static releaseFocusTrap(): void {
    const cleanup = this.trapStack.pop();
    if (cleanup) cleanup();
  }

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'summary',
      'details[open]'
    ].join(',');

    return Array.from(container.querySelectorAll(selector))
      .filter(el => this.isVisible(el)) as HTMLElement[];
  }

  private static isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static liveRegion: HTMLElement | null = null;

  static initialize(): void {
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;

    document.body.appendChild(this.liveRegion);
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.initialize();
    
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = '';
    
    // Use setTimeout to ensure the announcement is read
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  static clear(): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
    }
  }
}

// Keyboard navigation helpers
export const KeyboardHelper = {
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
  } as const,

  isActivationKey(event: KeyboardEvent): boolean {
    return event.key === this.KEYS.ENTER || event.key === this.KEYS.SPACE;
  },

  isNavigationKey(event: KeyboardEvent): boolean {
    return [
      this.KEYS.ARROW_UP,
      this.KEYS.ARROW_DOWN,
      this.KEYS.ARROW_LEFT,
      this.KEYS.ARROW_RIGHT,
      this.KEYS.HOME,
      this.KEYS.END
    ].includes(event.key);
  },

  handleMenuKeyDown(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect: (index: number) => void,
    onClose?: () => void
  ): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case this.KEYS.ARROW_DOWN:
        event.preventDefault();
        newIndex = (currentIndex + 1) % items.length;
        break;
      case this.KEYS.ARROW_UP:
        event.preventDefault();
        newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case this.KEYS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;
      case this.KEYS.END:
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case this.KEYS.ENTER:
      case this.KEYS.SPACE:
        event.preventDefault();
        onSelect(currentIndex);
        return currentIndex;
      case this.KEYS.ESCAPE:
        event.preventDefault();
        if (onClose) onClose();
        return currentIndex;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }
};

// High contrast and reduced motion detection
export const AccessibilityPreferences = {
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  prefersHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  prefersDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },

  addMotionListener(callback: (prefersReduced: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  },

  addContrastListener(callback: (prefersHigh: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
};

// Form accessibility helpers
export const FormAccessibility = {
  generateId(prefix: string = 'field'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  createErrorId(fieldId: string): string {
    return `${fieldId}-error`;
  },

  createDescriptionId(fieldId: string): string {
    return `${fieldId}-description`;
  },

  getAriaDescribedBy(fieldId: string, hasError: boolean, hasDescription: boolean): string {
    const ids = [];
    if (hasDescription) ids.push(this.createDescriptionId(fieldId));
    if (hasError) ids.push(this.createErrorId(fieldId));
    return ids.join(' ');
  }
};

// React hooks for accessibility
export function useA11yId(prefix?: string): string {
  return React.useMemo(() => FormAccessibility.generateId(prefix), [prefix]);
}

export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    FocusManager.saveFocus();
    const cleanup = FocusManager.trapFocus(containerRef.current);

    return () => {
      cleanup();
      FocusManager.restoreFocus();
    };
  }, [isActive, containerRef]);
}

export function useAnnouncement() {
  return React.useCallback((message: string, priority?: 'polite' | 'assertive') => {
    ScreenReaderAnnouncer.announce(message, priority);
  }, []);
}

export function useKeyboardNavigation(
  isActive: boolean,
  items: React.RefObject<HTMLElement>[],
  onSelect?: (index: number) => void,
  onClose?: () => void
) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const elements = items.map(ref => ref.current).filter(Boolean) as HTMLElement[];
      const newIndex = KeyboardHelper.handleMenuKeyDown(
        event,
        elements,
        currentIndex,
        onSelect || (() => {}),
        onClose
      );
      setCurrentIndex(newIndex);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, items, currentIndex, onSelect, onClose]);

  return currentIndex;
}

export function useAccessibilityPreferences() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(
    AccessibilityPreferences.prefersReducedMotion()
  );
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(
    AccessibilityPreferences.prefersHighContrast()
  );

  React.useEffect(() => {
    const removeMotionListener = AccessibilityPreferences.addMotionListener(setPrefersReducedMotion);
    const removeContrastListener = AccessibilityPreferences.addContrastListener(setPrefersHighContrast);

    return () => {
      removeMotionListener();
      removeContrastListener();
    };
  }, []);

  return {
    prefersReducedMotion,
    prefersHighContrast,
    prefersDarkMode: AccessibilityPreferences.prefersDarkMode()
  };
}

// Component enhancers for accessibility
export function withA11yProps<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>
): React.ComponentType<T & { a11yProps?: Record<string, unknown> }> {
  const WrappedComponent = React.forwardRef<HTMLElement, T & { a11yProps?: Record<string, unknown> }>((props, ref) => {
    const { a11yProps, ...restProps } = props;
    return React.createElement(Component, { ref, ...(restProps as unknown as T), ...(a11yProps || {}) });
  });
  
  WrappedComponent.displayName = `withA11yProps(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent as unknown as React.ComponentType<T & { a11yProps?: Record<string, unknown> }>;
}

// Validation helpers
export const A11yValidator = {
  validateButton(props: Record<string, unknown>): string[] {
    const warnings = [];
    
    if (!props['aria-label'] && !props.children) {
      warnings.push('Button should have accessible text via aria-label or child content');
    }
    
    if (props.disabled && !props['aria-disabled']) {
      warnings.push('Consider using aria-disabled instead of disabled for better screen reader support');
    }
    
    return warnings;
  },

  validateForm(props: Record<string, unknown>): string[] {
    const warnings = [];
    
    if (!props['aria-label'] && !props['aria-labelledby']) {
      warnings.push('Form should have an accessible label');
    }
    
    return warnings;
  },

  validateInput(props: Record<string, unknown>): string[] {
    const warnings = [];
    
    if (!props['aria-label'] && !props['aria-labelledby'] && !props.id) {
      warnings.push('Input should be properly labeled');
    }
    
    if (props.required && !props['aria-required']) {
      warnings.push('Required inputs should have aria-required="true"');
    }
    
    return warnings;
  }
};

// Initialize accessibility features
export function initializeAccessibility(): void {
  ScreenReaderAnnouncer.initialize();
  
  // Add global focus-visible polyfill styles if needed
  if (!CSS.supports('selector(:focus-visible)')) {
    const style = document.createElement('style');
    style.textContent = `
      .js-focus-visible :focus:not(.focus-visible) {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }
}

export default {
  ARIA_ROLES,
  ARIA_STATES,
  ARIA_PROPERTIES,
  FocusManager,
  ScreenReaderAnnouncer,
  KeyboardHelper,
  AccessibilityPreferences,
  FormAccessibility,
  A11yValidator,
  initializeAccessibility
};