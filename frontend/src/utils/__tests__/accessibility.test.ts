import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  FocusManager,
  ScreenReaderAnnouncer,
  KeyboardHelper,
  AccessibilityPreferences,
  FormAccessibility,
  A11yValidator,
  useA11yId,
  useFocusTrap,
  useAnnouncement,
  useKeyboardNavigation,
  useAccessibilityPreferences,
  initializeAccessibility
} from '../accessibility'

// Mock DOM APIs
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia
})

// Mock CSS.supports
Object.defineProperty(CSS, 'supports', {
  writable: true,
  value: vi.fn()
})

describe('FocusManager', () => {
  let container: HTMLElement
  let button1: HTMLButtonElement
  let button2: HTMLButtonElement
  let input: HTMLInputElement

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    button1 = document.createElement('button')
    button2 = document.createElement('button')
    input = document.createElement('input')

    button1.textContent = 'Button 1'
    button2.textContent = 'Button 2'
    input.type = 'text'

    container.appendChild(button1)
    container.appendChild(button2)
    container.appendChild(input)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('saveFocus and restoreFocus', () => {
    it('should save and restore focus', () => {
      button1.focus()
      expect(document.activeElement).toBe(button1)

      FocusManager.saveFocus()
      button2.focus()
      expect(document.activeElement).toBe(button2)

      FocusManager.restoreFocus()
      expect(document.activeElement).toBe(button1)
    })

    it('should handle no saved focus gracefully', () => {
      FocusManager.restoreFocus()
      // Should not throw error
    })

    it('should not save focus if active element is body', () => {
      document.body.focus()
      const initialStackLength = FocusManager['focusStack'].length

      FocusManager.saveFocus()
      expect(FocusManager['focusStack'].length).toBe(initialStackLength)
    })
  })

  describe('trapFocus', () => {
    it('should trap focus within container', async () => {
      const cleanup = FocusManager.trapFocus(container)

      // Wait for async focus to occur
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should focus first element
      expect(document.activeElement).toBe(button1)

      // Simulate Tab key from last element
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      input.focus()
      container.dispatchEvent(tabEvent)

      cleanup()
    })

    it('should handle Shift+Tab correctly', async () => {
      const cleanup = FocusManager.trapFocus(container)
      
      // Wait for async focus to occur
      await new Promise(resolve => setTimeout(resolve, 10))
      
      button1.focus()
      const preventDefault = vi.fn()
      const shiftTabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        shiftKey: true, 
        bubbles: true
      })
      // Mock preventDefault on the event
      Object.defineProperty(shiftTabEvent, 'preventDefault', { value: preventDefault, writable: true })
      
      container.dispatchEvent(shiftTabEvent)

      expect(preventDefault).toHaveBeenCalled()
      cleanup()
    })

    it('should handle empty container gracefully', () => {
      const emptyContainer = document.createElement('div')
      const cleanup = FocusManager.trapFocus(emptyContainer)
      
      expect(cleanup).toBeInstanceOf(Function)
      cleanup()
    })

    it('should ignore non-Tab keys', () => {
      const cleanup = FocusManager.trapFocus(container)
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      container.dispatchEvent(enterEvent)
      
      // Should not affect focus
      cleanup()
    })
  })

  describe('getFocusableElements', () => {
    it('should find focusable elements', () => {
      const focusable = FocusManager.getFocusableElements(container)
      expect(focusable).toHaveLength(3)
      expect(focusable).toContain(button1)
      expect(focusable).toContain(button2)
      expect(focusable).toContain(input)
    })

    it('should exclude disabled elements', () => {
      button1.disabled = true
      const focusable = FocusManager.getFocusableElements(container)
      expect(focusable).not.toContain(button1)
      expect(focusable).toContain(button2)
      expect(focusable).toContain(input)
    })

    it('should exclude hidden elements', () => {
      button1.style.display = 'none'
      const focusable = FocusManager.getFocusableElements(container)
      expect(focusable).not.toContain(button1)
    })

    it('should include elements with tabindex', () => {
      const div = document.createElement('div')
      div.setAttribute('tabindex', '0')
      container.appendChild(div)

      const focusable = FocusManager.getFocusableElements(container)
      expect(focusable).toContain(div)
    })
  })

  describe('releaseFocusTrap', () => {
    it('should clean up focus trap', () => {
      // Clear the stack first to ensure clean state
      FocusManager['trapStack'] = []
      
      const cleanup = FocusManager.trapFocus(container)
      
      // Should have one cleanup in stack
      expect(FocusManager['trapStack']).toHaveLength(1)
      
      FocusManager.releaseFocusTrap()
      expect(FocusManager['trapStack']).toHaveLength(0)
    })
  })
})

describe('ScreenReaderAnnouncer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // Clear any existing live region
    ScreenReaderAnnouncer['liveRegion'] = null
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should initialize live region', () => {
    ScreenReaderAnnouncer.initialize()
    
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite')
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true')
  })

  it('should announce messages', async () => {
    vi.useFakeTimers()
    
    ScreenReaderAnnouncer.announce('Test message')
    
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion?.textContent).toBe('')
    
    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(150)
    })
    
    expect(liveRegion?.textContent).toBe('Test message')
    
    vi.useRealTimers()
  })

  it('should handle different priority levels', () => {
    ScreenReaderAnnouncer.announce('Urgent message', 'assertive')
    
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion?.getAttribute('aria-live')).toBe('assertive')
  })

  it('should clear announcements', () => {
    ScreenReaderAnnouncer.announce('Test message')
    ScreenReaderAnnouncer.clear()
    
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion?.textContent).toBe('')
  })

  it('should not reinitialize if already initialized', () => {
    ScreenReaderAnnouncer.initialize()
    const firstRegion = document.querySelector('[aria-live]')
    
    ScreenReaderAnnouncer.initialize()
    const allRegions = document.querySelectorAll('[aria-live]')
    
    expect(allRegions).toHaveLength(1)
    expect(allRegions[0]).toBe(firstRegion)
  })
})

describe('KeyboardHelper', () => {
  describe('key constants', () => {
    it('should have correct key values', () => {
      expect(KeyboardHelper.KEYS.ENTER).toBe('Enter')
      expect(KeyboardHelper.KEYS.SPACE).toBe(' ')
      expect(KeyboardHelper.KEYS.ESCAPE).toBe('Escape')
      expect(KeyboardHelper.KEYS.TAB).toBe('Tab')
    })
  })

  describe('isActivationKey', () => {
    it('should detect activation keys', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
      const otherEvent = new KeyboardEvent('keydown', { key: 'a' })

      expect(KeyboardHelper.isActivationKey(enterEvent)).toBe(true)
      expect(KeyboardHelper.isActivationKey(spaceEvent)).toBe(true)
      expect(KeyboardHelper.isActivationKey(otherEvent)).toBe(false)
    })
  })

  describe('isNavigationKey', () => {
    it('should detect navigation keys', () => {
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' })
      const otherEvent = new KeyboardEvent('keydown', { key: 'a' })

      expect(KeyboardHelper.isNavigationKey(arrowEvent)).toBe(true)
      expect(KeyboardHelper.isNavigationKey(homeEvent)).toBe(true)
      expect(KeyboardHelper.isNavigationKey(otherEvent)).toBe(false)
    })
  })

  describe('handleMenuKeyDown', () => {
    let items: HTMLElement[]
    let onSelect: vi.Mock
    let onClose: vi.Mock

    beforeEach(() => {
      items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button')
      ]
      onSelect = vi.fn()
      onClose = vi.fn()

      items.forEach((item, index) => {
        item.textContent = `Item ${index + 1}`
        item.focus = vi.fn()
        document.body.appendChild(item)
      })
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('should handle arrow down navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardHelper.handleMenuKeyDown(event, items, 0, onSelect, onClose)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(1)
      expect(items[1].focus).toHaveBeenCalled()
    })

    it('should handle arrow up navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardHelper.handleMenuKeyDown(event, items, 1, onSelect, onClose)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(0)
      expect(items[0].focus).toHaveBeenCalled()
    })

    it('should wrap around at boundaries', () => {
      // Test wrapping from last to first
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      downEvent.preventDefault = vi.fn()

      let newIndex = KeyboardHelper.handleMenuKeyDown(downEvent, items, 2, onSelect, onClose)
      expect(newIndex).toBe(0)

      // Test wrapping from first to last
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      upEvent.preventDefault = vi.fn()

      newIndex = KeyboardHelper.handleMenuKeyDown(upEvent, items, 0, onSelect, onClose)
      expect(newIndex).toBe(2)
    })

    it('should handle Home and End keys', () => {
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' })
      homeEvent.preventDefault = vi.fn()

      let newIndex = KeyboardHelper.handleMenuKeyDown(homeEvent, items, 1, onSelect, onClose)
      expect(newIndex).toBe(0)

      const endEvent = new KeyboardEvent('keydown', { key: 'End' })
      endEvent.preventDefault = vi.fn()

      newIndex = KeyboardHelper.handleMenuKeyDown(endEvent, items, 1, onSelect, onClose)
      expect(newIndex).toBe(2)
    })

    it('should handle Enter and Space activation', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      enterEvent.preventDefault = vi.fn()

      const newIndex = KeyboardHelper.handleMenuKeyDown(enterEvent, items, 1, onSelect, onClose)

      expect(enterEvent.preventDefault).toHaveBeenCalled()
      expect(onSelect).toHaveBeenCalledWith(1)
      expect(newIndex).toBe(1)
    })

    it('should handle Escape key', () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      escapeEvent.preventDefault = vi.fn()

      const newIndex = KeyboardHelper.handleMenuKeyDown(escapeEvent, items, 1, onSelect, onClose)

      expect(escapeEvent.preventDefault).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
      expect(newIndex).toBe(1)
    })
  })
})

describe('AccessibilityPreferences', () => {
  beforeEach(() => {
    mockMatchMedia.mockReset()
  })

  it('should detect reduced motion preference', () => {
    mockMatchMedia.mockReturnValue({ matches: true })
    
    expect(AccessibilityPreferences.prefersReducedMotion()).toBe(true)
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('should detect high contrast preference', () => {
    mockMatchMedia.mockReturnValue({ matches: true })
    
    expect(AccessibilityPreferences.prefersHighContrast()).toBe(true)
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)')
  })

  it('should detect dark mode preference', () => {
    mockMatchMedia.mockReturnValue({ matches: true })
    
    expect(AccessibilityPreferences.prefersDarkMode()).toBe(true)
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
  })

  it('should add and remove motion listeners', () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
    mockMatchMedia.mockReturnValue(mockMediaQuery)

    const callback = vi.fn()
    const removeListener = AccessibilityPreferences.addMotionListener(callback)

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    removeListener()
    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})

describe('FormAccessibility', () => {
  it('should generate unique IDs', () => {
    const id1 = FormAccessibility.generateId()
    const id2 = FormAccessibility.generateId()
    
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^field-\d+-[a-z0-9]+$/)
  })

  it('should generate IDs with custom prefix', () => {
    const id = FormAccessibility.generateId('custom')
    expect(id).toMatch(/^custom-\d+-[a-z0-9]+$/)
  })

  it('should create error and description IDs', () => {
    const fieldId = 'test-field'
    
    expect(FormAccessibility.createErrorId(fieldId)).toBe('test-field-error')
    expect(FormAccessibility.createDescriptionId(fieldId)).toBe('test-field-description')
  })

  it('should build aria-describedby correctly', () => {
    const fieldId = 'test-field'
    
    // Only description
    expect(FormAccessibility.getAriaDescribedBy(fieldId, false, true))
      .toBe('test-field-description')
    
    // Only error
    expect(FormAccessibility.getAriaDescribedBy(fieldId, true, false))
      .toBe('test-field-error')
    
    // Both description and error
    expect(FormAccessibility.getAriaDescribedBy(fieldId, true, true))
      .toBe('test-field-description test-field-error')
    
    // Neither
    expect(FormAccessibility.getAriaDescribedBy(fieldId, false, false))
      .toBe('')
  })
})

describe('A11yValidator', () => {
  describe('validateButton', () => {
    it('should pass validation for proper button', () => {
      const props = { 'aria-label': 'Click me' }
      const warnings = A11yValidator.validateButton(props)
      
      expect(warnings).toHaveLength(0)
    })

    it('should warn about missing accessible text', () => {
      const props = {}
      const warnings = A11yValidator.validateButton(props)
      
      expect(warnings).toContain('Button should have accessible text via aria-label or child content')
    })

    it('should warn about disabled usage', () => {
      const props = { disabled: true }
      const warnings = A11yValidator.validateButton(props)
      
      expect(warnings).toContain('Consider using aria-disabled instead of disabled for better screen reader support')
    })
  })

  describe('validateForm', () => {
    it('should warn about missing form label', () => {
      const props = {}
      const warnings = A11yValidator.validateForm(props)
      
      expect(warnings).toContain('Form should have an accessible label')
    })

    it('should pass with aria-label', () => {
      const props = { 'aria-label': 'Contact form' }
      const warnings = A11yValidator.validateForm(props)
      
      expect(warnings).toHaveLength(0)
    })
  })

  describe('validateInput', () => {
    it('should warn about unlabeled input', () => {
      const props = {}
      const warnings = A11yValidator.validateInput(props)
      
      expect(warnings).toContain('Input should be properly labeled')
    })

    it('should warn about required inputs without aria-required', () => {
      const props = { required: true, id: 'test' }
      const warnings = A11yValidator.validateInput(props)
      
      expect(warnings).toContain('Required inputs should have aria-required="true"')
    })
  })
})

describe('React hooks', () => {
  describe('useA11yId', () => {
    it('should generate stable ID', () => {
      const { result, rerender } = renderHook(() => useA11yId())
      
      const id1 = result.current
      rerender()
      const id2 = result.current
      
      expect(id1).toBe(id2)
      expect(id1).toMatch(/^field-\d+-[a-z0-9]+$/)
    })

    it('should use custom prefix', () => {
      const { result } = renderHook(() => useA11yId('custom'))
      
      expect(result.current).toMatch(/^custom-\d+-[a-z0-9]+$/)
    })
  })

  describe('useAnnouncement', () => {
    it('should return announcement function', () => {
      const { result } = renderHook(() => useAnnouncement())
      
      expect(result.current).toBeInstanceOf(Function)
    })

    it('should be stable across renders', () => {
      const { result, rerender } = renderHook(() => useAnnouncement())
      
      const announce1 = result.current
      rerender()
      const announce2 = result.current
      
      expect(announce1).toBe(announce2)
    })
  })

  describe('useAccessibilityPreferences', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('reduce'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    })

    it('should return accessibility preferences', () => {
      const { result } = renderHook(() => useAccessibilityPreferences())
      
      expect(result.current).toHaveProperty('prefersReducedMotion')
      expect(result.current).toHaveProperty('prefersHighContrast')
      expect(result.current).toHaveProperty('prefersDarkMode')
    })

    it('should update when preferences change', () => {
      let motionListener: ((e: { matches: boolean }) => void) | null = null
      
      mockMatchMedia.mockImplementation((query) => ({
        matches: query.includes('reduce'),
        addEventListener: vi.fn((_, listener) => {
          if (query.includes('reduce')) {
            motionListener = listener
          }
        }),
        removeEventListener: vi.fn()
      }))

      const { result } = renderHook(() => useAccessibilityPreferences())
      
      expect(result.current.prefersReducedMotion).toBe(true)
      
      // Simulate preference change
      act(() => {
        motionListener?.({ matches: false })
      })
      
      expect(result.current.prefersReducedMotion).toBe(false)
    })
  })
})

describe('initializeAccessibility', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    CSS.supports = vi.fn()
  })

  it('should initialize screen reader announcer', () => {
    // Clear any existing live region
    ScreenReaderAnnouncer['liveRegion'] = null
    
    initializeAccessibility()
    
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion).toBeTruthy()
    expect(liveRegion).not.toBeNull()
  })

  it('should add focus-visible polyfill when not supported', () => {
    CSS.supports = vi.fn().mockReturnValue(false)
    
    initializeAccessibility()
    
    const styleElements = document.head.querySelectorAll('style')
    const hasPolyfillStyle = Array.from(styleElements).some(style => 
      style.textContent?.includes('focus-visible')
    )
    expect(hasPolyfillStyle).toBe(true)
  })

  it('should not add polyfill when focus-visible is supported', () => {
    CSS.supports = vi.fn().mockReturnValue(true)
    
    initializeAccessibility()
    
    const styleElements = document.head.querySelectorAll('style')
    const hasPolyfillStyle = Array.from(styleElements).some(style => 
      style.textContent?.includes('focus-visible')
    )
    expect(hasPolyfillStyle).toBe(false)
  })
})