import { useState, useCallback, useReducer, useEffect, useMemo, useRef } from 'react';
import type { 
  ContractDesignState, 
  ContractComponent, 
  Connection, 
  ValidationError,
  ComponentType,
  Position,
  TestScenario,
  GeneratedContract
} from '../types/contractDesigner';
import { generateErgoScript as generateErgoScriptUtil, validateContractDesign } from '../utils/codeGeneration';

// Storage keys for persistence
const STORAGE_KEYS = {
  CONTRACT_STATE: 'ergo-playgrounds-contract-state',
  CANVAS_SETTINGS: 'ergo-playgrounds-canvas-settings',
  USER_PREFERENCES: 'ergo-playgrounds-user-prefs'
} as const;

// Initial state
const initialState: ContractDesignState = {
  components: [],
  connections: [],
  selectedComponent: null,
  isDragging: false,
  draggedComponent: null,
  canvasOffset: { x: 0, y: 0 },
  zoomLevel: 1,
  generatedCode: '',
  validationErrors: [],
  isGenerating: false
};

// Enhanced state for better management
interface ExtendedContractDesignState extends ContractDesignState {
  history: {
    past: ContractDesignState[];
    future: ContractDesignState[];
  };
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  metadata: {
    contractName: string;
    version: string;
    description: string;
    tags: string[];
  };
}

// Enhanced action types for the reducer
type ContractDesignerAction = 
  | { type: 'ADD_COMPONENT'; payload: ContractComponent }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<ContractComponent> } }
  | { type: 'SELECT_COMPONENT'; payload: string | null }
  | { type: 'ADD_CONNECTION'; payload: Connection }
  | { type: 'REMOVE_CONNECTION'; payload: string }
  | { type: 'START_DRAG'; payload: ContractComponent }
  | { type: 'END_DRAG' }
  | { type: 'UPDATE_CANVAS'; payload: { offset?: Position; zoom?: number } }
  | { type: 'SET_GENERATED_CODE'; payload: string }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'LOAD_CONTRACT'; payload: Partial<ContractDesignState> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_METADATA'; payload: Partial<ExtendedContractDesignState['metadata']> }
  | { type: 'BATCH_UPDATE'; payload: Partial<ContractDesignState> };

// Enhanced reducer function with history and better state management
function contractDesignerReducer(
  state: ExtendedContractDesignState, 
  action: ContractDesignerAction
): ExtendedContractDesignState {
  // Create snapshot for undo/redo
  const createSnapshot = (currentState: ExtendedContractDesignState): ContractDesignState => ({
    components: currentState.components,
    connections: currentState.connections,
    selectedComponent: currentState.selectedComponent,
    isDragging: currentState.isDragging,
    draggedComponent: currentState.draggedComponent,
    canvasOffset: currentState.canvasOffset,
    zoomLevel: currentState.zoomLevel,
    generatedCode: currentState.generatedCode,
    validationErrors: currentState.validationErrors,
    isGenerating: currentState.isGenerating
  });

  // Actions that should create history snapshots
  const shouldCreateSnapshot = [
    'ADD_COMPONENT', 'REMOVE_COMPONENT', 'UPDATE_COMPONENT',
    'ADD_CONNECTION', 'REMOVE_CONNECTION', 'CLEAR_CANVAS'
  ].includes(action.type);

  let newState = state;
  
  // Add to history if needed
  if (shouldCreateSnapshot && action.type !== 'UNDO' && action.type !== 'REDO') {
    newState = {
      ...state,
      history: {
        past: [...state.history.past.slice(-19), createSnapshot(state)], // Keep last 20
        future: [] // Clear future when new action is performed
      },
      hasUnsavedChanges: true
    };
  }
  switch (action.type) {
    case 'ADD_COMPONENT':
      return {
        ...newState,
        components: [...newState.components, action.payload],
        selectedComponent: action.payload.id
      };
      
    case 'REMOVE_COMPONENT':
      return {
        ...newState,
        components: newState.components.filter(c => c.id !== action.payload),
        connections: newState.connections.filter(
          conn => conn.sourceId !== action.payload && conn.targetId !== action.payload
        ),
        selectedComponent: newState.selectedComponent === action.payload ? null : newState.selectedComponent
      };
      
    case 'UPDATE_COMPONENT':
      return {
        ...newState,
        components: newState.components.map(c => 
          c.id === action.payload.id 
            ? { ...c, ...action.payload.updates }
            : c
        )
      };
      
    case 'SELECT_COMPONENT':
      return {
        ...newState,
        selectedComponent: action.payload
      };
      
    case 'ADD_CONNECTION':
      // Validate connection before adding
      const isValidConnection = !newState.connections.some(
        conn => conn.sourceId === action.payload.sourceId && 
                conn.targetId === action.payload.targetId &&
                conn.sourcePort === action.payload.sourcePort
      );
      
      if (!isValidConnection) return newState;
      
      return {
        ...newState,
        connections: [...newState.connections, action.payload]
      };
      
    case 'REMOVE_CONNECTION':
      return {
        ...newState,
        connections: newState.connections.filter(c => c.id !== action.payload)
      };
      
    case 'START_DRAG':
      return {
        ...newState,
        isDragging: true,
        draggedComponent: action.payload
      };
      
    case 'END_DRAG':
      return {
        ...newState,
        isDragging: false,
        draggedComponent: null
      };
      
    case 'UPDATE_CANVAS':
      return {
        ...newState,
        canvasOffset: action.payload.offset || newState.canvasOffset,
        zoomLevel: action.payload.zoom || newState.zoomLevel
      };
      
    case 'SET_GENERATED_CODE':
      return {
        ...newState,
        generatedCode: action.payload
      };
      
    case 'SET_VALIDATION_ERRORS':
      return {
        ...newState,
        validationErrors: action.payload
      };
      
    case 'SET_GENERATING':
      return {
        ...newState,
        isGenerating: action.payload
      };
      
    case 'CLEAR_CANVAS':
      return {
        ...newState,
        components: [],
        connections: [],
        selectedComponent: null,
        generatedCode: '',
        validationErrors: []
      };
      
    case 'LOAD_CONTRACT':
      return {
        ...newState,
        ...action.payload,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      };
      
    case 'UNDO':
      if (newState.history.past.length === 0) return newState;
      const previous = newState.history.past[newState.history.past.length - 1];
      return {
        ...newState,
        ...previous,
        history: {
          past: newState.history.past.slice(0, -1),
          future: [createSnapshot(newState), ...newState.history.future]
        },
        hasUnsavedChanges: true
      };
      
    case 'REDO':
      if (newState.history.future.length === 0) return newState;
      const next = newState.history.future[0];
      return {
        ...newState,
        ...next,
        history: {
          past: [...newState.history.past, createSnapshot(newState)],
          future: newState.history.future.slice(1)
        },
        hasUnsavedChanges: true
      };
      
    case 'MARK_SAVED':
      return {
        ...newState,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      };
      
    case 'SET_LOADING':
      return {
        ...newState,
        isLoading: action.payload
      };
      
    case 'UPDATE_METADATA':
      return {
        ...newState,
        metadata: { ...newState.metadata, ...action.payload },
        hasUnsavedChanges: true
      };
      
    case 'BATCH_UPDATE':
      return {
        ...newState,
        ...action.payload,
        hasUnsavedChanges: true
      };
      
    default:
      return newState;
  }
}

// Create enhanced initial state
function createEnhancedInitialState(_: null): ExtendedContractDesignState {
  return {
    ...initialState,
    history: { past: [], future: [] },
    isLoading: false,
    hasUnsavedChanges: false,
    lastSaved: null,
    metadata: {
      contractName: 'Untitled Contract',
      version: '1.0.0',
      description: '',
      tags: []
    }
  };
}

// Persistence utilities
const persistenceUtils = {
  saveToStorage: (key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  loadFromStorage: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },
  
  clearStorage: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

export function useContractDesigner() {
  const [state, dispatch] = useReducer(contractDesignerReducer, null, createEnhancedInitialState);
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([]);
  const [isTestingContract, setIsTestingContract] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Initialize from storage on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      
      const savedState = persistenceUtils.loadFromStorage(STORAGE_KEYS.CONTRACT_STATE, null);
      if (savedState) {
        dispatch({ type: 'LOAD_CONTRACT', payload: savedState });
      }
      
      const savedScenarios = persistenceUtils.loadFromStorage(`${STORAGE_KEYS.CONTRACT_STATE}-scenarios`, []);
      setTestScenarios(savedScenarios);
    }
  }, []);
  
  // Auto-save functionality with debouncing
  useEffect(() => {
    if (state.hasUnsavedChanges && hasInitialized.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const stateToSave = {
          components: state.components,
          connections: state.connections,
          canvasOffset: state.canvasOffset,
          zoomLevel: state.zoomLevel,
          metadata: state.metadata
        };
        
        persistenceUtils.saveToStorage(STORAGE_KEYS.CONTRACT_STATE, stateToSave);
        persistenceUtils.saveToStorage(`${STORAGE_KEYS.CONTRACT_STATE}-scenarios`, testScenarios);
        dispatch({ type: 'MARK_SAVED' });
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.components, state.connections, state.canvasOffset, state.zoomLevel, state.metadata, testScenarios]);
  
  // Manual save function
  const saveContract = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const stateToSave = {
        components: state.components,
        connections: state.connections,
        canvasOffset: state.canvasOffset,
        zoomLevel: state.zoomLevel,
        metadata: state.metadata,
        generatedCode: state.generatedCode
      };
      
      persistenceUtils.saveToStorage(STORAGE_KEYS.CONTRACT_STATE, stateToSave);
      persistenceUtils.saveToStorage(`${STORAGE_KEYS.CONTRACT_STATE}-scenarios`, testScenarios);
      dispatch({ type: 'MARK_SAVED' });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save contract:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, testScenarios]);
  
  // Load contract function
  const loadContract = useCallback(async (contractData: Partial<ContractDesignState>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'LOAD_CONTRACT', payload: contractData });
      
      if (contractData.testScenarios) {
        setTestScenarios(contractData.testScenarios);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to load contract:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // Undo/Redo functions
  const undo = useCallback(() => {
    if (state.history.past.length > 0) {
      dispatch({ type: 'UNDO' });
    }
  }, [state.history.past.length]);
  
  const redo = useCallback(() => {
    if (state.history.future.length > 0) {
      dispatch({ type: 'REDO' });
    }
  }, [state.history.future.length]);
  
  // Metadata management
  const updateMetadata = useCallback((updates: Partial<ExtendedContractDesignState['metadata']>) => {
    dispatch({ type: 'UPDATE_METADATA', payload: updates });
  }, []);

  // Component operations
  const addComponent = useCallback((type: ComponentType, position: Position) => {
    const newComponent: ContractComponent = {
      id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      size: { width: 200, height: 100 },
      properties: {},
      connections: [],
      label: getDefaultLabel(type),
      description: getDefaultDescription(type),
      category: getComponentCategory(type)
    };
    
    dispatch({ type: 'ADD_COMPONENT', payload: newComponent });
  }, []);

  const removeComponent = useCallback((componentId: string) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: componentId });
  }, []);

  const updateComponent = useCallback((id: string, updates: Partial<ContractComponent>) => {
    dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates } });
  }, []);

  const selectComponent = useCallback((componentId: string | null) => {
    dispatch({ type: 'SELECT_COMPONENT', payload: componentId });
  }, []);

  // Connection operations
  const addConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    const newConnection: Connection = {
      ...connection,
      id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    dispatch({ type: 'ADD_CONNECTION', payload: newConnection });
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    dispatch({ type: 'REMOVE_CONNECTION', payload: connectionId });
  }, []);

  // Canvas operations
  const updateCanvas = useCallback((updates: { offset?: Position; zoom?: number }) => {
    dispatch({ type: 'UPDATE_CANVAS', payload: updates });
  }, []);

  const clearCanvas = useCallback(() => {
    dispatch({ type: 'CLEAR_CANVAS' });
  }, []);

  // Code generation with debouncing
  const generateCode = useCallback(async () => {
    if (state.components.length === 0) {
      dispatch({ type: 'SET_GENERATED_CODE', payload: '' });
      return;
    }

    dispatch({ type: 'SET_GENERATING', payload: true });
    
    try {
      // Use the new code generation system
      const generatedContract = await generateErgoScriptUtil(state.components, state.connections);
      dispatch({ type: 'SET_GENERATED_CODE', payload: generatedContract.ergoScript });
      
      // Run validation using the new validation system
      const errors = validateContractDesign(state.components, state.connections);
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
      
    } catch (error) {
      console.error('Code generation failed:', error);
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [{
        id: 'generation-error',
        type: 'syntax',
        severity: 'error',
        message: 'Failed to generate contract code'
      }] });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  }, [state.components, state.connections]);

  // Debounced code generation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateCode();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [generateCode]);

  // Test scenario management
  const addTestScenario = useCallback((scenario: Omit<TestScenario, 'id'>) => {
    const newScenario: TestScenario = {
      ...scenario,
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    };
    
    setTestScenarios(prev => [...prev, newScenario]);
  }, []);

  const removeTestScenario = useCallback((scenarioId: string) => {
    setTestScenarios(prev => prev.filter(s => s.id !== scenarioId));
  }, []);

  const runTestScenario = useCallback(async (scenarioId: string) => {
    setIsTestingContract(true);
    
    try {
      // Update scenario status
      setTestScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, status: 'running' } : s
      ));
      
      // Simulate test execution (replace with actual implementation)
      const results = await executeContractTest(scenarioId);
      
      setTestScenarios(prev => prev.map(s => 
        s.id === scenarioId 
          ? { ...s, status: results.success ? 'passed' : 'failed', results }
          : s
      ));
      
    } catch (error) {
      console.error('Test execution failed:', error);
      setTestScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, status: 'failed' } : s
      ));
    } finally {
      setIsTestingContract(false);
    }
  }, [state.generatedCode]);

  // Computed values
  const hasValidContract = useMemo(() => {
    return state.components.length > 0 && 
           state.validationErrors.filter(e => e.severity === 'error').length === 0;
  }, [state.components.length, state.validationErrors]);

  const contractComplexity = useMemo(() => {
    return calculateComplexity(state.components, state.connections);
  }, [state.components, state.connections]);

  return {
    // State
    ...state,
    testScenarios,
    isTestingContract,
    hasValidContract,
    contractComplexity,
    
    // Enhanced state
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,

    // Component operations
    addComponent,
    removeComponent,
    updateComponent,
    selectComponent,

    // Connection operations
    addConnection,
    removeConnection,

    // Canvas operations
    updateCanvas,
    clearCanvas,

    // Code operations
    generateCode,

    // Test operations
    addTestScenario,
    removeTestScenario,
    runTestScenario,
    
    // Persistence operations
    saveContract,
    loadContract,
    
    // History operations
    undo,
    redo,
    
    // Metadata operations
    updateMetadata,

    // Utility operations
    dispatch
  };
}

// Helper functions
function getDefaultLabel(type: ComponentType): string {
  const labels = {
    'input-box': 'Input Box',
    'output-box': 'Output Box',
    'guard-condition': 'Guard Condition',
    'validation-rule': 'Validation Rule',
    'token-operation': 'Token Operation',
    'register-access': 'Register Access',
    'signature-check': 'Signature Check',
    'height-check': 'Height Check',
    'custom-logic': 'Custom Logic'
  };
  return labels[type];
}

function getDefaultDescription(type: ComponentType): string {
  const descriptions = {
    'input-box': 'Input UTXO box for the contract',
    'output-box': 'Output UTXO box created by the contract',
    'guard-condition': 'Boolean condition that must be satisfied',
    'validation-rule': 'Validation logic for contract execution',
    'token-operation': 'Token transfer or validation operation',
    'register-access': 'Access to box register data',
    'signature-check': 'Cryptographic signature verification',
    'height-check': 'Blockchain height validation',
    'custom-logic': 'Custom ErgoScript logic'
  };
  return descriptions[type];
}

function getComponentCategory(type: ComponentType): ContractComponent['category'] {
  const categories = {
    'input-box': 'input' as const,
    'output-box': 'output' as const,
    'guard-condition': 'logic' as const,
    'validation-rule': 'validation' as const,
    'token-operation': 'token' as const,
    'register-access': 'advanced' as const,
    'signature-check': 'validation' as const,
    'height-check': 'validation' as const,
    'custom-logic': 'advanced' as const
  };
  return categories[type];
}


async function executeContractTest(scenarioId: string): Promise<{ success: boolean; results?: unknown; error?: string }> {
  // Simulate test execution
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: Math.random() > 0.3,
    executionTime: Math.random() * 1000,
    gasUsed: Math.floor(Math.random() * 10000),
    outputs: [],
    logs: [`Test scenario ${scenarioId} executed`],
    stateChanges: []
  };
}

function calculateComplexity(components: ContractComponent[], connections: Connection[]): number {
  const baseComplexity = components.length * 10;
  const connectionComplexity = connections.length * 5;
  const typeComplexity = components.reduce((acc, c) => {
    const complexity = {
      'input-box': 1,
      'output-box': 1,
      'guard-condition': 3,
      'validation-rule': 4,
      'token-operation': 5,
      'register-access': 3,
      'signature-check': 4,
      'height-check': 2,
      'custom-logic': 8
    }[c.type];
    return acc + complexity;
  }, 0);
  
  return baseComplexity + connectionComplexity + typeComplexity;
}