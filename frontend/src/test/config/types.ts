/**
 * Type definitions for container size testing
 */

export interface Dimensions {
  width?: number | string
  height?: number | string
  previousWidth?: number
  previousHeight?: number
  increase?: number
  minWidth?: number
  maxWidth?: number
  heightDeduction?: number
  previousDeduction?: number
  display?: string
}

export interface ComponentDimensions {
  sidebar?: Dimensions
  header?: Dimensions
  contractTester?: Dimensions
  contractEducation?: Dimensions
  contractDesigner?: {
    palette?: Dimensions
    sidePanel?: Dimensions
  }
}

export interface Breakpoint {
  min?: number
  max?: number
}

export interface Viewport {
  name: string
  width: number
  height: number
}

export interface PerformanceThresholds {
  maxLoadTime: number
  maxScrollTime: number
  maxMemoryIncrease: number
  minFPS: number
  maxLayoutShift: number
}

export interface AccessibilityRequirements {
  minContrastRatio: number
  minTouchTargetSize: number
  maxTabIndex: number
  requiredAriaLabels: string[]
}

export interface VisualRegressionConfig {
  threshold: number
  maxDiffPixels: number
  animations: 'disabled' | 'allow'
  mask: string[]
}

export interface ComponentSelectors {
  container?: string
  tabs?: string
  header?: string
  runButton?: string
  concepts?: string
  quiz?: string
  palette?: string
  canvas?: string
  sidePanel?: string
  main?: string
  sidebar?: string
  content?: string
}

export interface ComponentBehavior {
  scrollable?: boolean
  maxHeight?: string
  overflow?: string
  layout?: string
  paletteWidth?: number
  sidePanelWidth?: number
  gridTemplateColumns?: string
  minHeight?: string
}

export interface ComponentConfig {
  selectors: ComponentSelectors
  expectedBehavior: ComponentBehavior
}

export interface ErrorScenario {
  name: string
  description: string
  setup: (page: any) => Promise<void>
}

export interface ValidationFunction {
  (measurements: any, ...args: any[]): boolean
}

export interface ValidationRules {
  layout: Record<string, ValidationFunction>
  responsive: Record<string, ValidationFunction>
  performance: Record<string, ValidationFunction>
}

export interface TestDataGenerator {
  generateContent: (type: 'small' | 'medium' | 'large' | 'extreme') => any[]
  generateContracts: (count: number) => any[]
}

export interface TestConfig {
  expectedDimensions: Record<string, ComponentDimensions>
  breakpoints: Record<string, Breakpoint>
  testViewports: Viewport[]
  performance: PerformanceThresholds
  accessibility: AccessibilityRequirements
  visualRegression: VisualRegressionConfig
  components: Record<string, ComponentConfig>
  errorScenarios: ErrorScenario[]
  validation: ValidationRules
  testData: TestDataGenerator
}

export interface TestMeasurement {
  element: string
  boundingBox: {
    width: number
    height: number
    x: number
    y: number
  }
  styles: {
    width: string
    height: string
    gridTemplateColumns?: string
    maxHeight?: string
    overflow?: string
    display?: string
  }
  computed: {
    breakpoint: string
    visible: boolean
    scrollable: boolean
  }
}

export interface TestResults {
  viewport: Viewport
  measurements: Record<string, TestMeasurement>
  performance: {
    loadTime: number
    scrollTime: number
    memoryUsage: number
    fps: number
    layoutShift: number
  }
  accessibility: {
    contrastRatio: number
    touchTargetSizes: number[]
    ariaLabels: string[]
    keyboardNavigation: boolean
  }
  visual: {
    screenshotPath: string
    diffPixels: number
    passed: boolean
  }
}

export interface TestSuite {
  name: string
  description: string
  tests: TestCase[]
}

export interface TestCase {
  name: string
  description: string
  viewport: Viewport
  expectedResults: Partial<TestResults>
  setup?: (page: any) => Promise<void>
  teardown?: (page: any) => Promise<void>
}

export interface ContainerSizeTestRunner {
  runLayoutTests: (config: TestConfig) => Promise<TestResults[]>
  runResponsiveTests: (config: TestConfig) => Promise<TestResults[]>
  runPerformanceTests: (config: TestConfig) => Promise<TestResults[]>
  runAccessibilityTests: (config: TestConfig) => Promise<TestResults[]>
  runVisualRegressionTests: (config: TestConfig) => Promise<TestResults[]>
  runCrossBrowserTests: (config: TestConfig) => Promise<TestResults[]>
  generateReport: (results: TestResults[]) => Promise<string>
}