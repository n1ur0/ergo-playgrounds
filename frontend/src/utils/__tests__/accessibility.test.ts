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

  it('should find focusable elements', () => {
    const focusableElements = FocusManager.getFocusableElements(container)
    expect(focusableElements).toHaveLength(3)
    expect(focusableElements).toContain(button1)
    expect(focusableElements).toContain(button2)
    expect(focusableElements).toContain(input)
  })

  it('should set focus on element', () => {
    const focusSpy = vi.spyOn(button1, 'focus')
    FocusManager.setFocus(button1)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('should handle focus trap', () => {
    const trap = FocusManager.createFocusTrap(container)
    expect(trap).toBeDefined()
    expect(typeof trap.activate).toBe('function')
    expect(typeof trap.deactivate).toBe('function')
  })
})

describe('ScreenReaderAnnouncer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should announce messages', () => {
    const mockElement = document.createElement('div')
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)
    
    ScreenReaderAnnouncer.announce('Test message')
    expect(mockElement.textContent).toBe('Test message')
  })

  it('should clear announcements', () => {
    const mockElement = document.createElement('div')
    mockElement.textContent = 'Test message'
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)
    
    ScreenReaderAnnouncer.clear()
    expect(mockElement.textContent).toBe('')
  })
})

describe('KeyboardHelper', () => {
  it('should identify activation keys', () => {
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

    expect(KeyboardHelper.isActivationKey(enterEvent)).toBe(true)
    expect(KeyboardHelper.isActivationKey(spaceEvent)).toBe(true)
    expect(KeyboardHelper.isActivationKey(escapeEvent)).toBe(false)
  })

  it('should identify navigation keys', () => {
    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })

    expect(KeyboardHelper.isNavigationKey(arrowUpEvent)).toBe(true)
    expect(KeyboardHelper.isNavigationKey(arrowDownEvent)).toBe(true)
    expect(KeyboardHelper.isNavigationKey(enterEvent)).toBe(false)
  })
})

describe('A11yValidator', () => {
  it('should validate button accessibility', () => {
    const validButton = { 'aria-label': 'Close dialog' }
    const invalidButton = {}

    const validWarnings = A11yValidator.validateButton(validButton)
    const invalidWarnings = A11yValidator.validateButton(invalidButton)

    expect(validWarnings).toHaveLength(0)
    expect(invalidWarnings.length).toBeGreaterThan(0)
  })

  it('should validate form accessibility', () => {
    const validForm = {
      id: 'test-form',
      'aria-label': 'Contact form'
    }
    const invalidForm = {}

    const validWarnings = A11yValidator.validateForm(validForm)
    const invalidWarnings = A11yValidator.validateForm(invalidForm)

    expect(validWarnings).toHaveLength(0)
    expect(invalidWarnings.length).toBeGreaterThan(0)
  })
})

describe('useA11yId', () => {
  it('should generate unique ids', () => {
    const { result: result1 } = renderHook(() => useA11yId())
    const { result: result2 } = renderHook(() => useA11yId())

    expect(result1.current).toBeTruthy()
    expect(result2.current).toBeTruthy()
    expect(result1.current).not.toBe(result2.current)
  })

  it('should use provided prefix', () => {
    const { result } = renderHook(() => useA11yId('custom'))
    expect(result.current).toMatch(/^custom/)
  })
})

describe('useAnnouncement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should announce messages', () => {
    const mockElement = document.createElement('div')
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)

    const { result } = renderHook(() => useAnnouncement())
    
    act(() => {
      result.current('Test announcement')
    })

    expect(mockElement.textContent).toBe('Test announcement')
  })
})

describe('useAccessibilityPreferences', () => {
  beforeEach(() => {
    mockMatchMedia.mockClear()
  })

  it('should detect reduced motion preference', () => {
    mockMatchMedia.mockReturnValue({ matches: true })
    const { result } = renderHook(() => useAccessibilityPreferences())
    
    expect(result.current.prefersReducedMotion).toBe(true)
  })

  it('should detect high contrast preference', () => {
    mockMatchMedia.mockReturnValue({ matches: true })
    const { result } = renderHook(() => useAccessibilityPreferences())
    
    expect(result.current.prefersHighContrast).toBe(true)
  })
})

describe('initializeAccessibility', () => {
  it('should initialize accessibility features', () => {
    const announcer = vi.spyOn(ScreenReaderAnnouncer, 'initialize')
    const preferences = vi.spyOn(AccessibilityPreferences, 'initialize')

    initializeAccessibility()

    expect(announcer).toHaveBeenCalled()
    expect(preferences).toHaveBeenCalled()
  })
})