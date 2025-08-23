import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce, useBatchUpdates, performanceUtils } from './usePerformanceOptimizations';
import MemoryManager from '../utils/memoryManagement';

// Optimized state management for high-performance components
export interface OptimizedStateConfig<T> {
  initialState: T;
  enableBatching?: boolean;
  enableUndo?: boolean;
  maxHistorySize?: number;
  debounceMs?: number;
  equalityFn?: (a: T, b: T) => boolean;
  serializer?: {
    serialize: (state: T) => string;
    deserialize: (data: string) => T;
  };
}

interface OptimizedStateHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

type OptimizedStateAction<T> = 
  | { type: 'SET_STATE'; payload: T }
  | { type: 'UPDATE_STATE'; payload: Partial<T> }
  | { type: 'BATCH_UPDATE'; payload: Partial<T>[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'LOAD_STATE'; payload: T };

// High-performance state reducer with history and batching
function optimizedStateReducer<T extends Record<string, unknown>>(
  state: OptimizedStateHistory<T>,
  action: OptimizedStateAction<T>,
  config: OptimizedStateConfig<T>
): OptimizedStateHistory<T> {
  const { maxHistorySize = 50, equalityFn = performanceUtils.shallowEqual } = config;

  const addToHistory = (newPresent: T): OptimizedStateHistory<T> => {
    if (equalityFn(state.present, newPresent)) {
      return state;
    }

    const newPast = [...state.past, state.present];
    if (newPast.length > maxHistorySize) {
      newPast.shift();
    }

    return {
      past: newPast,
      present: newPresent,
      future: []
    };
  };

  switch (action.type) {
    case 'SET_STATE':
      return addToHistory(action.payload);

    case 'UPDATE_STATE': {
      const newState = MemoryManager.secureMerge(state.present, action.payload);
      return addToHistory(newState);
    }

    case 'BATCH_UPDATE': {
      let newState = MemoryManager.deepClone(state.present);
      for (const update of action.payload) {
        newState = MemoryManager.secureMerge(newState, update);
      }
      return addToHistory(newState);
    }

    case 'UNDO':
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future]
      };

    case 'REDO':
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1)
      };

    case 'CLEAR_HISTORY':
      return {
        past: [],
        present: state.present,
        future: []
      };

    case 'LOAD_STATE':
      return {
        past: [],
        present: action.payload,
        future: []
      };

    default:
      return state;
  }
}

// Main optimized state hook
export function useOptimizedState<T extends Record<string, unknown>>(
  config: OptimizedStateConfig<T>
) {
  const {
    initialState,
    enableBatching = true,
    enableUndo = false,
    debounceMs = 0,
    serializer
  } = config;

  // Initialize state with history
  const initialHistory: OptimizedStateHistory<T> = useMemo(() => ({
    past: [],
    present: initialState,
    future: []
  }), [initialState]);

  const [stateHistory, dispatch] = useReducer(
    (state: OptimizedStateHistory<T>, action: OptimizedStateAction<T>) =>
      optimizedStateReducer(state, action, config),
    initialHistory
  );

  // Batch updates for performance
  const { addToQueue, processBatchDelayed } = useBatchUpdates<Partial<T>>();

  // Debounced state for expensive operations
  const debouncedState = useDebounce(stateHistory.present, debounceMs);

  // Memoized selectors for derived state
  const selectors = useMemo(() => ({
    getState: () => stateHistory.present,
    canUndo: stateHistory.past.length > 0,
    canRedo: stateHistory.future.length > 0,
    historySize: stateHistory.past.length + stateHistory.future.length,
    
    // Create memoized property selectors
    select: <K extends keyof T>(key: K) => 
      performanceUtils.createMemoizedSelector(
        (state: T) => state[key],
        config.equalityFn
      )(stateHistory.present),
    
    // Multi-property selector
    selectMultiple: <K extends keyof T>(keys: K[]): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      keys.forEach(key => {
        result[key] = stateHistory.present[key];
      });
      return result;
    }
  }), [stateHistory, config.equalityFn]);

  // Optimized state setters
  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    const resolvedState = typeof newState === 'function' ? newState(stateHistory.present) : newState;
    dispatch({ type: 'SET_STATE', payload: resolvedState });
  }, [stateHistory.present]);

  const updateState = useCallback((updates: Partial<T>) => {
    if (enableBatching) {
      addToQueue(updates);
      processBatchDelayed((batchedUpdates) => {
        dispatch({ type: 'BATCH_UPDATE', payload: batchedUpdates });
      }, 16); // ~60fps batching
    } else {
      dispatch({ type: 'UPDATE_STATE', payload: updates });
    }
  }, [enableBatching, addToQueue, processBatchDelayed]);

  // Property-specific setters for better performance
  const setProperty = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    updateState({ [key]: value } as unknown as Partial<T>);
  }, [updateState]);

  // History management
  const undo = useCallback(() => {
    if (enableUndo) {
      dispatch({ type: 'UNDO' });
    }
  }, [enableUndo]);

  const redo = useCallback(() => {
    if (enableUndo) {
      dispatch({ type: 'REDO' });
    }
  }, [enableUndo]);

  const clearHistory = useCallback(() => {
    if (enableUndo) {
      dispatch({ type: 'CLEAR_HISTORY' });
    }
  }, [enableUndo]);

  // State persistence
  const saveState = useCallback(async (key: string): Promise<void> => {
    if (!serializer) return;
    
    try {
      const serialized = serializer.serialize(stateHistory.present);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [stateHistory.present, serializer]);

  const loadState = useCallback(async (key: string): Promise<boolean> => {
    if (!serializer) return false;
    
    try {
      const serialized = localStorage.getItem(key);
      if (serialized) {
        const state = serializer.deserialize(serialized);
        dispatch({ type: 'LOAD_STATE', payload: state });
        return true;
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
    
    return false;
  }, [serializer]);

  // Performance monitoring
  const performanceMetrics = useRef({
    updateCount: 0,
    lastUpdateTime: 0,
    averageUpdateTime: 0
  });

  useEffect(() => {
    const now = performance.now();
    const timeSinceLastUpdate = now - performanceMetrics.current.lastUpdateTime;
    
    performanceMetrics.current.updateCount++;
    performanceMetrics.current.averageUpdateTime = 
      (performanceMetrics.current.averageUpdateTime + timeSinceLastUpdate) / 2;
    performanceMetrics.current.lastUpdateTime = now;
  }, [stateHistory.present]);

  return {
    // Core state
    state: stateHistory.present,
    debouncedState,
    
    // Selectors
    ...selectors,
    
    // State setters
    setState,
    updateState,
    setProperty,
    
    // History management (if enabled)
    ...(enableUndo && {
      undo,
      redo,
      clearHistory
    }),
    
    // Persistence
    saveState,
    loadState,
    
    // Performance metrics
    getPerformanceMetrics: () => ({ ...performanceMetrics.current }),
    
    // Raw dispatch for advanced usage
    dispatch
  };
}

// Specialized hook for canvas state management
export function useCanvasState(initialCanvas: {
  components: unknown[];
  connections: unknown[];
  selectedComponent: string | null;
  zoomLevel: number;
  offset: { x: number; y: number };
}) {
  return useOptimizedState({
    initialState: initialCanvas,
    enableBatching: true,
    enableUndo: true,
    maxHistorySize: 20,
    debounceMs: 100,
    equalityFn: performanceUtils.shallowEqual,
    serializer: {
      serialize: (state) => JSON.stringify(state),
      deserialize: (data) => JSON.parse(data)
    }
  });
}

// Specialized hook for form state management
export function useFormState<T extends Record<string, unknown>>(initialForm: T) {
  const optimizedState = useOptimizedState({
    initialState: {
      values: initialForm,
      errors: {} as Record<keyof T, string>,
      touched: {} as Record<keyof T, boolean>,
      isValid: true,
      isDirty: false
    },
    enableBatching: true,
    debounceMs: 300,
    equalityFn: performanceUtils.shallowEqual
  });

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    optimizedState.updateState({
      values: MemoryManager.secureMerge(optimizedState.state.values, { [field]: value } as Record<string, unknown>),
      isDirty: true,
      touched: MemoryManager.secureMerge(optimizedState.state.touched, { [field]: true } as Record<string, boolean>)
    });
  }, [optimizedState]);

  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string) => {
    optimizedState.updateState({
      errors: MemoryManager.secureMerge(optimizedState.state.errors, { [field]: error } as Record<string, string>),
      isValid: Object.keys(MemoryManager.secureMerge(optimizedState.state.errors, { [field]: error } as Record<string, string>)).length === 0
    });
  }, [optimizedState]);

  return {
    ...optimizedState,
    setFieldValue,
    setFieldError,
    resetForm: () => optimizedState.setState({
      values: initialForm,
      errors: {} as Record<keyof T, string>,
      touched: {} as Record<keyof T, boolean>,
      isValid: true,
      isDirty: false
    })
  };
}

export default useOptimizedState;