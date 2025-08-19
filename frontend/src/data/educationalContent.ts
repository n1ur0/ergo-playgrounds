// Educational Content Data Structure for ErgoScript Smart Contracts
// Designed for "Explain Like I'm 14" level understanding

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ConceptExplanation {
  term: string;
  simpleDefinition: string;
  analogy: string;
  technicalNote?: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  visualMetaphor: string;
  codeSnippet?: string;
}

export interface ContractContent {
  id: string;
  title: string;
  difficulty: 'starter' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  simpleExplanation: string;
  realWorldAnalogy: string;
  concepts: ConceptExplanation[];
  players: string[];
  rules: string[];
  processSteps: ProcessStep[];
  commonMistakes: string[];
  quiz: QuizQuestion[];
  funFacts: string[];
  practicalUses: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  analogy: string;
  example?: string;
}

export interface EducationalContent {
  contracts: ContractContent[];
  glossary: GlossaryTerm[];
  progressionPath: string[];
}

export const educationalContent: EducationalContent = {
  contracts: [
    {
      id: 'simpleSend',
      title: 'Simple Send Contract',
      difficulty: 'starter',
      simpleExplanation: 'Think of this like passing a note in class - you write it, put it in a special box that anyone can open (because the "password" is always true), then someone else can take it out.',
      realWorldAnalogy: 'It\'s like a public mailbox where you can drop money, and the first person to check can take it. Super simple but not very secure!',
      concepts: [
        {
          term: 'UTXO',
          simpleDefinition: 'Unspent money that\'s waiting to be used',
          analogy: 'Like coins in your piggy bank - each coin is separate and you can spend them one by one'
        },
        {
          term: 'Box',
          simpleDefinition: 'A container that holds money and rules about how to spend it',
          analogy: 'Like a treasure chest with a lock - the money is inside, and the lock is the smart contract'
        },
        {
          term: 'Transaction',
          simpleDefinition: 'Moving money from one box to another box',
          analogy: 'Like taking money out of one envelope and putting it in another envelope'
        }
      ],
      players: ['Sender (person sending money)', 'Receiver (person getting money)', 'Blockchain (the system keeping track)'],
      rules: [
        'Sender must have enough money to cover the amount plus fees',
        'The contract must evaluate to "true" for money to move',
        'Once money is in the contract box, anyone can spend it (because it\'s always "true")',
        'Transaction fees must be paid to miners'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Setup Players',
          description: 'Create a sender with money and a receiver with no money',
          visualMetaphor: 'Like setting up a game with two players - one starts with coins, one starts empty'
        },
        {
          step: 2,
          title: 'Create Contract Box',
          description: 'Put money in a box with a "true" contract (anyone can spend)',
          visualMetaphor: 'Put money in an unlocked treasure chest in the middle of the room'
        },
        {
          step: 3,
          title: 'Make Deposit Transaction',
          description: 'Sender signs transaction to put money in the contract box',
          visualMetaphor: 'Sender officially moves their coins from their wallet to the treasure chest'
        },
        {
          step: 4,
          title: 'Create Withdrawal Box',
          description: 'Create a new box that only the receiver can spend from',
          visualMetaphor: 'Create a new treasure chest that only has the receiver\'s lock on it'
        },
        {
          step: 5,
          title: 'Make Withdrawal Transaction',
          description: 'Move money from contract box to receiver\'s box',
          visualMetaphor: 'Move the coins from the unlocked chest to the receiver\'s personal chest'
        }
      ],
      commonMistakes: [
        'Forgetting about transaction fees',
        'Not understanding that "true" contracts are dangerous in real life',
        'Confusing who signs which transaction'
      ],
      quiz: [
        {
          question: 'What makes the SimpleSend contract dangerous to use in real life?',
          options: [
            'It costs too much in fees',
            'Anyone can spend the money because the contract is always "true"',
            'It takes too long to process',
            'It only works with small amounts'
          ],
          correctAnswer: 1,
          explanation: 'The contract uses "true" as its condition, meaning anyone can spend the money once it\'s deposited!'
        },
        {
          question: 'In the UTXO model, what happens to boxes when they\'re spent?',
          options: [
            'They get copied',
            'They get updated',
            'They get destroyed and new ones are created',
            'They stay the same'
          ],
          correctAnswer: 2,
          explanation: 'In UTXO, boxes are destroyed when spent and new boxes are created - like breaking a piggy bank to get the coins out!'
        }
      ],
      funFacts: [
        'Ergo processes about 1,000 transactions every 2 minutes!',
        'Each box can store up to 10 different pieces of information',
        'The "true" contract is only 12 characters long but could lose all your money!'
      ],
      practicalUses: [
        'Learning how blockchain transactions work',
        'Understanding the basics before building secure contracts',
        'Testing blockchain development tools'
      ]
    },
    {
      id: 'pinLockContract',
      title: 'PIN Lock Contract',
      difficulty: 'beginner',
      simpleExplanation: 'Like a combination lock on your locker - you set a secret PIN, and only someone who knows that PIN can get your stuff out.',
      realWorldAnalogy: 'It\'s like those hotel safes where you set a 4-digit code. Your money is locked inside, and you need the right code to get it out.',
      concepts: [
        {
          term: 'Hash Function',
          simpleDefinition: 'A math function that turns any text into a scrambled code',
          analogy: 'Like a blender for text - you put in "1234" and get out "x7k9m2p8" (but you can never reverse it)',
          technicalNote: 'Uses Blake2b256 algorithm'
        },
        {
          term: 'Register',
          simpleDefinition: 'Storage spots in a box where you can keep extra information',
          analogy: 'Like pockets in a jacket - R4, R5, R6 etc. are different pockets where you store different things'
        },
        {
          term: 'Off-chain vs On-chain',
          simpleDefinition: 'Off-chain happens on your computer, on-chain happens on the blockchain',
          analogy: 'Off-chain is like writing notes at home, on-chain is like writing on a public billboard'
        }
      ],
      players: ['User (sets PIN and locks money)', 'Blockchain (stores the scrambled PIN)', 'Anyone (can try to guess but shouldn\'t know the PIN)'],
      rules: [
        'User picks a PIN and it gets scrambled before storing on blockchain',
        'To unlock money, user must provide the original PIN',
        'The contract checks if scrambling the provided PIN matches the stored scrambled version',
        'If PINs match, money is released to user'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Choose PIN',
          description: 'User picks a secret PIN number',
          visualMetaphor: 'Like choosing the combination for your bike lock'
        },
        {
          step: 2,
          title: 'Scramble PIN',
          description: 'Computer uses hash function to scramble the PIN',
          visualMetaphor: 'Put your PIN through a paper shredder that creates a unique pattern'
        },
        {
          step: 3,
          title: 'Lock Money',
          description: 'Put money in box with scrambled PIN stored in register R4',
          visualMetaphor: 'Put money in safe and tape the scrambled PIN code to the outside'
        },
        {
          step: 4,
          title: 'Unlock Attempt',
          description: 'To get money back, provide the original PIN in a new transaction',
          visualMetaphor: 'Try to unlock the safe by providing what you think is the right combination'
        },
        {
          step: 5,
          title: 'Verification',
          description: 'Contract scrambles your provided PIN and compares to stored version',
          visualMetaphor: 'The safe scrambles your guess and checks if it matches the taped pattern'
        }
      ],
      commonMistakes: [
        'Using simple PINs like "1234" that are easy to guess',
        'Not understanding that the PIN becomes visible when you withdraw',
        'Forgetting that others can see your withdrawal transaction and copy it'
      ],
      quiz: [
        {
          question: 'Why is the PIN hashed before storing on the blockchain?',
          options: [
            'To make it shorter',
            'To hide the actual PIN from people reading the blockchain',
            'To make transactions faster',
            'To save storage space'
          ],
          correctAnswer: 1,
          explanation: 'Hashing scrambles the PIN so people can\'t see your actual PIN when they look at the blockchain data!'
        },
        {
          question: 'What\'s the main security problem with this PIN contract?',
          options: [
            'The PIN is too short',
            'When you withdraw, your PIN becomes visible to everyone',
            'The hash function is too weak',
            'It costs too much in fees'
          ],
          correctAnswer: 1,
          explanation: 'When you make a withdrawal transaction, your real PIN is visible to everyone, so they could copy it and steal your money!'
        }
      ],
      funFacts: [
        'Hash functions are one-way: you can\'t "un-scramble" them!',
        'The same input always produces the same hash output',
        'Even changing one letter completely changes the hash result'
      ],
      practicalUses: [
        'Learning about password security',
        'Understanding how blockchain stores secrets',
        'Building more complex authentication systems'
      ]
    },
    {
      id: 'timedFund',
      title: 'Timed Fund Contract',
      difficulty: 'beginner',
      simpleExplanation: 'Like giving someone a gift card that expires - Bob can use the money until a certain date, then Alice gets it back if Bob hasn\'t used it.',
      realWorldAnalogy: 'It\'s like those movie tickets that are only valid for a specific showing. After the movie time passes, the ticket becomes worthless and you lose your money.',
      concepts: [
        {
          term: 'Block Height',
          simpleDefinition: 'A way to measure time on the blockchain by counting blocks',
          analogy: 'Like counting pages in a book - each new page (block) means more time has passed'
        },
        {
          term: 'Time Locks',
          simpleDefinition: 'Rules that depend on when something happens',
          analogy: 'Like a timer on your oven - it only goes off after a certain amount of time'
        },
        {
          term: 'Conditional Logic',
          simpleDefinition: 'If-then rules in smart contracts',
          analogy: 'Like game rules: "IF it\'s before 6pm, Bob can take the money. IF it\'s after 6pm, Alice can take it back"'
        }
      ],
      players: ['Alice (gives money with time limit)', 'Bob (can take money before deadline)', 'Blockchain (keeps track of time)'],
      rules: [
        'Alice locks money in contract with a deadline block height',
        'Before deadline: only Bob can spend the money',
        'After deadline: only Alice can take money back',
        'The blockchain automatically tracks time by counting blocks'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Set Deadline',
          description: 'Alice decides how long Bob has to claim the money',
          visualMetaphor: 'Set a timer on a parking meter - car can stay until time runs out'
        },
        {
          step: 2,
          title: 'Lock Funds',
          description: 'Alice puts money in contract with Bob\'s key and the deadline',
          visualMetaphor: 'Put money in a time-locked safe that opens for Bob now, but switches to Alice later'
        },
        {
          step: 3,
          title: 'Bob\'s Window',
          description: 'Bob can claim money anytime before the deadline',
          visualMetaphor: 'Bob has until the timer runs out to grab his gift'
        },
        {
          step: 4,
          title: 'Deadline Check',
          description: 'Contract checks current block height against deadline',
          visualMetaphor: 'Check the clock to see if time is up'
        },
        {
          step: 5,
          title: 'Alice Recovery',
          description: 'After deadline, only Alice can recover her money',
          visualMetaphor: 'After the timer goes off, the gift goes back to Alice'
        }
      ],
      commonMistakes: [
        'Not understanding that block height is approximate time',
        'Setting deadlines too short or too long',
        'Forgetting that Alice needs to actively claim money back after deadline'
      ],
      quiz: [
        {
          question: 'What happens if Bob tries to claim the money after the deadline?',
          options: [
            'He gets the money anyway',
            'The transaction fails because only Alice can spend it now',
            'He gets half the money',
            'The money disappears'
          ],
          correctAnswer: 1,
          explanation: 'After the deadline block height, only Alice\'s signature can unlock the money - Bob\'s transactions will be rejected!'
        },
        {
          question: 'Why does the contract use block height instead of calendar time?',
          options: [
            'It\'s more accurate',
            'It\'s cheaper',
            'The blockchain doesn\'t know calendar time, only block numbers',
            'It\'s faster'
          ],
          correctAnswer: 2,
          explanation: 'Blockchains naturally count in blocks, not calendar time. Each block represents roughly 2 minutes on Ergo!'
        }
      ],
      funFacts: [
        'Each Ergo block takes about 2 minutes to create',
        'You can\'t know the exact time a block will be created, only approximately',
        'This type of contract is used in real crowdfunding and escrow services!'
      ],
      practicalUses: [
        'Crowdfunding campaigns with deadlines',
        'Escrow services for buying/selling',
        'Time-limited offers and promotions'
      ]
    },
    {
      id: 'assetsAtomicExchange',
      title: 'Atomic Token Swap',
      difficulty: 'intermediate',
      simpleExplanation: 'Like trading Pokemon cards with a friend, but using a magical box that makes sure both people get what they want or nobody gets anything.',
      realWorldAnalogy: 'It\'s like those trading card vending machines where you put in your card, someone else puts in theirs, and the machine only completes the trade if both people put in what they promised.',
      concepts: [
        {
          term: 'Atomic Swap',
          simpleDefinition: 'A trade that either completely happens or completely fails - no in-between',
          analogy: 'Like a light switch - it\'s either ON or OFF, never halfway'
        },
        {
          term: 'Order Matching',
          simpleDefinition: 'Finding two people who want to trade with each other',
          analogy: 'Like a dating app but for trades - matching people who want what the other person has'
        },
        {
          term: 'Token',
          simpleDefinition: 'Digital assets other than the main cryptocurrency',
          analogy: 'Like different types of arcade tokens - some for the racing game, some for pinball'
        }
      ],
      players: ['Buyer (wants tokens, has ERG)', 'Seller (has tokens, wants ERG)', 'DEX (matchmaker service)'],
      rules: [
        'Buyer creates order saying "I want X tokens for Y ERG"',
        'Seller creates order saying "I have X tokens, want Y ERG"',
        'Orders must match exactly for swap to happen',
        'DEX takes a small fee for matchmaking service',
        'If orders don\'t match, everyone gets their money back'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Create Buy Order',
          description: 'Buyer puts ERG in contract saying what tokens they want',
          visualMetaphor: 'Put money in a vending machine and select what snack you want'
        },
        {
          step: 2,
          title: 'Create Sell Order',
          description: 'Seller puts tokens in contract saying how much ERG they want',
          visualMetaphor: 'Put your trading cards in the machine and set your asking price'
        },
        {
          step: 3,
          title: 'Order Matching',
          description: 'DEX finds compatible buy and sell orders',
          visualMetaphor: 'The machine checks if what you want matches what someone else is offering'
        },
        {
          step: 4,
          title: 'Atomic Execution',
          description: 'Both trades happen simultaneously or both fail',
          visualMetaphor: 'The machine either gives both people what they want, or returns everything'
        },
        {
          step: 5,
          title: 'Settlement',
          description: 'Buyer gets tokens, seller gets ERG, DEX gets fee',
          visualMetaphor: 'Everyone gets their stuff, and the machine keeps a small service fee'
        }
      ],
      commonMistakes: [
        'Not understanding that partial fills are possible',
        'Forgetting about DEX fees',
        'Setting wrong token IDs or amounts'
      ],
      quiz: [
        {
          question: 'What does "atomic" mean in atomic swap?',
          options: [
            'It involves atoms',
            'It\'s very fast',
            'Either everything happens or nothing happens',
            'It\'s very small'
          ],
          correctAnswer: 2,
          explanation: 'Atomic means indivisible - the whole trade succeeds or the whole trade fails, no partial completion!'
        },
        {
          question: 'What happens if a buyer wants 100 tokens but seller only has 50?',
          options: [
            'Trade fails completely',
            'Buyer gets 50 tokens, seller keeps the rest',
            'Both orders are cancelled',
            'Depends on the specific contract implementation'
          ],
          correctAnswer: 3,
          explanation: 'Some DEX contracts allow partial fills, others require exact matches - it depends on how the smart contract is written!'
        }
      ],
      funFacts: [
        'Atomic swaps eliminate the need to trust a middleman',
        'The first atomic swap was done between Bitcoin and Litecoin in 2017',
        'DEX fees are usually much lower than centralized exchange fees'
      ],
      practicalUses: [
        'Decentralized exchanges (DEX)',
        'Cross-chain trading',
        'Trustless peer-to-peer trading'
      ]
    },
    {
      id: 'escrowDepositContract',
      title: 'Escrow Deposit Contract',
      difficulty: 'intermediate',
      simpleExplanation: 'Think of this like buying something expensive online from a stranger. Instead of sending money directly, you give it to a trusted friend (escrow) who only releases it when both sides are happy, or if there\'s a problem, a referee decides.',
      realWorldAnalogy: 'It\'s exactly like using PayPal or buying through eBay! When you buy something, PayPal holds your money until you confirm you got what you ordered. If there\'s a problem, PayPal customer service acts as the referee.',
      concepts: [
        {
          term: 'Escrow',
          simpleDefinition: 'A safe place to hold money while two parties complete a deal',
          analogy: 'Like a mutual friend holding money during a trade - they only give it out when both sides agree the trade is done'
        },
        {
          term: 'Three-Party System',
          simpleDefinition: 'A system involving buyer, seller, and a neutral arbitrator',
          analogy: 'Like a playground trade with a teacher watching - you have the buyer, seller, and teacher who settles disputes'
        },
        {
          term: 'Multi-Signature',
          simpleDefinition: 'Requiring multiple people to sign before money can move',
          analogy: 'Like a bank vault that needs two keys - both the buyer and seller must agree to release the money'
        },
        {
          term: 'Timeout Mechanism',
          simpleDefinition: 'A built-in timer that returns money if the deal takes too long',
          analogy: 'Like a parking meter - if time runs out, your money gets returned automatically'
        },
        {
          term: 'Dispute Resolution',
          simpleDefinition: 'A way to solve problems when buyer and seller disagree',
          analogy: 'Like having a judge in court - when people can\'t agree, someone neutral makes the final decision'
        }
      ],
      players: [
        'Buyer (person purchasing something)',
        'Seller (person selling something)', 
        'Arbiter (neutral referee who resolves disputes)',
        'Smart Contract (holds the money and enforces rules)'
      ],
      rules: [
        'Buyer deposits money into the escrow contract',
        'Money can only be released in three ways:',
        '  • Both buyer AND seller agree (normal completion)',
        '  • The arbiter makes a decision (dispute resolution)',
        '  • Timeout occurs and buyer gets automatic refund',
        'Seller must deliver goods/services before getting paid',
        'If there\'s a dispute, only the arbiter can decide',
        'After timeout period, buyer can claim their money back'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Setup the Deal',
          description: 'Buyer, seller, and arbiter agree on the terms and create the escrow contract',
          visualMetaphor: 'Like writing up the rules for a trade and appointing a referee before the game starts',
          codeSnippet: 'val escrowContract = ErgoScriptCompiler.compile(Map(), escrowScript)'
        },
        {
          step: 2,
          title: 'Buyer Deposits Money',
          description: 'Buyer puts their money into the escrow contract, where it gets locked up',
          visualMetaphor: 'Like putting your allowance money in a locked box that your parents control',
          codeSnippet: 'buyerParty.wallet.sign(depositTransaction)'
        },
        {
          step: 3,
          title: 'Seller Delivers',
          description: 'Seller provides the goods or services they promised',
          visualMetaphor: 'Like delivering the pizza you ordered - now it\'s time to get paid!'
        },
        {
          step: 4,
          title: 'Release or Dispute',
          description: 'Either both parties agree to release funds, or there\'s a dispute that needs the arbiter',
          visualMetaphor: 'Like either both kids agreeing the trade was fair, or calling in mom to decide'
        },
        {
          step: 5,
          title: 'Money Moves',
          description: 'Money goes to seller (if successful) or back to buyer (if refund/dispute)',
          visualMetaphor: 'Like the locked box finally opening and the money going to whoever won the decision'
        }
      ],
      commonMistakes: [
        'Forgetting that BOTH buyer and seller must sign for normal completion',
        'Not setting a reasonable timeout period',
        'Choosing an arbiter who isn\'t truly neutral',
        'Not clearly defining what "delivery" means',
        'Assuming the arbiter will always be available',
        'Not accounting for transaction fees in the escrow amount'
      ],
      quiz: [
        {
          question: 'In an escrow contract, who holds the money while the deal is happening?',
          options: [
            'The buyer keeps it',
            'The seller gets it immediately', 
            'The smart contract holds it',
            'The arbiter keeps it in their wallet'
          ],
          correctAnswer: 2,
          explanation: 'The smart contract acts like a robot bank vault - it holds the money safely and only releases it when the programmed conditions are met. No human actually holds the money!'
        },
        {
          question: 'How many ways can money be released from this escrow contract?',
          options: [
            'Only one way - buyer and seller both agree',
            'Two ways - agreement or arbiter decision',
            'Three ways - agreement, arbiter decision, or timeout',
            'Four ways - there\'s also a secret emergency exit'
          ],
          correctAnswer: 2,
          explanation: 'There are exactly three ways: 1) Both buyer and seller sign (normal completion), 2) The arbiter makes a decision (dispute), or 3) Time runs out and buyer gets automatic refund (timeout protection).'
        },
        {
          question: 'What happens if the buyer and seller disagree about whether the deal was completed?',
          options: [
            'The money gets stuck forever',
            'The arbiter steps in to make the decision',
            'The money automatically goes to the seller',
            'They have to start the deal over'
          ],
          correctAnswer: 1,
          explanation: 'This is exactly why we have an arbiter! They act like a judge who can look at the evidence and decide who should get the money. It\'s like having a teacher settle a playground dispute.'
        },
        {
          question: 'Why does the escrow contract have a timeout feature?',
          options: [
            'To make the contract more complicated',
            'To give the arbiter more power',
            'To protect buyers from deals that never complete',
            'To make sellers work faster'
          ],
          correctAnswer: 2,
          explanation: 'The timeout is like a safety net for buyers! If a seller takes your money and disappears, or if the arbiter is unavailable, the timeout ensures you\'ll eventually get your money back. It prevents funds from being locked up forever!'
        }
      ],
      funFacts: [
        'Real-world escrow services handle billions of dollars in transactions every year!',
        'The concept of escrow is over 1,000 years old - medieval merchants used trusted third parties for trade',
        'Modern online marketplaces like eBay and Amazon essentially act as escrow services',
        'In traditional escrow, human agents charge 1-3% fees, but smart contracts can do it for just transaction costs!',
        'The timeout mechanism prevents the "dead man\'s switch" problem where funds get locked forever'
      ],
      practicalUses: [
        'Online marketplace transactions (like eBay with buyer protection)',
        'Freelance work payments (like Upwork holding funds until work is done)',
        'Real estate transactions (traditional escrow for house purchases)',
        'International trade between companies who don\'t trust each other',
        'Crowdfunding projects (funds held until project milestones are met)',
        'Digital asset sales (NFTs, domain names, etc.)'
      ]
    },
    {
      id: 'tokenSalesService',
      title: 'Token Sales Service Contract',
      difficulty: 'advanced',
      simpleExplanation: 'Think of this like a smart vending machine that sells special coins. The more coins people buy, the more expensive they become - like concert tickets that get pricier as they sell out.',
      realWorldAnalogy: 'It\'s like a limited edition trading card shop where each card gets more expensive as fewer remain in stock. The shop automatically adjusts prices based on how many cards have been sold.',
      concepts: [
        {
          term: 'Dynamic Pricing',
          simpleDefinition: 'Prices that change automatically based on supply and demand',
          analogy: 'Like surge pricing for Uber - when lots of people want rides, prices go up automatically'
        },
        {
          term: 'Token Supply Management',
          simpleDefinition: 'Keeping track of how many tokens are available for sale',
          analogy: 'Like a ticket counter that knows how many seats are left at a concert'
        },
        {
          term: 'State Variables',
          simpleDefinition: 'Information stored in the contract that changes over time',
          analogy: 'Like a scoreboard that keeps track of the current game stats'
        },
        {
          term: 'Purchase Validation',
          simpleDefinition: 'Checking that someone paid enough and isn\'t buying too many tokens',
          analogy: 'Like a bouncer checking ID and making sure you have enough money for the cover charge'
        }
      ],
      players: [
        'Token Creator (sets up the sale and owns remaining tokens)',
        'Buyers (purchase tokens at current market price)',
        'Smart Contract (automatically manages pricing and inventory)'
      ],
      rules: [
        'Tokens start at a base price and get more expensive as more are sold',
        'Each purchase must include enough ERG to cover the current token price',
        'Buyers can\'t purchase more than the maximum allowed per transaction',
        'The contract automatically updates the "tokens sold" counter after each purchase',
        'Owner can withdraw accumulated ERG proceeds or update contract parameters'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Deploy Sales Contract',
          description: 'Token creator sets up the contract with initial token supply and pricing parameters',
          visualMetaphor: 'Like setting up a vending machine with products and initial prices',
          codeSnippet: `// Create initial token sales box
val salesBox = Box(
  value = 10000000L, // Contract maintenance fee
  script = tokenSalesContract,
  tokens = List((tokenId -> initialTokenSupply)),
  registers = Map(R4 -> 0L) // Tokens sold counter
)`
        },
        {
          step: 2,
          title: 'Calculate Current Price',
          description: 'When someone wants to buy, the contract calculates the current price based on how many tokens have been sold',
          visualMetaphor: 'Like checking the current stock price before placing a buy order',
          codeSnippet: `val tokensSold = SELF.R4[Long].get
val currentPrice = initialPrice + (tokensSold / 1000L) * priceIncrement
val requiredPayment = tokensRequested * currentPrice`
        },
        {
          step: 3,
          title: 'Validate Purchase Request',
          description: 'Contract checks that buyer sent enough ERG and isn\'t exceeding purchase limits',
          visualMetaphor: 'Like a cashier checking you have enough money and aren\'t buying more than the limit',
          codeSnippet: `val validAmount = tokensRequested > 0L && tokensRequested <= maxTokensPerPurchase
val validPayment = INPUTS(0).value >= requiredPayment
val correctTokenOutput = OUTPUTS(0).tokens(0)._1 == tokenId`
        },
        {
          step: 4,
          title: 'Execute Token Transfer',
          description: 'If validation passes, buyer receives tokens and contract gets ERG payment',
          visualMetaphor: 'Like a vending machine dispensing your snack after you pay the right amount',
          codeSnippet: `val buyerTokenBox = Box(
  value = MinBoxValue,
  script = contract(buyerParty.wallet.getAddress.pubKey),
  tokens = List((tokenId -> tokensToBuy))
)`
        },
        {
          step: 5,
          title: 'Update Contract State',
          description: 'Contract updates its internal counter of tokens sold for future price calculations',
          visualMetaphor: 'Like updating the inventory count in a store\'s computer system',
          codeSnippet: `val updatedSalesBox = Box(
  value = 10000000L + paymentAmount - MinTxFee,
  script = tokenSalesContract,
  tokens = List((tokenId -> (initialTokenSupply - tokensToBuy))),
  registers = Map(R4 -> (tokensSold + tokensToBuy)) // Updated counter
)`
        }
      ],
      commonMistakes: [
        'Not accounting for price increases when calculating required payment',
        'Setting price increment too high or too low for market conditions',
        'Forgetting to validate maximum purchase limits',
        'Not properly updating the tokens sold counter',
        'Not reserving enough ERG for contract maintenance fees'
      ],
      quiz: [
        {
          question: 'What happens to token prices as more tokens are sold?',
          options: [
            'Prices stay the same',
            'Prices decrease to encourage more sales',
            'Prices increase based on the price increment formula',
            'Prices are set randomly'
          ],
          correctAnswer: 2,
          explanation: 'The contract uses dynamic pricing - as more tokens are sold (tracked in R4), the price automatically increases by the price increment amount!'
        },
        {
          question: 'What information does the contract store in register R4?',
          options: [
            'The current token price',
            'The number of tokens sold so far',
            'The buyer\'s public key',
            'The maximum purchase limit'
          ],
          correctAnswer: 1,
          explanation: 'Register R4 stores the running count of how many tokens have been sold, which is used to calculate the current price for new purchases.'
        },
        {
          question: 'Why does the contract have a maximum tokens per purchase limit?',
          options: [
            'To save on transaction fees',
            'To prevent any single buyer from monopolizing the token sale',
            'To make the contract code simpler',
            'To reduce the contract\'s storage requirements'
          ],
          correctAnswer: 1,
          explanation: 'The maximum purchase limit ensures fair distribution and prevents whale buyers from buying up all available tokens in one transaction!'
        },
        {
          question: 'What happens if someone tries to buy tokens but doesn\'t send enough ERG?',
          options: [
            'They get partial tokens for the amount they paid',
            'The transaction fails and is rejected',
            'They get the tokens but owe money later',
            'The contract reduces the token price for them'
          ],
          correctAnswer: 1,
          explanation: 'The contract validates that the payment amount is sufficient - if not, the entire transaction is rejected and the buyer keeps their ERG!'
        }
      ],
      funFacts: [
        'Dynamic pricing algorithms like this are used by airlines, hotels, and ride-sharing apps!',
        'Token sales contracts can implement Dutch auctions where prices start high and decrease over time',
        'Some token sales include whitelist mechanisms to control who can participate',
        'The Ethereum network hosts thousands of token sale contracts worth billions of dollars'
      ],
      practicalUses: [
        'Initial Coin Offerings (ICO) and token launches',
        'NFT sales with rarity-based pricing',
        'Gaming tokens for in-game purchases',
        'Loyalty reward tokens for businesses',
        'Governance tokens for DAOs and voting systems',
        'Utility tokens for accessing specific services'
      ]
    },
    {
      id: 'headsOrTails',
      title: 'Heads or Tails Gaming Contract',
      difficulty: 'intermediate',
      simpleExplanation: 'Like flipping a coin with a friend online, but using a special trick to make sure nobody can cheat. Both players secretly pick heads or tails, then reveal their choices at the same time.',
      realWorldAnalogy: 'It\'s like those sealed envelope games where you and your friend each write down your guess, seal it in an envelope, then open both envelopes at the same time to see who won.',
      concepts: [
        {
          term: 'Commitment-Reveal Scheme',
          simpleDefinition: 'A two-phase system where players first commit to a choice in secret, then reveal it later',
          analogy: 'Like writing your answer on paper, putting it in a sealed envelope, then opening all envelopes together'
        },
        {
          term: 'Cryptographic Hash',
          simpleDefinition: 'A way to scramble your choice so others can\'t see it until you reveal the original',
          analogy: 'Like putting your choice through a paper shredder - you can prove it was your choice later, but nobody can read the shredded version'
        },
        {
          term: 'Nonce',
          simpleDefinition: 'A random number added to your choice to make it unpredictable',
          analogy: 'Like adding random letters to your secret word so even identical choices look different when scrambled'
        },
        {
          term: 'Game State Management',
          simpleDefinition: 'Keeping track of what phase the game is in',
          analogy: 'Like a board game that has different rules for setup, playing, and scoring phases'
        }
      ],
      players: [
        'Player 1 (makes a choice and commits to it)',
        'Player 2 (makes a choice and commits to it)',
        'Smart Contract (manages game phases and determines winner)'
      ],
      rules: [
        'Both players must commit their choices (heads=0, tails=1) plus a random nonce within the deadline',
        'Commitments are hashed so choices remain secret during the commit phase',
        'After commitment deadline, players must reveal their actual choices and nonces',
        'Contract verifies that revealed choices match the original commitments',
        'Winner is determined: if choices are the same, Player 1 wins; if different, Player 2 wins',
        'Winner takes the entire pot minus transaction fees'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Game Setup and Funding',
          description: 'Both players deposit their bet amounts into the game contract',
          visualMetaphor: 'Like putting your money into a jar in the middle of the table before the game starts',
          codeSnippet: `val gameBox = Box(
  value = betAmount * 2, // Both players' bets
  script = gameContract,
  registers = Map(
    R4 -> 0 // Game state: setup phase
  )
)`
        },
        {
          step: 2,
          title: 'Commit Phase',
          description: 'Each player secretly commits their choice by submitting a hash of their choice plus a random nonce',
          visualMetaphor: 'Like both players writing their guess on paper, putting it in an envelope, and sealing it',
          codeSnippet: `val player1Choice = 0 // heads
val player1Nonce = "random_nonce_1".getBytes()
val player1Commitment = Blake2b256(player1Choice.toByteArray ++ player1Nonce)
// Store commitments in contract registers`
        },
        {
          step: 3,
          title: 'Reveal Phase',
          description: 'Players reveal their original choices and nonces, contract verifies they match the commitments',
          visualMetaphor: 'Like opening both sealed envelopes and checking that the papers inside match what was claimed',
          codeSnippet: `val validCommitment1 = blake2b256(player1Choice.toByteArray ++ player1Nonce) == player1Commitment
val validCommitment2 = blake2b256(player2Choice.toByteArray ++ player2Nonce) == player2Commitment`
        },
        {
          step: 4,
          title: 'Determine Winner',
          description: 'Contract compares the revealed choices and determines who wins based on the game rules',
          visualMetaphor: 'Like a referee checking both players\' answers and declaring the winner',
          codeSnippet: `// XOR logic: same choices = player1 wins, different = player2 wins
val player1Wins = player1Choice == player2Choice
val winner = if (player1Wins) player1PubKey else player2PubKey`
        },
        {
          step: 5,
          title: 'Prize Distribution',
          description: 'Winner receives the entire pot, game ends',
          visualMetaphor: 'Like handing the jar of money to the winner',
          codeSnippet: `val winnerBox = Box(
  value = betAmount * 2 - MinTxFee,
  script = contract(winner)
) // All funds go to winner`
        }
      ],
      commonMistakes: [
        'Using predictable nonces that could allow choice prediction',
        'Not properly validating commitment hashes during reveal',
        'Setting commitment or reveal deadlines too short',
        'Forgetting to handle timeout scenarios for stuck games',
        'Not understanding that the XOR game logic determines the winner'
      ],
      quiz: [
        {
          question: 'Why do players need to use a nonce with their choice?',
          options: [
            'To make the transaction faster',
            'To reduce gas costs',
            'To prevent others from guessing their choice by trying all hash possibilities',
            'To make the code more complex'
          ],
          correctAnswer: 2,
          explanation: 'Without a nonce, someone could just hash "0" and "1" to figure out your choice! The random nonce makes it impossible to guess.'
        },
        {
          question: 'In this game, when does Player 1 win?',
          options: [
            'When they choose heads',
            'When they choose tails',
            'When both players choose the same thing (both heads or both tails)',
            'When they reveal their choice first'
          ],
          correctAnswer: 2,
          explanation: 'The game uses XOR logic - Player 1 wins when choices match (both heads or both tails), Player 2 wins when choices differ!'
        },
        {
          question: 'What happens during the commit phase?',
          options: [
            'Players reveal their choices to everyone',
            'Players send hashed versions of their choices to the contract',
            'The winner is determined',
            'Players get their money back'
          ],
          correctAnswer: 1,
          explanation: 'During commit phase, players submit scrambled (hashed) versions of their choices - the actual choices stay secret until reveal phase!'
        },
        {
          question: 'What happens if a player doesn\'t reveal their choice before the deadline?',
          options: [
            'They automatically win',
            'They automatically lose',
            'The game has a timeout refund mechanism',
            'The other player can steal their commitment'
          ],
          correctAnswer: 2,
          explanation: 'The contract includes timeout protection - if reveals don\'t happen by the deadline, players can get their bets refunded to prevent stuck games!'
        }
      ],
      funFacts: [
        'Commitment-reveal schemes are used in many blockchain applications beyond gaming!',
        'The first commit-reveal protocol was described in 1991 for mental poker',
        'This technique prevents "front-running" attacks where someone sees your move and changes theirs',
        'Real blockchain games often use verifiable random functions (VRFs) for even better fairness'
      ],
      practicalUses: [
        'Fair online gaming and gambling applications',
        'Blockchain-based auctions (sealed bid auctions)',
        'Voting systems where vote privacy is important',
        'Rock-paper-scissors and other simultaneous choice games',
        'Random number generation for decentralized applications',
        'Preventing front-running in DeFi trading'
      ]
    },
    {
      id: 'singleChainSwap',
      title: 'Single Chain Atomic Swap',
      difficulty: 'advanced',
      simpleExplanation: 'Like a magical trading box where you and a friend can swap different things safely. You both put your items in locked boxes, and they only open when someone provides a secret password - but once one box opens, the password is revealed so both boxes can be opened.',
      realWorldAnalogy: 'It\'s like those spy movies where two briefcases are chained together with the same key. Once someone unlocks one briefcase to get their item, the key becomes available to unlock the other briefcase too.',
      concepts: [
        {
          term: 'Hash Time Lock Contract (HTLC)',
          simpleDefinition: 'A smart contract that locks assets with both a secret password and a time limit',
          analogy: 'Like a timed safe that opens either with the right combination or automatically after the timer expires'
        },
        {
          term: 'Atomic Swap',
          simpleDefinition: 'A trade that either completely succeeds or completely fails - no partial trades',
          analogy: 'Like a light switch - it\'s either completely ON or completely OFF, never stuck halfway'
        },
        {
          term: 'Hash Lock',
          simpleDefinition: 'Locking something with a secret that\'s been scrambled - you need the original secret to unlock it',
          analogy: 'Like a riddle where you need to know the original word to answer, but only a scrambled version is public'
        },
        {
          term: 'Preimage',
          simpleDefinition: 'The original secret that produces a specific hash when scrambled',
          analogy: 'Like the original password that creates a specific fingerprint when put through a scrambler'
        }
      ],
      players: [
        'Party A (wants tokens, has ERG to trade)',
        'Party B (has tokens, wants ERG)',
        'Smart Contract (manages the locked assets and swap logic)'
      ],
      rules: [
        'Party A locks their ERG with a secret hash and timeout',
        'Party B sees the hash and locks their tokens with the same hash and timeout',
        'Either party can claim the other\'s assets by revealing the secret',
        'Once the secret is revealed in one transaction, it\'s public and can be used for both claims',
        'If neither party reveals the secret before timeout, both can reclaim their original assets',
        'The swap is atomic - either both parties get what they want or both get refunded'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Party A Locks ERG',
          description: 'Party A creates a secret, hashes it, and locks their ERG in a contract with that hash',
          visualMetaphor: 'Like putting your money in a lock box and posting a riddle about the combination',
          codeSnippet: `val secretHash = Blake2b256("secret_phrase_here".getBytes())
val ergLockBox = Box(
  value = swapAmount,
  script = swapContract // Can be unlocked with secret or timeout
)`
        },
        {
          step: 2,
          title: 'Party B Locks Tokens',
          description: 'Party B sees the hash and locks their tokens using the same hash and a similar contract',
          visualMetaphor: 'Like seeing your riddle and putting their tokens in another box with the same riddle',
          codeSnippet: `val tokenLockBox = Box(
  value = MinBoxValue,
  script = swapContract, // Same hash requirement
  tokens = List((tokenId -> tokenAmount))
)`
        },
        {
          step: 3,
          title: 'Party B Claims ERG',
          description: 'Party B reveals the secret to claim Party A\'s ERG, making the secret public',
          visualMetaphor: 'Like solving the riddle publicly to get the money - now everyone can see the solution',
          codeSnippet: `val ergClaimTransaction = Transaction(
  inputs = List(ergLockBox),
  outputs = List(ergClaimBox),
  // Include secret in transaction context
  extension = Map(R4 -> "secret_phrase_here".getBytes())
)`
        },
        {
          step: 4,
          title: 'Party A Claims Tokens',
          description: 'Party A uses the now-public secret to claim Party B\'s tokens, completing the swap',
          visualMetaphor: 'Like using the solution that\'s now public to open the second box and get the tokens',
          codeSnippet: `val tokenClaimTransaction = Transaction(
  inputs = List(tokenLockBox),
  outputs = List(tokenClaimBox),
  // Use the same revealed secret
  extension = Map(R4 -> "secret_phrase_here".getBytes())
)`
        },
        {
          step: 5,
          title: 'Swap Completed',
          description: 'Both parties now have what they wanted - Party A has tokens, Party B has ERG',
          visualMetaphor: 'Like both people walking away happy with their new items from the trade',
          codeSnippet: `// Final state:
// Party A: has tokenAmount tokens
// Party B: has swapAmount ERG
// Both boxes: empty (assets claimed)`
        }
      ],
      commonMistakes: [
        'Setting timeout periods too short, not allowing enough time for both claim transactions',
        'Using weak or predictable secrets that others could guess',
        'Not properly validating the hash in the smart contract',
        'Forgetting that once the secret is revealed, it\'s public forever',
        'Not accounting for transaction fees in the locked amounts'
      ],
      quiz: [
        {
          question: 'What makes this swap "atomic"?',
          options: [
            'It happens very quickly',
            'It involves atomic particles',
            'Either both parties get what they want or both get refunded - no partial trades',
            'It only works with small amounts'
          ],
          correctAnswer: 2,
          explanation: 'Atomic means indivisible - the swap either completely succeeds (both parties get what they want) or completely fails (both get their original assets back)!'
        },
        {
          question: 'Why does Party A create the secret instead of the smart contract?',
          options: [
            'Smart contracts can\'t generate random numbers securely',
            'It\'s cheaper for Party A to do it',
            'Party A needs to control when the swap executes',
            'The contract would be too complex otherwise'
          ],
          correctAnswer: 0,
          explanation: 'Smart contracts can\'t generate truly random secrets because everything on the blockchain is deterministic and public. Party A creates the secret off-chain for security!'
        },
        {
          question: 'What happens if neither party reveals the secret before the timeout?',
          options: [
            'The assets are lost forever',
            'The contract creator gets all assets',
            'Both parties can reclaim their original assets',
            'The assets go to a random address'
          ],
          correctAnswer: 2,
          explanation: 'The timeout mechanism protects both parties - if the swap doesn\'t complete, each party can reclaim their original assets after the timeout period!'
        },
        {
          question: 'Once Party B reveals the secret to claim ERG, what happens?',
          options: [
            'The secret becomes public and Party A can use it to claim tokens',
            'Only Party B knows the secret',
            'The secret gets encrypted again',
            'Party A needs to guess a new secret'
          ],
          correctAnswer: 0,
          explanation: 'Once the secret is revealed in a blockchain transaction, it becomes public knowledge! Party A can immediately use it to claim the tokens, completing the swap.'
        }
      ],
      funFacts: [
        'Atomic swaps were first proposed in 2013 and first implemented between Bitcoin and Litecoin in 2017!',
        'The same HTLC technology is used in Bitcoin\'s Lightning Network for instant payments',
        'Hash locks can use different hash functions like SHA-256, Blake2b, or Keccak',
        'Some advanced atomic swaps use adaptor signatures instead of hash locks for better privacy'
      ],
      practicalUses: [
        'Decentralized exchanges (DEX) for trustless token trading',
        'Cross-chain bridges (though this example is single-chain)',
        'Peer-to-peer trading without intermediaries',
        'Payment channels and Layer 2 scaling solutions',
        'Submarine swaps in Lightning Network',
        'Privacy-focused token exchanges'
      ]
    },
    {
      id: 'doubleChainSwap',
      title: 'Cross-Chain Atomic Swap',
      difficulty: 'expert',
      simpleExplanation: 'Like trading baseball cards with someone in another country using two separate mailboxes. You each put your card in a locked mailbox in your own country, but both boxes use the same key. When one person unlocks their mailbox to get a card, the key becomes available for the other person to unlock theirs too.',
      realWorldAnalogy: 'It\'s like those international pen pal exchanges where you and someone in another country each put a gift in your local post office\'s secure box. Both boxes have the same combination lock, so when one person opens their box anywhere in the world, the combination becomes known and the other person can open theirs too.',
      concepts: [
        {
          term: 'Cross-Chain Communication',
          simpleDefinition: 'Making two separate blockchains work together even though they can\'t directly talk to each other',
          analogy: 'Like coordinating a dance between people in different rooms who can\'t hear each other but follow the same music'
        },
        {
          term: 'Chain A and Chain B',
          simpleDefinition: 'Two different blockchain networks involved in the swap',
          analogy: 'Like two different countries with their own postal systems and currencies'
        },
        {
          term: 'Initiator and Responder',
          simpleDefinition: 'The person who starts the swap and the person who responds to it',
          analogy: 'Like the person who makes the first move in chess and the person who responds to it'
        },
        {
          term: 'Timeout Ordering',
          simpleDefinition: 'Setting different deadlines for each chain so the responder is protected',
          analogy: 'Like giving the second person less time to act so they can\'t wait until the last second to cheat'
        }
      ],
      players: [
        'Chain A Party (initiator, has ERG on Chain A)',
        'Chain B Party (responder, has tokens on Chain B)',
        'Chain A Smart Contract (manages ERG locking and claims)',
        'Chain B Smart Contract (manages token locking and claims)'
      ],
      rules: [
        'Chain A Party creates a secret and locks ERG on Chain A with longer timeout (200 blocks)',
        'Chain B Party sees this and locks tokens on Chain B with shorter timeout (100 blocks)',
        'Chain A Party must claim tokens on Chain B first, revealing the secret',
        'Chain B Party uses the revealed secret to claim ERG on Chain A',
        'Different timeout periods protect Chain B Party from timing attacks',
        'If swaps don\'t complete, each party can reclaim their assets after timeout'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Chain A Initiates Swap',
          description: 'Chain A Party locks ERG with a secret hash and longer timeout period',
          visualMetaphor: 'Like putting money in a timed safe in your country with a 4-hour timer',
          codeSnippet: `// Chain A contract (longer timeout)
val chainATimeout = 200L // blocks
val chainALockBox = Box(
  value = swapAmount,
  script = chainAContract // Requires secret or timeout
)`
        },
        {
          step: 2,
          title: 'Chain B Responds',
          description: 'Chain B Party sees the commitment and locks tokens with same hash but shorter timeout',
          visualMetaphor: 'Like seeing the safe in your country and putting tokens in your own safe with a 2-hour timer',
          codeSnippet: `// Chain B contract (shorter timeout for security)
val chainBTimeout = 100L // blocks  
val chainBLockBox = Box(
  value = MinBoxValue,
  script = chainBContract, // Same hash requirement
  tokens = List((chainBTokenId -> chainBTokenAmount))
)`
        },
        {
          step: 3,
          title: 'Chain A Claims on Chain B',
          description: 'Chain A Party must move first, claiming tokens on Chain B and revealing the secret',
          visualMetaphor: 'Like the first person opening their foreign safe, which makes the combination public',
          codeSnippet: `val chainBClaimTransaction = Transaction(
  inputs = List(chainBLockBox),
  outputs = List(chainBClaimBox),
  // Reveals the secret on Chain B
  extension = Map(R4 -> "cross_chain_secret_here".getBytes())
)`
        },
        {
          step: 4,
          title: 'Chain B Claims on Chain A',
          description: 'Chain B Party uses the now-revealed secret to claim ERG on Chain A',
          visualMetaphor: 'Like using the public combination to open the safe in the other country and get the money',
          codeSnippet: `val chainAClaimTransaction = Transaction(
  inputs = List(chainALockBox),
  outputs = List(chainAClaimBox),
  // Uses the revealed secret from Chain B
  extension = Map(R4 -> "cross_chain_secret_here".getBytes())
)`
        },
        {
          step: 5,
          title: 'Cross-Chain Swap Complete',
          description: 'Both parties now have their desired assets on their respective chains',
          visualMetaphor: 'Like both people successfully getting their traded items delivered to their home countries',
          codeSnippet: `// Final state:
// Chain A Party: has tokens on Chain B
// Chain B Party: has ERG on Chain A
// Cross-chain value transfer completed atomically`
        }
      ],
      commonMistakes: [
        'Setting the same timeout for both chains (creates timing attack vulnerability)',
        'Chain A Party waiting too long to claim on Chain B (timeout risk)',
        'Not properly monitoring both blockchains for transaction confirmations',
        'Using different hash functions on different chains',
        'Not accounting for different block times between chains',
        'Forgetting that Chain A Party must move first to protect Chain B Party'
      ],
      quiz: [
        {
          question: 'Why does Chain A have a longer timeout than Chain B?',
          options: [
            'Chain A is slower',
            'To protect Chain B Party from timing attacks',
            'Chain A is more secure',
            'It\'s just random'
          ],
          correctAnswer: 1,
          explanation: 'Chain B has a shorter timeout so Chain B Party can\'t wait until the last second to claim on Chain A, leaving Chain A Party unable to claim on Chain B!'
        },
        {
          question: 'Who must reveal the secret first in a cross-chain swap?',
          options: [
            'Chain B Party (the responder)',
            'Chain A Party (the initiator)',
            'Either party can go first',
            'The smart contracts reveal it automatically'
          ],
          correctAnswer: 1,
          explanation: 'Chain A Party (initiator) must claim first on Chain B, revealing the secret. This protects Chain B Party from being left hanging!'
        },
        {
          question: 'What\'s the biggest challenge in cross-chain swaps compared to single-chain swaps?',
          options: [
            'Higher transaction fees',
            'More complex smart contracts',
            'The chains can\'t communicate directly with each other',
            'They take longer to complete'
          ],
          correctAnswer: 2,
          explanation: 'The chains are completely separate networks that can\'t talk to each other. Participants must monitor both chains and coordinate manually!'
        },
        {
          question: 'If Chain A Party never claims tokens on Chain B, what happens?',
          options: [
            'Chain B Party gets both the tokens and the ERG',
            'Both parties can eventually reclaim their original assets via timeout',
            'The assets are lost forever',
            'Chain B Party automatically gets the ERG'
          ],
          correctAnswer: 1,
          explanation: 'If no one reveals the secret before the timeouts, both parties can reclaim their original assets. The timeout mechanism protects everyone from incomplete swaps!'
        }
      ],
      funFacts: [
        'The first cross-chain atomic swap was between Bitcoin and Litecoin in September 2017!',
        'Modern cross-chain bridges handle billions of dollars but many use trusted validators instead of pure atomic swaps',
        'Some protocols like Thorchain and AtomicDEX specialize in cross-chain atomic swaps',
        'Cross-chain swaps can take hours to complete due to different block confirmation times',
        'Advanced versions use submarine swaps and payment channels to reduce waiting times'
      ],
      practicalUses: [
        'Trading Bitcoin for Ethereum tokens without centralized exchanges',
        'Cross-chain arbitrage opportunities for traders',
        'Building decentralized cross-chain bridges',
        'Enabling multi-chain DeFi applications',
        'Privacy-focused cross-chain transactions',
        'Interoperability between different blockchain ecosystems'
      ]
    },
    {
      id: 'stealthAddress',
      title: 'Stealth Address Contract',
      difficulty: 'expert',
      simpleExplanation: 'Like sending mail to someone using a secret forwarding address that only they can figure out. Every time you send them something, you create a brand new address that looks random to everyone else, but they can use their special decoder to find and claim it.',
      realWorldAnalogy: 'It\'s like those spy movies where agents leave messages at random park benches. To outsiders, it looks like just random people dropping trash, but the intended recipient knows exactly which bench to check and has the special key to decode the message.',
      concepts: [
        {
          term: 'Stealth Address',
          simpleDefinition: 'A one-time address generated for each transaction to hide who is receiving money',
          analogy: 'Like creating a new, temporary P.O. Box for every package delivery so your real address stays private'
        },
        {
          term: 'Elliptic Curve Diffie-Hellman (ECDH)',
          simpleDefinition: 'A mathematical way for two people to create a shared secret without directly communicating it',
          analogy: 'Like two people independently mixing paint colors and ending up with the same final color without sharing their recipes'
        },
        {
          term: 'View Key and Spend Key',
          simpleDefinition: 'Two different keys - one for detecting payments and one for spending them',
          analogy: 'Like having a mail scanner that can see packages addressed to you and a separate key to actually open them'
        },
        {
          term: 'Ephemeral Key',
          simpleDefinition: 'A temporary key created by the sender for this specific transaction only',
          analogy: 'Like a temporary phone number you use for one conversation and then throw away'
        }
      ],
      players: [
        'Sender (creates stealth payment to recipient)',
        'Recipient (scans blockchain and claims stealth payments)',
        'Blockchain Observers (can see transactions but not link sender to recipient)',
        'Smart Contract (manages stealth address validation and spending)'
      ],
      rules: [
        'Sender generates an ephemeral key pair for each payment',
        'Sender uses recipient\'s public view key to compute a shared secret',
        'Sender creates a one-time address using the shared secret and recipient\'s spend key',
        'Payment is sent to this one-time address that looks random to observers',
        'Recipient must scan all stealth transactions to find payments meant for them',
        'Only the recipient can compute the private key needed to spend from the stealth address'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Generate Ephemeral Keys',
          description: 'Sender creates a temporary key pair just for this transaction',
          visualMetaphor: 'Like getting a burner phone number that you\'ll use once and throw away',
          codeSnippet: `// Step 1: Generate ephemeral key pair (sender)
val ephemeralPrivKey = "random_ephemeral_private_key"
val ephemeralPubKey = "derived_ephemeral_public_key" // Derive from private key`
        },
        {
          step: 2,
          title: 'Compute Shared Secret',
          description: 'Sender uses ECDH with their ephemeral key and recipient\'s view key to create a shared secret',
          visualMetaphor: 'Like mixing your temporary paint color with the recipient\'s signature color to get a unique blend',
          codeSnippet: `// Step 2: Compute shared secret using ECDH
// sharedSecret = ECDH(ephemeralPrivKey, recipientViewKey)
val computedSharedSecret = Blake2b256(
  (ephemeralPrivKey + recipientViewKey).getBytes()
) // Simplified ECDH`
        },
        {
          step: 3,
          title: 'Generate One-Time Address',
          description: 'Sender combines the shared secret with recipient\'s spend key to create the stealth address',
          visualMetaphor: 'Like creating a custom lock that only the recipient can open with their special key',
          codeSnippet: `// Step 3: Compute one-time private key
// oneTimePrivKey = Hash(sharedSecret || recipientSpendKey)
val oneTimePrivKey = Blake2b256(
  computedSharedSecret ++ recipientSpendKey.getBytes()
)`
        },
        {
          step: 4,
          title: 'Create Stealth Payment',
          description: 'Sender sends payment to the stealth address with the ephemeral public key attached for recipient discovery',
          visualMetaphor: 'Like dropping a package at the secret location with a note that helps the recipient find it',
          codeSnippet: `// Step 4: Create stealth payment
val stealthBox = Box(
  value = stealthAmount,
  script = stealthContract,
  registers = Map(
    R4 -> ephemeralPubKey.getBytes(), // For recipient scanning
    R5 -> computedSharedSecret // Shared secret (simplified)
  )
)`
        },
        {
          step: 5,
          title: 'Recipient Scans and Claims',
          description: 'Recipient scans blockchain, detects the payment using their view key, and claims it with their computed spend key',
          visualMetaphor: 'Like using your special detector to find packages meant for you, then using your decoder key to open them',
          codeSnippet: `// Step 5: Recipient computes same shared secret and claims
val recipientComputedSecret = Blake2b256(
  (recipientViewKey + ephemeralPubKey).getBytes()
) // Same ECDH result
// Use this to prove ownership and spend the stealth UTXO`
        }
      ],
      commonMistakes: [
        'Reusing ephemeral keys across multiple transactions (breaks privacy)',
        'Not properly implementing ECDH key derivation (security vulnerability)',
        'Storing view keys and spend keys in the same place (reduces security)',
        'Not including enough information for recipients to scan transactions',
        'Using weak random number generation for ephemeral keys',
        'Forgetting that recipients must actively scan the blockchain'
      ],
      quiz: [
        {
          question: 'What\'s the main privacy benefit of stealth addresses?',
          options: [
            'Transactions are completely invisible',
            'Transaction amounts are hidden',
            'Observers can\'t link payments to the recipient\'s identity',
            'Transaction fees are lower'
          ],
          correctAnswer: 2,
          explanation: 'Stealth addresses break the link between payments and recipients - observers see payments to random addresses instead of the recipient\'s known address!'
        },
        {
          question: 'Why does the sender need to generate a new ephemeral key for each payment?',
          options: [
            'To reduce transaction fees',
            'To make transactions faster',
            'To ensure each stealth address is unique and unlinkable',
            'To make the smart contract simpler'
          ],
          correctAnswer: 2,
          explanation: 'Each new ephemeral key creates a completely different stealth address, preventing anyone from linking multiple payments to the same recipient!'
        },
        {
          question: 'What information does the recipient need to detect stealth payments?',
          options: [
            'Only their spend key',
            'Only their view key',
            'Both view key and spend key',
            'The sender\'s private key'
          ],
          correctAnswer: 1,
          explanation: 'The recipient uses their view key with the ephemeral public key (stored in the transaction) to detect payments. The spend key is only needed later to actually spend the funds!'
        },
        {
          question: 'What happens if a recipient loses their view key but keeps their spend key?',
          options: [
            'They can still detect and spend all payments',
            'They can spend old payments but can\'t detect new ones',
            'They lose access to all their money',
            'Nothing changes - spend key is enough'
          ],
          correctAnswer: 1,
          explanation: 'Without the view key, recipients can\'t scan for new stealth payments, but they can still spend from stealth addresses they previously detected and saved!'
        }
      ],
      funFacts: [
        'Stealth addresses were first proposed for Bitcoin in 2014 but are most famously used in Monero!',
        'The math behind stealth addresses uses the same elliptic curve cryptography that secures Bitcoin wallets',
        'Some privacy coins like Monero make stealth addresses mandatory for all transactions',
        'Advanced implementations can hide transaction amounts too using techniques like RingCT',
        'Stealth addresses add significant complexity but provide much stronger privacy than regular addresses'
      ],
      practicalUses: [
        'Privacy-focused cryptocurrency transactions (like Monero)',
        'Anonymous donations and whistleblower payments',
        'Corporate payments that need to hide business relationships',
        'Personal transactions where financial privacy is important',
        'Integration with decentralized exchanges for private trading',
        'Building privacy layers on top of transparent blockchains'
      ]
    },
    {
      id: 'dexPlayground',
      title: 'DEX Order Book',
      difficulty: 'advanced',
      simpleExplanation: 'Like a sophisticated marketplace where people can place buy and sell orders, and trades can happen partially - like buying 3 out of 5 available concert tickets.',
      realWorldAnalogy: 'It\'s like a stock exchange where you can place orders to buy 100 shares, but if only 60 are available, you get 60 now and keep an order open for the remaining 40.',
      concepts: [
        {
          term: 'Order Book',
          simpleDefinition: 'A list of all buy and sell orders waiting to be matched',
          analogy: 'Like a bulletin board with "For Sale" and "Want to Buy" notes from different people'
        },
        {
          term: 'Partial Fill',
          simpleDefinition: 'When only part of your order gets completed',
          analogy: 'Like ordering a dozen donuts but the shop only has 8 left - you get 8 now and wait for the rest'
        },
        {
          term: 'Market Making',
          simpleDefinition: 'Providing liquidity by placing both buy and sell orders',
          analogy: 'Like a corner store that buys stuff from suppliers and sells to customers'
        }
      ],
      players: ['Buyers (placing buy orders)', 'Sellers (placing sell orders)', 'DEX (order matching system)', 'Market Makers (providing liquidity)'],
      rules: [
        'Orders can be partially filled if there isn\'t enough liquidity',
        'Remaining order parts stay active for future matching',
        'Price per token must be consistent across partial fills',
        'DEX fees are calculated per token actually traded',
        'Orders can be cancelled by their creators anytime'
      ],
      processSteps: [
        {
          step: 1,
          title: 'Place Orders',
          description: 'Buyers and sellers create orders with specific prices and amounts',
          visualMetaphor: 'People put sticky notes on a trading board with their offers'
        },
        {
          step: 2,
          title: 'Order Matching',
          description: 'DEX finds compatible orders and determines fill amounts',
          visualMetaphor: 'A matchmaker looks at all the notes and finds compatible trades'
        },
        {
          step: 3,
          title: 'Partial Execution',
          description: 'Trade happens for whatever amount is available',
          visualMetaphor: 'Complete as much of the trade as possible with available stock'
        },
        {
          step: 4,
          title: 'Order Update',
          description: 'Remaining unfilled orders stay active with updated amounts',
          visualMetaphor: 'Update the sticky notes with new amounts after partial trade'
        },
        {
          step: 5,
          title: 'Settlement',
          description: 'Distribute tokens and ERG to respective parties',
          visualMetaphor: 'Hand out the traded items to their new owners'
        }
      ],
      commonMistakes: [
        'Not accounting for partial fills in order logic',
        'Incorrect fee calculations for partial trades',
        'Not properly linking new orders to original order boxes'
      ],
      quiz: [
        {
          question: 'What happens to a buy order for 100 tokens when only 30 tokens are available?',
          options: [
            'Order fails completely',
            'Buyer gets 30 tokens and order for remaining 70 stays active',
            'Order waits until all 100 tokens are available',
            'Buyer pays for 100 but only gets 30'
          ],
          correctAnswer: 1,
          explanation: 'The DEX partially fills the order - buyer gets 30 tokens now and keeps an active order for the remaining 70 tokens!'
        },
        {
          question: 'How are DEX fees calculated in partial fills?',
          options: [
            'Based on the original full order amount',
            'Based on the actually traded amount only',
            'Fixed fee regardless of amount',
            'No fees on partial fills'
          ],
          correctAnswer: 1,
          explanation: 'DEX fees are calculated based on what actually gets traded - if only 30 out of 100 tokens trade, you only pay fees on those 30!'
        }
      ],
      funFacts: [
        'Advanced DEX contracts can handle thousands of orders simultaneously',
        'Partial fills make DEXs more efficient by not requiring exact matches',
        'Some DEXs use automated market makers instead of order books'
      ],
      practicalUses: [
        'High-volume token trading platforms',
        'Liquidity provision services',
        'Automated trading strategies'
      ]
    }
  ],

  glossary: [
    {
      term: 'Smart Contract',
      definition: 'Code that automatically executes when certain conditions are met',
      analogy: 'Like a vending machine - you put in money, select an item, and it automatically gives you the snack if you paid enough',
      example: 'A contract that automatically sends money to your friend when you type the right password'
    },
    {
      term: 'UTXO',
      definition: 'Unspent Transaction Output - money that hasn\'t been spent yet',
      analogy: 'Like individual bills in your wallet - each $20 bill is separate and you spend whole bills',
      example: 'If you have three $10 UTXOs and want to spend $25, you\'d use all three and get $5 change back'
    },
    {
      term: 'Box',
      definition: 'Ergo\'s version of UTXO that can store money, tokens, and data',
      analogy: 'Like a sealed envelope that contains money and instructions for who can open it',
      example: 'A box containing 100 ERG that can only be opened with the right PIN number'
    },
    {
      term: 'ErgoScript',
      definition: 'The programming language used to write smart contracts on Ergo',
      analogy: 'Like the recipe language for blockchain - tells the computer exactly what to do step by step',
      example: 'sigmaProp(HEIGHT > 1000) means "only allow this transaction after block 1000"'
    },
    {
      term: 'Transaction',
      definition: 'A request to move money or tokens from one place to another',
      analogy: 'Like writing a check - it says "take X money from my account and give it to person Y"',
      example: 'Moving 50 ERG from Alice\'s wallet to Bob\'s wallet'
    },
    {
      term: 'Block Height',
      definition: 'The number of blocks that have been created since the blockchain started',
      analogy: 'Like page numbers in a book - each new page (block) has a higher number than the last',
      example: 'Block height 100,000 means 100,000 blocks have been created (about 138 days on Ergo)'
    },
    {
      term: 'Hash',
      definition: 'A scrambled version of text that always looks the same for the same input',
      analogy: 'Like a fingerprint for text - "hello" always gives the same hash, but "Hello" gives a different one',
      example: 'The hash of "password123" might look like "x7k9m2p8q1r5" but you can\'t reverse it'
    },
    {
      term: 'Private Key',
      definition: 'A secret code that proves you own certain cryptocurrency',
      analogy: 'Like the key to your house - only you should have it, and it opens your wallet',
      example: 'A long random string like "5J8k9N2p7Q1r6S3t8U9v2W7x4Y1z5" that controls your money'
    },
    {
      term: 'Public Key',
      definition: 'The address that others can send money to',
      analogy: 'Like your mailing address - it\'s safe to share with everyone so they can send you stuff',
      example: '3P5K7M9N1Q3R5S7T9V1X3Z5B7D9F1H3J5L7N9'
    },
    {
      term: 'Register',
      definition: 'Storage slots in a box where you can keep extra information',
      analogy: 'Like pockets in a jacket - R4, R5, R6 are different pockets for different types of data',
      example: 'R4 might store a PIN hash, R5 might store an expiration date'
    },
    {
      term: 'Token',
      definition: 'Custom digital assets created on the blockchain',
      analogy: 'Like custom arcade tokens - different from regular quarters, but still valuable in their own system',
      example: 'A game might create "GameCoin" tokens that players can earn and trade'
    },
    {
      term: 'Fee',
      definition: 'Small payment to miners for processing your transaction',
      analogy: 'Like tipping a delivery driver - you pay a little extra to make sure your transaction gets delivered',
      example: 'Paying 0.001 ERG fee to send 10 ERG to a friend'
    },
    {
      term: 'Signature',
      definition: 'Cryptographic proof that you authorized a transaction',
      analogy: 'Like signing a check - it proves you really want to send that money',
      example: 'Your wallet automatically creates a signature when you approve sending money'
    },
    {
      term: 'Atomic',
      definition: 'Either everything happens or nothing happens - no partial completion',
      analogy: 'Like a light switch - it\'s either completely ON or completely OFF, never halfway',
      example: 'In an atomic swap, either both people get what they want or both get their money back'
    },
    {
      term: 'DEX',
      definition: 'Decentralized Exchange - a place to trade tokens without a central authority',
      analogy: 'Like a farmer\'s market run by the community instead of a big company',
      example: 'Trading your GameCoins for ArtTokens directly with other users'
    }
  ],

  progressionPath: [
    'simpleSend',           // Start here - basic concepts
    'pinLockContract',      // Add security concepts
    'timedFund',           // Introduce time-based logic
    'escrowDepositContract', // Multi-party contracts and dispute resolution
    'assetsAtomicExchange', // Token trading concepts
    'tokenSalesService',    // Dynamic pricing and state management
    'headsOrTails',        // Gaming and commitment-reveal schemes
    'singleChainSwap',     // Hash time locks and atomic swaps
    'doubleChainSwap',     // Cross-chain coordination
    'stealthAddress',      // Advanced cryptography and privacy
    'dexPlayground'        // Advanced trading mechanics
  ]
};

export default educationalContent;