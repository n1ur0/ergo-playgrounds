import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ContractComponent, Connection, GeneratedContract, StateValue } from '../types/contractDesigner';

// Additional type definitions for playground integration
interface ErgoBox {
  boxId: string;
  value: number;
  address: string;
  tokens: Array<{ tokenId: string; amount: number }>;
  registers: Record<string, string>;
}

// Types for playground integration
export interface PlaygroundExecutionResult {
  success: boolean;
  transactionId?: string;
  outputBoxes?: ErgoBox[];
  executionTime: number;
  gasUsed: number;
  logs: string[];
  errors?: string[];
  warnings?: string[];
  stateChanges: StateChange[];
}

export interface StateChange {
  type: 'box-created' | 'box-spent' | 'balance-updated' | 'token-transferred';
  boxId?: string;
  address?: string;
  amount?: number;
  tokenId?: string;
  before?: StateValue;
  after: StateValue;
  timestamp: number;
}

export interface PlaygroundParty {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  balance: number;
  tokens: Record<string, number>;
  boxes: ErgoBox[];
}

export interface PlaygroundScenario {
  id: string;
  name: string;
  description: string;
  parties: PlaygroundParty[];
  initialHeight: number;
  steps: PlaygroundStep[];
  expectedResult?: StateValue;
}

export interface PlaygroundStep {
  id: string;
  type: 'transaction' | 'height-advance' | 'token-creation' | 'assertion';
  description: string;
  parameters: Record<string, unknown>;
  expectedOutcome?: StateValue;
}

// API client for playground backend
class PlaygroundApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/playground', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async compileContract(ergoScript: string): Promise<{
    compiledBytes: string;
    address: string;
    complexity: number;
    errors?: string[];
    warnings?: string[];
  }> {
    return this.makeRequest('/compile', {
      method: 'POST',
      body: JSON.stringify({ ergoScript }),
    });
  }

  async executeContract(
    compiledContract: string,
    scenario: PlaygroundScenario
  ): Promise<PlaygroundExecutionResult> {
    return this.makeRequest('/execute', {
      method: 'POST',
      body: JSON.stringify({
        contract: compiledContract,
        scenario,
      }),
    });
  }

  async createScenario(
    components: ContractComponent[],
    connections: Connection[]
  ): Promise<PlaygroundScenario> {
    return this.makeRequest('/scenarios/create', {
      method: 'POST',
      body: JSON.stringify({ components, connections }),
    });
  }

  async validateContract(ergoScript: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    return this.makeRequest('/validate', {
      method: 'POST',
      body: JSON.stringify({ ergoScript }),
    });
  }

  async generateTestData(contractType: string): Promise<{
    parties: PlaygroundParty[];
    initialBoxes: ErgoBox[];
    testScenarios: PlaygroundScenario[];
  }> {
    return this.makeRequest(`/test-data/${contractType}`);
  }

  async checkHealth(): Promise<{ status: string }> {
    return this.makeRequest('/health');
  }
}

// Main playground integration hook
export function usePlaygroundIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<PlaygroundExecutionResult[]>([]);
  const [activeScenario, setActiveScenario] = useState<PlaygroundScenario | null>(null);
  const [compilationCache, setCompilationCache] = useState<Map<string, unknown>>(new Map());
  
  const apiClient = useRef(new PlaygroundApiClient());
  const executionQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueue = useRef(false);

  // Initialize connection to playground environment
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Test connection to playground backend
        await apiClient.current.checkHealth();
        setIsConnected(true);
      } catch (error) {
        console.warn('Playground backend not available:', error);
        setIsConnected(false);
      }
    };

    initializeConnection();
  }, []);

  // Queue management for contract execution
  const processExecutionQueue = useCallback(async () => {
    if (isProcessingQueue.current || executionQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    setIsExecuting(true);

    try {
      while (executionQueue.current.length > 0) {
        const task = executionQueue.current.shift();
        if (task) {
          await task();
        }
      }
    } finally {
      isProcessingQueue.current = false;
      setIsExecuting(false);
    }
  }, []);

  // Compile contract with caching
  const compileContract = useCallback(async (
    ergoScript: string
  ): Promise<{
    compiledBytes: string;
    address: string;
    complexity: number;
    errors?: string[];
    warnings?: string[];
  }> => {
    const cacheKey = btoa(ergoScript); // Base64 encode for cache key
    
    if (compilationCache.has(cacheKey)) {
      return compilationCache.get(cacheKey);
    }

    try {
      const result = await apiClient.current.compileContract(ergoScript);
      setCompilationCache(prev => new Map(prev.set(cacheKey, result)));
      return result;
    } catch (error) {
      console.error('Contract compilation failed:', error);
      throw error;
    }
  }, [compilationCache]);

  // Execute contract in playground environment
  const executeContract = useCallback(async (
    generatedContract: GeneratedContract,
    scenario?: PlaygroundScenario
  ): Promise<PlaygroundExecutionResult> => {
    if (!isConnected) {
      throw new Error('Playground environment not available');
    }

    const executionTask = async () => {
      try {
        // Compile the contract first
        const compilation = await compileContract(generatedContract.ergoScript);
        
        if (compilation.errors && compilation.errors.length > 0) {
          throw new Error(`Compilation failed: ${compilation.errors.join(', ')}`);
        }

        // Use provided scenario or create a default one
        const executionScenario = scenario || await createDefaultScenario();
        
        // Execute the contract
        const result = await apiClient.current.executeContract(
          compilation.compiledBytes,
          executionScenario
        );

        // Store the result
        setExecutionResults(prev => [...prev, result]);
        
        return result;
      } catch (error) {
        console.error('Contract execution failed:', error);
        const errorResult: PlaygroundExecutionResult = {
          success: false,
          executionTime: 0,
          gasUsed: 0,
          logs: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          stateChanges: []
        };
        setExecutionResults(prev => [...prev, errorResult]);
        throw error;
      }
    };

    // Add to execution queue
    return new Promise((resolve, reject) => {
      executionQueue.current.push(async () => {
        try {
          const result = await executionTask();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      processExecutionQueue();
    });
  }, [isConnected, compileContract, processExecutionQueue]);

  // Create default scenario for testing
  const createDefaultScenario = useCallback(async (): Promise<PlaygroundScenario> => {
    return {
      id: `scenario-${Date.now()}`,
      name: 'Default Test Scenario',
      description: 'Automatically generated test scenario',
      parties: [
        {
          id: 'alice',
          name: 'Alice',
          address: 'alice_address',
          publicKey: 'alice_pk',
          balance: 10_000_000_000, // 10 ERG
          tokens: {},
          boxes: []
        },
        {
          id: 'bob',
          name: 'Bob',
          address: 'bob_address',
          publicKey: 'bob_pk',
          balance: 10_000_000_000, // 10 ERG
          tokens: {},
          boxes: []
        }
      ],
      initialHeight: 1000,
      steps: [
        {
          id: 'step-1',
          type: 'transaction',
          description: 'Execute contract transaction',
          parameters: {
            sender: 'alice',
            recipient: 'bob',
            amount: 1_000_000_000 // 1 ERG
          }
        }
      ]
    };
  }, []);

  // Generate scenario from components
  const generateScenario = useCallback(async (
    components: ContractComponent[],
    connections: Connection[]
  ): Promise<PlaygroundScenario> => {
    if (!isConnected) {
      // Fallback to local scenario generation
      return createScenarioFromComponents(components, connections);
    }

    try {
      return await apiClient.current.createScenario(components, connections);
    } catch (error) {
      console.warn('Failed to generate scenario via API, using fallback:', error);
      return createScenarioFromComponents(components, connections);
    }
  }, [isConnected]);

  // Validate contract syntax and logic
  const validateContract = useCallback(async (ergoScript: string) => {
    if (!isConnected) {
      // Basic client-side validation
      return {
        isValid: ergoScript.trim().length > 0,
        errors: ergoScript.trim().length === 0 ? ['Contract cannot be empty'] : [],
        warnings: [],
        suggestions: []
      };
    }

    try {
      return await apiClient.current.validateContract(ergoScript);
    } catch (error) {
      console.error('Contract validation failed:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: [],
        suggestions: []
      };
    }
  }, [isConnected]);

  // Generate test data for specific contract types
  const generateTestData = useCallback(async (contractType: string) => {
    if (!isConnected) {
      return getDefaultTestData(contractType);
    }

    try {
      return await apiClient.current.generateTestData(contractType);
    } catch (error) {
      console.warn('Failed to generate test data via API, using defaults:', error);
      return getDefaultTestData(contractType);
    }
  }, [isConnected]);

  // Clear execution results
  const clearResults = useCallback(() => {
    setExecutionResults([]);
  }, []);

  // Clear compilation cache
  const clearCache = useCallback(() => {
    setCompilationCache(new Map());
  }, []);

  // Memoized connection status and capabilities
  const capabilities = useMemo(() => ({
    canCompile: isConnected,
    canExecute: isConnected,
    canValidate: isConnected,
    canGenerateTestData: isConnected,
    hasBackend: isConnected
  }), [isConnected]);

  return {
    // Connection status
    isConnected,
    isExecuting,
    capabilities,

    // Contract operations
    compileContract,
    executeContract,
    validateContract,

    // Scenario management
    generateScenario,
    activeScenario,
    setActiveScenario,
    createDefaultScenario,

    // Test data generation
    generateTestData,

    // Results and history
    executionResults,
    clearResults,

    // Cache management
    clearCache,

    // Queue status
    queueLength: executionQueue.current.length
  };
}

// Helper function to create scenario from components (client-side fallback)
function createScenarioFromComponents(
  components: ContractComponent[],
  connections: Connection[]
): PlaygroundScenario {
  const inputBoxes = components.filter(c => c.type === 'input-box');
  const outputBoxes = components.filter(c => c.type === 'output-box');
  const hasTokenOperations = components.some(c => c.type === 'token-operation');

  const parties: PlaygroundParty[] = [
    {
      id: 'sender',
      name: 'Sender',
      address: 'sender_address',
      publicKey: 'sender_pk',
      balance: 100_000_000_000, // 100 ERG
      tokens: hasTokenOperations ? { 'test_token': 1000 } : {},
      boxes: []
    },
    {
      id: 'receiver',
      name: 'Receiver',
      address: 'receiver_address',
      publicKey: 'receiver_pk',
      balance: 10_000_000_000, // 10 ERG
      tokens: {},
      boxes: []
    }
  ];

  const steps: PlaygroundStep[] = [];

  // Create steps based on components
  if (inputBoxes.length > 0) {
    steps.push({
      id: 'create-inputs',
      type: 'transaction',
      description: 'Create input boxes for contract',
      parameters: {
        inputCount: inputBoxes.length,
        totalValue: inputBoxes.reduce((sum, box) => sum + (box.properties.value || 0), 0)
      }
    });
  }

  steps.push({
    id: 'execute-contract',
    type: 'transaction',
    description: 'Execute the contract',
    parameters: {
      contractType: 'generated',
      expectedOutputs: outputBoxes.length
    }
  });

  return {
    id: `generated-scenario-${Date.now()}`,
    name: 'Generated Test Scenario',
    description: `Auto-generated scenario for contract with ${components.length} components`,
    parties,
    initialHeight: 1000,
    steps
  };
}

// Default test data for different contract types
function getDefaultTestData(contractType: string) {
  const baseParties: PlaygroundParty[] = [
    {
      id: 'alice',
      name: 'Alice',
      address: 'alice_address',
      publicKey: 'alice_pk',
      balance: 100_000_000_000,
      tokens: {},
      boxes: []
    },
    {
      id: 'bob',
      name: 'Bob',
      address: 'bob_address',
      publicKey: 'bob_pk',
      balance: 50_000_000_000,
      tokens: {},
      boxes: []
    }
  ];

  switch (contractType) {
    case 'token-swap':
      return {
        parties: baseParties.map(party => ({
          ...party,
          tokens: party.id === 'alice' 
            ? { 'token_a': 1000, 'token_b': 0 }
            : { 'token_a': 0, 'token_b': 1000 }
        })),
        initialBoxes: [],
        testScenarios: []
      };

    case 'escrow':
      return {
        parties: [
          ...baseParties,
          {
            id: 'arbiter',
            name: 'Arbiter',
            address: 'arbiter_address',
            publicKey: 'arbiter_pk',
            balance: 10_000_000_000,
            tokens: {},
            boxes: []
          }
        ],
        initialBoxes: [],
        testScenarios: []
      };

    default:
      return {
        parties: baseParties,
        initialBoxes: [],
        testScenarios: []
      };
  }
}

// Hook for managing playground connections
export function usePlaygroundConnection() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState({
    latency: 0,
    uptime: 0,
    requestCount: 0,
    errorCount: 0
  });

  const checkConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    const startTime = Date.now();

    try {
      const response = await fetch('/api/playground/health');
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        setConnectionStatus('connected');
        setLastError(null);
        setConnectionMetrics(prev => ({
          ...prev,
          latency,
          requestCount: prev.requestCount + 1
        }));
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      setConnectionMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    }
  }, []);

  // Periodic connection monitoring
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    connectionStatus,
    lastError,
    connectionMetrics,
    checkConnection
  };
}

export default usePlaygroundIntegration;