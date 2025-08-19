// Types for UTXO visualization
export interface UTXOBox {
  id: string;
  value: string | number;
  ergoTreeHash?: string;
  script?: string;
  tokens?: Array<{ id: string; amount: string | number }>;
  registers?: Record<string, any>;
  creationHeight?: number;
  state: 'unspent' | 'spending' | 'spent';
  party?: string;
  type: 'user' | 'contract' | 'system';
  description?: string;
}

export interface UTXOTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'swap' | 'transfer' | 'setup';
  inputs: string[];
  outputs: string[];
  dataInputs?: string[];
  fee: string | number;
  status: 'pending' | 'confirmed' | 'failed';
  signer?: string;
  description?: string;
}

export interface VisualizationData {
  boxes: UTXOBox[];
  transactions: UTXOTransaction[];
  parties: string[];
}