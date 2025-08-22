// Custom ErgoScript language definition for Prism.js syntax highlighting

export const ergoScriptLanguage = {
  'comment': [
    {
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: true,
      greedy: true
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true,
      greedy: true
    }
  ],
  'string': {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true
  },
  'keyword': /\b(?:val|def|if|else|true|false)\b/,
  'context-variable': /\b(?:SELF|INPUTS|OUTPUTS|HEIGHT|CONTEXT)\b/,
  'predefined-function': /\b(?:blake2b256|proveDlog|deserializeTo|serialize|sigmaProp|allOf|anyOf|atLeast)\b/,
  'collection-method': /\b(?:map|filter|fold|exists|forall|slice|size|getOrElse|isDefined|get)\b/,
  'type': /\b(?:Int|Long|Byte|Boolean|BigInt|GroupElement|SigmaProp|Box|Coll|Option|AvlTree)\b/,
  'register': /\.R[0-9]+(?:\[[^\]]+\])?/,
  'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?[fl]?\b/i,
  'boolean': /\b(?:true|false)\b/,
  'function': /\b\w+(?=\s*\()/,
  'operator': /[<>]=?|[!=]=?|&&|\|\||[+\-*/%^&|]=?|\?:|<<=?|>>>?=?|~/,
  'punctuation': /[{}[\];(),.:]/,
  'lambda': /{[^}]*=>/,
  'property': /\.\w+/
};

// Define the language for react-syntax-highlighter
export const registerErgoScript = () => {
  // This would be used to register the language with Prism if needed
  return ergoScriptLanguage;
};