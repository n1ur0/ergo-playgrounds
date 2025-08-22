import '@testing-library/jest-dom'

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