import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock framer-motion to avoid issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    section: 'section',
    button: 'button',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
}))

// Mock react-syntax-highlighter to avoid issues in tests
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => children,
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => 'ChevronDown',
  ChevronRight: () => 'ChevronRight',
  Code: () => 'Code',
  Copy: () => 'Copy',
  Download: () => 'Download',
  Eye: () => 'Eye',
  EyeOff: () => 'EyeOff',
  FileText: () => 'FileText',
  Grid: () => 'Grid',
  Menu: () => 'Menu',
  Play: () => 'Play',
  Plus: () => 'Plus',
  Settings: () => 'Settings',
  Square: () => 'Square',
  Trash2: () => 'Trash2',
  X: () => 'X',
  ArrowRight: () => 'ArrowRight',
  BookOpen: () => 'BookOpen',
  Palette: () => 'Palette',
  Zap: () => 'Zap',
  Shield: () => 'Shield',
  Target: () => 'Target',
  Clock: () => 'Clock',
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollTo
Element.prototype.scrollTo = vi.fn()
window.scrollTo = vi.fn()

// Mock fetch for API tests
global.fetch = vi.fn()

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock CSS.supports
Object.defineProperty(CSS, 'supports', {
  writable: true,
  value: vi.fn(() => true),
})

// Suppress React act() warnings in tests
global.IS_REACT_ACT_ENVIRONMENT = true
