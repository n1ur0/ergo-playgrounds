import React from 'react';
import { Settings, DollarSign, Key, Clock, Users } from '../utils/icons';
import './ContractParameters.css';

type ParameterValue = string | number | boolean;

interface ContractParametersProps {
  parameters: Record<string, ParameterValue>;
  onChange: (parameters: Record<string, ParameterValue>) => void;
  contractType: string;
}

const parameterConfigs = {
  simpleSend: [
    { key: 'senderFunds', label: 'Sender Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'sendAmount', label: 'Amount to Send', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 50000000 }
  ],
  pinLockContract: [
    { key: 'userFunds', label: 'User Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'pinNumber', label: 'PIN Number', type: 'text', icon: Key, defaultValue: '1293' },
    { key: 'lockAmount', label: 'Amount to Lock', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 50000000 }
  ],
  escrowDepositContract: [
    { key: 'buyerFunds', label: 'Buyer Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 200000000 },
    { key: 'sellerFunds', label: 'Seller Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'escrowAmount', label: 'Escrow Amount', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'timeoutBlocks', label: 'Timeout (blocks)', type: 'number', unit: 'blocks', icon: Clock, defaultValue: 100 }
  ],
  tokenSalesService: [
    { key: 'initialTokenSupply', label: 'Initial Token Supply', type: 'number', unit: 'tokens', icon: DollarSign, defaultValue: 1000000 },
    { key: 'tokenPrice', label: 'Token Price', type: 'number', unit: 'nanoERG per token', icon: DollarSign, defaultValue: 1000000 },
    { key: 'maxTokensPerPurchase', label: 'Max Tokens per Purchase', type: 'number', unit: 'tokens', icon: DollarSign, defaultValue: 10000 }
  ],
  headsOrTails: [
    { key: 'player1Funds', label: 'Player 1 Initial Funds', type: 'number', unit: 'nanoERG', icon: Users, defaultValue: 100000000 },
    { key: 'player2Funds', label: 'Player 2 Initial Funds', type: 'number', unit: 'nanoERG', icon: Users, defaultValue: 100000000 },
    { key: 'betAmount', label: 'Bet Amount', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 50000000 }
  ],
  singleChainSwap: [
    { key: 'partyAFunds', label: 'Party A Initial Funds', type: 'number', unit: 'nanoERG', icon: Users, defaultValue: 100000000 },
    { key: 'partyBFunds', label: 'Party B Initial Funds', type: 'number', unit: 'nanoERG', icon: Users, defaultValue: 100000000 },
    { key: 'swapAmount', label: 'Swap Amount', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 50000000 },
    { key: 'secretHash', label: 'Secret Hash', type: 'text', icon: Key, defaultValue: 'abc123hash' }
  ],
  doubleChainSwap: [
    { key: 'chainAFunds', label: 'Chain A Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'chainBFunds', label: 'Chain B Initial Funds', type: 'number', unit: 'tokens', icon: DollarSign, defaultValue: 1000 },
    { key: 'swapTimeout', label: 'Swap Timeout', type: 'number', unit: 'blocks', icon: Clock, defaultValue: 200 },
    { key: 'secretHash', label: 'Secret Hash', type: 'text', icon: Key, defaultValue: 'crosschainswap123' }
  ],
  stealthAddress: [
    { key: 'senderFunds', label: 'Sender Initial Funds', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 100000000 },
    { key: 'stealthAmount', label: 'Stealth Transfer Amount', type: 'number', unit: 'nanoERG', icon: DollarSign, defaultValue: 50000000 },
    { key: 'viewingKey', label: 'Viewing Key', type: 'text', icon: Key, defaultValue: 'viewkey123' },
    { key: 'spendingKey', label: 'Spending Key', type: 'text', icon: Key, defaultValue: 'spendkey456' }
  ]
};

const ContractParameters: React.FC<ContractParametersProps> = ({ 
  parameters, 
  onChange, 
  contractType 
}) => {
  const config = parameterConfigs[contractType as keyof typeof parameterConfigs] || [];

  const handleParameterChange = (key: string, value: ParameterValue) => {
    onChange({
      ...parameters,
      [key]: value
    });
  };

  const resetToDefaults = () => {
    const defaultParams: Record<string, ParameterValue> = {};
    config.forEach(param => {
      defaultParams[param.key] = param.defaultValue;
    });
    onChange(defaultParams);
  };

  React.useEffect(() => {
    // Initialize with default values if parameters are empty
    if (Object.keys(parameters).length === 0 && config.length > 0) {
      resetToDefaults();
    }
  }, [contractType, parameters, config.length, resetToDefaults]);

  return (
    <div className="contract-parameters">
      <div className="parameters-header">
        <h3>
          <Settings size={18} />
          Contract Parameters
        </h3>
        <button className="reset-button" onClick={resetToDefaults}>
          Reset to Defaults
        </button>
      </div>

      {config.length === 0 ? (
        <div className="no-parameters">
          <p>This contract doesn't require additional parameters.</p>
        </div>
      ) : (
        <div className="parameters-form">
          {config.map((param) => {
            const Icon = param.icon;
            return (
              <div key={param.key} className="parameter-group">
                <label className="parameter-label">
                  <Icon size={16} />
                  {param.label}
                  {param.unit && <span className="unit">({param.unit})</span>}
                </label>
                
                <div className="parameter-input">
                  {param.type === 'number' ? (
                    <input
                      type="number"
                      value={String(parameters[param.key] ?? param.defaultValue ?? '')}
                      onChange={(e) => handleParameterChange(param.key, parseInt(e.target.value) || 0)}
                      className="input-field number-input"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(parameters[param.key] ?? param.defaultValue ?? '')}
                      onChange={(e) => handleParameterChange(param.key, e.target.value)}
                      className="input-field text-input"
                    />
                  )}
                </div>

                {param.key.includes('Funds') && (
                  <div className="parameter-helper">
                    ≈ {(Number(parameters[param.key] ?? param.defaultValue ?? 0) / 1000000000).toFixed(3)} ERG
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="parameters-info">
        <h4>💡 Parameter Tips</h4>
        <ul>
          <li>1 ERG = 1,000,000,000 nanoERG</li>
          <li>Minimum transaction fee is ~1,000,000 nanoERG</li>
          <li>Hash values should be hex strings for security</li>
          <li>Block timeouts depend on network conditions (~2 minutes per block)</li>
        </ul>
      </div>
    </div>
  );
};

export default ContractParameters;