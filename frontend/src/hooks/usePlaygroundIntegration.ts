import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { ContractComponent, Connection, GeneratedContract } from '../types/contractDesigner';
import { useTimer } from '../utils/memoryManagement';
import { useErrorHandler } from '../components/common/ErrorBoundary';

// Enhanced error types for playground operations
interface PlaygroundError extends Error {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
}

// Network and API related errors
class NetworkError extends Error implements PlaygroundError {
  code: string = 'NETWORK_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  context?: Record<string, any>;
  recoverable: boolean = true;
  retryable: boolean = true;
  
  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'NetworkError';
    this.context = context;
  }
}

class CompilationError extends Error implements PlaygroundError {
  code: string = 'COMPILATION_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
  context?: Record<string, any>;
  recoverable: boolean = false;
  retryable: boolean = false;
  
  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'CompilationError';
    this.context = context;
  }
}

class ExecutionError extends Error implements PlaygroundError {
  code: string = 'EXECUTION_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
  context?: Record<string, any>;
  recoverable: boolean = false;
  retryable: boolean = true;
  
  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ExecutionError';
    this.context = context;
  }
}

class ValidationError extends Error implements PlaygroundError {
  code: string = 'VALIDATION_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  context?: Record<string, any>;
  recoverable: boolean = false;
  retryable: boolean = false;
  
  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
  }
}

// Types for playground integration
export interface PlaygroundExecutionResult {
  success: boolean;
  transactionId?: string;
  outputBoxes?: any[];
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
  before?: any;
  after?: any;
  timestamp: number;
}

export interface PlaygroundParty {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  balance: number;
  tokens: Record<string, number>;
  boxes: any[];
}

export interface PlaygroundScenario {
  id: string;
  name: string;
  description: string;
  parties: PlaygroundParty[];
  initialHeight: number;
  steps: PlaygroundStep[];
  expectedResult?: any;
}

export interface PlaygroundStep {
  id: string;
  type: 'transaction' | 'height-advance' | 'token-creation' | 'assertion';
  description: string;
  parameters: Record<string, any>;
  expectedOutcome?: any;
}

// Enhanced API client for playground backend with comprehensive error handling
class PlaygroundApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private abortController: AbortController;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private requestTimeout: number = 30000;

  constructor(baseUrl: string = '/api/playground', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.abortController = new AbortController();
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryAttempt: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'X-Client-Version': '1.0.0',
      ...options.headers,
    };

    if (this.apiKey) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const requestConfig: RequestInit = {
      ...options,
      headers,
      signal: this.abortController.signal,
      timeout: this.requestTimeout,
    };

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new NetworkError(
            `Request to ${endpoint} timed out after ${this.requestTimeout}ms`,
            { endpoint, timeout: this.requestTimeout, attempt: retryAttempt }
          ));
        }, this.requestTimeout);
      });

      const fetchPromise = fetch(url, requestConfig);
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Handle various HTTP error status codes
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        
        const errorContext = {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          attempt: retryAttempt,
          url
        };

        switch (response.status) {
          case 400:
            throw new ValidationError(`Bad request: ${errorText}`, errorContext);
          case 401:
            throw new NetworkError(`Unauthorized: ${errorText}`, { ...errorContext, retryable: false });
          case 403:
            throw new NetworkError(`Forbidden: ${errorText}`, { ...errorContext, retryable: false });
          case 404:
            throw new NetworkError(`Endpoint not found: ${endpoint}`, { ...errorContext, retryable: false });
          case 408:
          case 429:
          case 502:
          case 503:
          case 504:
            // Retryable server errors
            const retryableError = new NetworkError(
              `Server error (${response.status}): ${errorText}`,
              errorContext
            );
            if (retryAttempt < this.maxRetries) {
              return this.retryRequest(endpoint, options, retryAttempt, retryableError);
            }
            throw retryableError;
          case 500:
          default:
            throw new NetworkError(
              `API request failed (${response.status}): ${errorText}`,
              errorContext
            );
        }
      }

      // Validate response content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Unexpected content type: ${contentType} for endpoint ${endpoint}`);
      }

      const responseData = await response.json();
      
      // Reset retry count on successful request
      this.retryCount = 0;
      
      return responseData;
      
    } catch (error) {
      // Handle network and parsing errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new NetworkError(
          'Network connection failed - please check your internet connection',
          { endpoint, originalError: error.message, attempt: retryAttempt }
        );
        
        if (retryAttempt < this.maxRetries) {
          return this.retryRequest(endpoint, options, retryAttempt, networkError);
        }
        throw networkError;
      }
      
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        throw new NetworkError(
          'Invalid response format received from server',
          { endpoint, originalError: error.message, attempt: retryAttempt }
        );
      }
      
      // If it's already one of our custom errors, re-throw
      if (error instanceof NetworkError || error instanceof ValidationError || 
          error instanceof CompilationError || error instanceof ExecutionError) {
        throw error;
      }
      
      // Handle AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(
          'Request was cancelled',
          { endpoint, reason: 'aborted', attempt: retryAttempt }
        );
      }
      
      // Generic error fallback
      throw new NetworkError(
        `Unexpected error during request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { endpoint, originalError: error, attempt: retryAttempt }
      );
    }
  }
  
  private async retryRequest<T>(
    endpoint: string,
    options: RequestInit,
    currentAttempt: number,
    lastError: PlaygroundError
  ): Promise<T> {
    const nextAttempt = currentAttempt + 1;
    const delay = this.retryDelay * Math.pow(2, currentAttempt); // Exponential backoff
    
    console.warn(`🔄 Retrying request to ${endpoint} (attempt ${nextAttempt}/${this.maxRetries + 1}) after ${delay}ms:`, lastError.message);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recreate abort controller if it was aborted
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
    }
    
    return this.makeRequest<T>(endpoint, options, nextAttempt);
  }

  // Clean up method for proper resource disposal
  public dispose(): void {
    this.abortController.abort();
  }

  // Create new abort controller if needed
  private ensureValidController(): void {
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
    }
  }

  async compileContract(ergoScript: string): Promise<{
    compiledBytes: string;
    address: string;
    complexity: number;
    errors?: string[];
    warnings?: string[];
  }> {
    this.ensureValidController();
    
    // Validate input
    if (!ergoScript || typeof ergoScript !== 'string') {
      throw new ValidationError(
        'ErgoScript code is required for compilation',
        { providedType: typeof ergoScript, length: ergoScript?.length }
      );
    }
    
    if (ergoScript.trim().length === 0) {
      throw new ValidationError(
        'ErgoScript code cannot be empty',
        { length: ergoScript.length }
      );
    }
    
    if (ergoScript.length > 100000) { // 100KB limit
      throw new ValidationError(
        'ErgoScript code is too large - maximum 100KB allowed',
        { length: ergoScript.length, maxLength: 100000 }
      );
    }
    
    try {
      const result = await this.makeRequest<{
        compiledBytes: string;
        address: string;
        complexity: number;
        errors?: string[];
        warnings?: string[];
      }>('/compile', {
        method: 'POST',
        body: JSON.stringify({ ergoScript }),
      });
      
      // Validate response
      if (!result.compiledBytes && (!result.errors || result.errors.length === 0)) {
        throw new CompilationError(
          'Compilation completed but no compiled bytes or errors were returned',
          { ergoScriptLength: ergoScript.length }
        );
      }
      
      if (result.errors && result.errors.length > 0) {
        throw new CompilationError(
          `Compilation failed with ${result.errors.length} errors: ${result.errors.join(', ')}`,
          { errors: result.errors, warnings: result.warnings }
        );
      }
      
      return result;
      
    } catch (error) {
      if (error instanceof PlaygroundError) {
        throw error;
      }
      
      throw new CompilationError(
        `Contract compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, ergoScriptLength: ergoScript.length }
      );
    }
  }

  async executeContract(
    compiledContract: string,
    scenario: PlaygroundScenario
  ): Promise<PlaygroundExecutionResult> {
    this.ensureValidController();
    
    // Validate inputs
    if (!compiledContract || typeof compiledContract !== 'string') {
      throw new ValidationError(
        'Compiled contract bytes are required for execution',
        { providedType: typeof compiledContract }
      );
    }
    
    if (!scenario || typeof scenario !== 'object') {
      throw new ValidationError(
        'Valid scenario is required for contract execution',
        { providedType: typeof scenario, hasScenario: !!scenario }
      );
    }
    
    if (!scenario.parties || !Array.isArray(scenario.parties) || scenario.parties.length === 0) {
      throw new ValidationError(
        'Scenario must contain at least one party',
        { partiesType: typeof scenario.parties, partiesLength: scenario.parties?.length }
      );
    }
    
    try {
      const result = await this.makeRequest<PlaygroundExecutionResult>('/execute', {
        method: 'POST',
        body: JSON.stringify({
          contract: compiledContract,
          scenario,
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }),
      });
      
      // Validate execution result
      if (typeof result.success !== 'boolean') {
        throw new ExecutionError(
          'Invalid execution result - missing success field',
          { result }
        );
      }
      
      if (!result.success && (!result.errors || result.errors.length === 0)) {
        throw new ExecutionError(
          'Execution failed but no error details were provided',
          { result }
        );
      }
      
      return result;
      
    } catch (error) {
      if (error instanceof PlaygroundError) {
        throw error;
      }
      
      throw new ExecutionError(
        `Contract execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, scenarioId: scenario.id }
      );
    }
  }

  async createScenario(
    components: ContractComponent[],
    connections: Connection[]
  ): Promise<PlaygroundScenario> {
    this.ensureValidController();
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
    this.ensureValidController();
    return this.makeRequest('/validate', {
      method: 'POST',
      body: JSON.stringify({ ergoScript }),
    });
  }

  async generateTestData(contractType: string): Promise<{
    parties: PlaygroundParty[];
    initialBoxes: any[];
    testScenarios: PlaygroundScenario[];
  }> {
    this.ensureValidController();
    return this.makeRequest(`/test-data/${contractType}`);
  }

  async checkHealth(): Promise<{ status: string }> {
    this.ensureValidController();
    return this.makeRequest('/health');
  }
}

// Main playground integration hook with enhanced error handling
export function usePlaygroundIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<PlaygroundExecutionResult[]>([]);
  const [activeScenario, setActiveScenario] = useState<PlaygroundScenario | null>(null);
  const [compilationCache, setCompilationCache] = useState<Map<string, any>>(new Map());
  const [lastError, setLastError] = useState<PlaygroundError | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const apiClient = useRef(new PlaygroundApiClient());
  const executionQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueue = useRef(false);
  const cleanupFunctions = useRef<Array<() => void>>([]);
  const { reportError } = useErrorHandler();
  
  // Error handling utilities
  const handleError = useCallback((error: PlaygroundError, operation?: string) => {
    setLastError(error);
    reportError(error, {
      operation,
      context: error.context,
      playgroundState: {
        isConnected,
        isExecuting,
        connectionAttempts,
        queueLength: executionQueue.current.length
      }
    });
    
    console.group('🔴 Playground Integration Error');
    console.error('Operation:', operation || 'Unknown');
    console.error('Error Code:', error.code);
    console.error('Message:', error.message);
    console.error('Severity:', error.severity);
    console.error('Context:', error.context);
    console.groupEnd();
  }, [reportError, isConnected, isExecuting, connectionAttempts]);
  
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);
  
  const createPlaygroundError = useCallback((message: string, code: string, severity: PlaygroundError['severity'] = 'medium', context?: Record<string, any>): PlaygroundError => {
    return {
      name: 'PlaygroundError',
      message,
      code,
      severity,
      context,
      recoverable: severity !== 'critical',
      retryable: ['NETWORK_ERROR', 'TIMEOUT'].includes(code)
    } as PlaygroundError;
  }, []);

  // Enhanced connection initialization with retry logic
  useEffect(() => {
    const initializeConnection = async (attempt: number = 0) => {
      const maxAttempts = 3;
      setIsRetrying(attempt > 0);
      
      try {
        // Test connection to playground backend
        await apiClient.current.checkHealth();
        setIsConnected(true);
        setConnectionAttempts(0);
        setIsRetrying(false);
        clearError();
        
        console.log('✅ Playground backend connected successfully');
        
      } catch (error) {
        const connectionError = error instanceof PlaygroundError 
          ? error 
          : createPlaygroundError(
              `Failed to connect to playground backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'CONNECTION_FAILED',
              attempt >= maxAttempts ? 'high' : 'medium',
              { attempt, maxAttempts, originalError: error }
            );
        
        setIsConnected(false);
        setConnectionAttempts(prev => prev + 1);
        
        if (attempt < maxAttempts && connectionError.retryable) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.warn(`⚠️ Retrying playground connection (attempt ${attempt + 1}/${maxAttempts + 1}) in ${retryDelay}ms:`, connectionError.message);
          
          setTimeout(() => initializeConnection(attempt + 1), retryDelay);
        } else {
          setIsRetrying(false);
          handleError(connectionError, 'initializeConnection');
          console.warn('❌ Playground backend not available - running in offline mode');
        }
      }
    };

    initializeConnection();

    // Cleanup function for component unmount
    return () => {
      // Clean up API client
      if (apiClient.current) {
        apiClient.current.dispose();
      }
      
      // Clear execution queue
      executionQueue.current = [];
      isProcessingQueue.current = false;
      
      // Clear compilation cache to free memory
      setCompilationCache(new Map());
      
      // Execute all registered cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupFunctions.current = [];
    };
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

  // Enhanced compile contract with comprehensive error handling and caching
  const compileContract = useCallback(async (
    ergoScript: string
  ): Promise<{
    compiledBytes: string;
    address: string;
    complexity: number;
    errors?: string[];
    warnings?: string[];
  }> => {
    if (!isConnected) {
      const offlineError = createPlaygroundError(
        'Cannot compile contract - playground backend is not available',
        'OFFLINE_ERROR',
        'high',
        { operation: 'compileContract', isConnected, connectionAttempts }
      );
      handleError(offlineError, 'compileContract');
      throw offlineError;
    }
    
    // Input validation
    if (!ergoScript || typeof ergoScript !== 'string' || ergoScript.trim().length === 0) {
      const validationError = createPlaygroundError(
        'Valid ErgoScript code is required for compilation',
        'INVALID_INPUT',
        'medium',
        { ergoScriptType: typeof ergoScript, length: ergoScript?.length }
      );
      handleError(validationError, 'compileContract');
      throw validationError;
    }
    
    // Generate cache key with hash to prevent key collisions
    const encoder = new TextEncoder();
    const data = encoder.encode(ergoScript.slice(0, 1000));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const cacheKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    
    // Check cache first
    if (compilationCache.has(cacheKey)) {
      console.log('📋 Using cached compilation result');
      return compilationCache.get(cacheKey);
    }

    try {
      clearError(); // Clear any previous errors
      const result = await apiClient.current.compileContract(ergoScript);
      
      // Implement LRU cache with size limit to prevent memory leaks
      setCompilationCache(prev => {
        const newCache = new Map(prev);
        
        // Limit cache size to prevent memory leaks
        const maxCacheSize = 50;
        while (newCache.size >= maxCacheSize) {
          const oldestKey = newCache.keys().next().value;
          newCache.delete(oldestKey);
        }
        
        newCache.set(cacheKey, result);
        return newCache;
      });
      
      console.log('✅ Contract compilation successful');
      return result;
      
    } catch (error) {
      const compilationError = error instanceof PlaygroundError
        ? error
        : createPlaygroundError(
            `Contract compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'COMPILATION_FAILED',
            'high',
            { ergoScriptLength: ergoScript.length, originalError: error }
          );
      
      handleError(compilationError, 'compileContract');
      throw compilationError;
    }
  }, [isConnected, connectionAttempts, compilationCache, createPlaygroundError, handleError, clearError]);

  // Enhanced execute contract with comprehensive error handling and validation
  const executeContract = useCallback(async (
    generatedContract: GeneratedContract,
    scenario?: PlaygroundScenario
  ): Promise<PlaygroundExecutionResult> => {
    if (!isConnected) {
      const offlineError = createPlaygroundError(
        'Cannot execute contract - playground environment is not available',
        'OFFLINE_ERROR',
        'high',
        { operation: 'executeContract', isConnected, connectionAttempts }
      );
      handleError(offlineError, 'executeContract');
      throw offlineError;
    }
    
    // Validate inputs
    if (!generatedContract || !generatedContract.ergoScript) {
      const validationError = createPlaygroundError(
        'Valid generated contract is required for execution',
        'INVALID_CONTRACT',
        'medium',
        { hasContract: !!generatedContract, hasScript: !!generatedContract?.ergoScript }
      );
      handleError(validationError, 'executeContract');
      throw validationError;
    }

    const executionTask = async (): Promise<PlaygroundExecutionResult> => {
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        clearError(); // Clear any previous errors
        
        // Compile the contract first
        console.log('🔄 Compiling contract for execution...');
        const compilation = await compileContract(generatedContract.ergoScript);
        
        if (compilation.errors && compilation.errors.length > 0) {
          throw new CompilationError(
            `Contract compilation failed with ${compilation.errors.length} errors`,
            { errors: compilation.errors, warnings: compilation.warnings, executionId }
          );
        }

        // Use provided scenario or create a default one
        console.log('🔄 Preparing execution scenario...');
        const executionScenario = scenario || await createDefaultScenario();
        
        // Validate scenario
        if (!executionScenario.parties || executionScenario.parties.length === 0) {
          throw new ValidationError(
            'Execution scenario must contain at least one party',
            { scenarioId: executionScenario.id, executionId }
          );
        }
        
        // Execute the contract
        console.log('🔄 Executing contract...');
        const startTime = Date.now();
        const result = await apiClient.current.executeContract(
          compilation.compiledBytes,
          executionScenario
        );
        const executionTime = Date.now() - startTime;

        // Enhance result with additional metadata
        const enhancedResult = {
          ...result,
          executionId,
          compilationTime: compilation.complexity || 0,
          totalTime: executionTime,
          timestamp: new Date().toISOString()
        };

        // Store the result
        setExecutionResults(prev => [...prev.slice(-19), enhancedResult]); // Keep last 20 results
        
        console.log('✅ Contract execution completed successfully');
        return enhancedResult;
        
      } catch (error) {
        const executionError = error instanceof PlaygroundError
          ? error
          : createPlaygroundError(
              `Contract execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'EXECUTION_FAILED',
              'high',
              { executionId, originalError: error, contractLength: generatedContract.ergoScript.length }
            );
            
        handleError(executionError, 'executeContract');
        
        // Create error result for tracking
        const errorResult: PlaygroundExecutionResult = {
          success: false,
          executionTime: 0,
          gasUsed: 0,
          logs: [`Execution failed: ${executionError.message}`],
          errors: [executionError.message],
          stateChanges: [],
          executionId,
          timestamp: new Date().toISOString()
        };
        
        setExecutionResults(prev => [...prev.slice(-19), errorResult]);
        throw executionError;
      }
    };

    // Add to execution queue with error handling
    return new Promise<PlaygroundExecutionResult>((resolve, reject) => {
      executionQueue.current.push(async () => {
        try {
          const result = await executionTask();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      processExecutionQueue().catch(reject);
    });
  }, [isConnected, connectionAttempts, compileContract, createDefaultScenario, processExecutionQueue, createPlaygroundError, handleError, clearError]);

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
    isRetrying,
    connectionAttempts,
    capabilities,
    
    // Error handling
    lastError,
    clearError,
    hasError: !!lastError,

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
    queueLength: executionQueue.current.length,
    
    // Health status
    healthStatus: {
      connected: isConnected,
      retrying: isRetrying,
      attempts: connectionAttempts,
      lastError: lastError?.message,
      uptime: Date.now() // This would be better calculated from connection time
    }
  };
}

// Helper function to create scenario from components (client-side fallback)
function createScenarioFromComponents(
  components: ContractComponent[],
  _connections: Connection[]
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

// Enhanced hook for managing playground connections with comprehensive error handling
export function usePlaygroundConnection() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error' | 'retrying'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState({
    latency: 0,
    uptime: 0,
    requestCount: 0,
    errorCount: 0,
    successRate: 100,
    lastSuccessfulCheck: null as Date | null,
    consecutiveFailures: 0
  });

  const abortControllerRef = useRef<AbortController>(new AbortController());
  const { reportError } = useErrorHandler();

  const checkConnection = useCallback(async (isRetry: boolean = false) => {
    if (!isRetry) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('retrying');
    }
    
    const startTime = Date.now();
    const timeoutDuration = 10000; // 10 second timeout

    try {
      // Create new abort controller if the previous one was aborted
      if (abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = new AbortController();
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new NetworkError(
            `Health check timed out after ${timeoutDuration}ms`,
            { timeout: timeoutDuration, isRetry }
          ));
        }, timeoutDuration);
      });
      
      const fetchPromise = fetch('/api/playground/health', {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Check': 'true'
        }
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const healthData = await response.json().catch(() => ({}));
        
        setConnectionStatus('connected');
        setLastError(null);
        
        setConnectionMetrics(prev => {
          const newRequestCount = prev.requestCount + 1;
          const newSuccessRate = ((newRequestCount - prev.errorCount) / newRequestCount) * 100;
          
          return {
            ...prev,
            latency,
            requestCount: newRequestCount,
            successRate: Number(newSuccessRate.toFixed(2)),
            lastSuccessfulCheck: new Date(),
            consecutiveFailures: 0,
            ...healthData
          };
        });
        
        console.log(`✅ Health check successful (${latency}ms)`);
        
      } else {
        throw new NetworkError(
          `Health check failed with status ${response.status}`,
          { 
            status: response.status, 
            statusText: response.statusText, 
            latency,
            isRetry 
          }
        );
      }
    } catch (error) {
      // Don't set error state if request was aborted (component unmounting)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Health check aborted');
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      const latency = Date.now() - startTime;
      
      setConnectionStatus('error');
      setLastError(errorMessage);
      
      setConnectionMetrics(prev => {
        const newErrorCount = prev.errorCount + 1;
        const newRequestCount = prev.requestCount + 1;
        const newSuccessRate = ((newRequestCount - newErrorCount) / newRequestCount) * 100;
        const newConsecutiveFailures = prev.consecutiveFailures + 1;
        
        return {
          ...prev,
          errorCount: newErrorCount,
          requestCount: newRequestCount,
          successRate: Number(newSuccessRate.toFixed(2)),
          consecutiveFailures: newConsecutiveFailures,
          latency: latency
        };
      });
      
      // Report error for monitoring
      if (error instanceof Error) {
        reportError(error, {
          context: 'playground-health-check',
          isRetry,
          latency,
          consecutiveFailures: connectionMetrics.consecutiveFailures + 1
        });
      }
      
      console.warn(`❌ Health check failed (${latency}ms):`, errorMessage);
    }
  }, [reportError, connectionMetrics.consecutiveFailures]);

  // Periodic connection monitoring with memory-safe timer
  useTimer(() => {
    checkConnection();
  }, 30000, 'interval'); // Check every 30 seconds

  // Initial connection check
  useEffect(() => {
    checkConnection();
    
    // Cleanup function
    return () => {
      abortControllerRef.current.abort();
    };
  }, [checkConnection]);

  const retryConnection = useCallback(async () => {
    if (connectionStatus !== 'error') return;
    
    await checkConnection(true);
  }, [connectionStatus, checkConnection]);
  
  const resetMetrics = useCallback(() => {
    setConnectionMetrics({
      latency: 0,
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      successRate: 100,
      lastSuccessfulCheck: null,
      consecutiveFailures: 0
    });
    setLastError(null);
  }, []);

  return {
    connectionStatus,
    lastError,
    connectionMetrics,
    checkConnection,
    retryConnection,
    resetMetrics,
    
    // Computed values
    isHealthy: connectionStatus === 'connected' && connectionMetrics.consecutiveFailures === 0,
    needsAttention: connectionMetrics.consecutiveFailures > 3 || connectionMetrics.successRate < 80
  };
}

export default usePlaygroundIntegration;

// Re-export error types for external use
export type { PlaygroundError, NetworkError, CompilationError, ExecutionError, ValidationError };