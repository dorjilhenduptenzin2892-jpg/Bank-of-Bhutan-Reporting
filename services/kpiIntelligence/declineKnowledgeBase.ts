/**
 * Master Decline Knowledge Base
 * Comprehensive dictionary of decline reasons across POS, ATM, and IPG channels
 * Each decline contains responsibility weights, typical causes, and regulator-safe explanations
 */

export interface DeclineEntry {
  category: 'Business' | 'Technical' | 'Network' | 'Policy' | 'Cardholder' | 'Merchant' | 'External' | 'Authentication';
  issuer_weight: number;
  acquirer_weight: number;
  network_weight: number;
  cardholder_weight: number;
  merchant_weight: number;
  external_weight: number;
  typical_causes: string[];
  neutral_explanation: string;
  regulator_safe_statement: string;
  severity_score: number; // 1-5
  channels?: ('POS' | 'ATM' | 'IPG')[]; // Applicable channels
}

export const DECLINE_KNOWLEDGE_BASE: Record<string, DeclineEntry> = {
  // ==========================
  // BUSINESS DECLINES
  // ==========================

  'DO NOT HONOUR': {
    category: 'Business',
    issuer_weight: 0.60,
    acquirer_weight: 0.05,
    network_weight: 0.10,
    cardholder_weight: 0.25,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Issuer authorization and risk policies',
      'Insufficient available funds or credit limit constraints',
      'Fraud prevention and velocity checks',
      'Temporary card restrictions or holds'
    ],
    neutral_explanation:
      'The transaction was declined by the issuer based on internal authorization policies and risk assessment criteria.',
    regulator_safe_statement:
      'This decline category represents issuer-driven authorization decisions and is commonly observed across acquiring environments.',
    severity_score: 4,
    channels: ['POS', 'ATM', 'IPG']
  },

  'INSUFFICIENT FUNDS': {
    category: 'Cardholder',
    issuer_weight: 0.30,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.70,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Low available account balance relative to transaction amount',
      'Pending holds or unsettled transactions on account',
      'Withdrawal or transaction limit constraints'
    ],
    neutral_explanation:
      "The transaction was declined because the cardholder's available balance was insufficient for the transaction amount.",
    regulator_safe_statement:
      'Insufficient funds declines reflect cardholder account status and represent normal transaction behavior in acquiring environments.',
    severity_score: 3,
    channels: ['POS', 'ATM', 'IPG']
  },

  'SUSPECTED FRAUD': {
    category: 'Business',
    issuer_weight: 0.70,
    acquirer_weight: 0.05,
    network_weight: 0.15,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Issuer fraud detection system triggers',
      'Unusual transaction pattern or velocity anomaly',
      'Geographic or behavioral mismatch',
      'Scheme-level fraud monitoring'
    ],
    neutral_explanation:
      'The transaction was declined due to fraud risk controls triggered by issuer or scheme monitoring mechanisms.',
    regulator_safe_statement:
      'Fraud-related declines reflect standard risk management practices and regulatory compliance measures.',
    severity_score: 5,
    channels: ['POS', 'ATM', 'IPG']
  },

  'EXPIRED CARD': {
    category: 'Policy',
    issuer_weight: 0.40,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.60,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Card expiration date has passed',
      'Cardholder has not renewed expired card'
    ],
    neutral_explanation:
      'The card has expired and is no longer valid for transactions.',
    regulator_safe_statement:
      'Expired card declines are routine and reflect normal card lifecycle management.',
    severity_score: 2,
    channels: ['POS', 'ATM', 'IPG']
  },

  'LOST CARD': {
    category: 'Policy',
    issuer_weight: 0.90,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Card reported lost by cardholder',
      'Issuer-blocked card for security'
    ],
    neutral_explanation:
      'The card has been reported as lost and blocked by the issuer.',
    regulator_safe_statement:
      'Lost card blocks are part of standard fraud prevention and cardholder protection protocols.',
    severity_score: 2,
    channels: ['POS', 'ATM', 'IPG']
  },

  'STOLEN CARD': {
    category: 'Policy',
    issuer_weight: 0.90,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Card reported stolen by cardholder',
      'Issuer fraud controls activated'
    ],
    neutral_explanation:
      'The card has been reported as stolen and blocked by the issuer.',
    regulator_safe_statement:
      'Stolen card blocks represent essential fraud prevention and security controls.',
    severity_score: 2,
    channels: ['POS', 'ATM', 'IPG']
  },

  'RESTRICTED CARD': {
    category: 'Policy',
    issuer_weight: 0.70,
    acquirer_weight: 0.10,
    network_weight: 0.10,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Card usage restrictions by issuer',
      'Disabled transaction types (POS/ATM)',
      'Geographic or merchant category restrictions',
      'Customer-imposed spending controls'
    ],
    neutral_explanation:
      'The card has usage restrictions that prevent this type of transaction.',
    regulator_safe_statement:
      'Restricted card declines reflect cardholder protection and issuer risk management policies.',
    severity_score: 3,
    channels: ['POS', 'ATM', 'IPG']
  },

  'TRANSACTION NOT PERMITTED TO CARD': {
    category: 'Policy',
    issuer_weight: 0.70,
    acquirer_weight: 0.05,
    network_weight: 0.10,
    cardholder_weight: 0.15,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Card product restrictions on transaction types',
      'Disabled POS, ATM, or IPG usage',
      'Issuer product rules'
    ],
    neutral_explanation:
      'The transaction type is not enabled for this card based on issuer policy.',
    regulator_safe_statement:
      'Such declines reflect issuer product rules and cardholder account configuration.',
    severity_score: 3,
    channels: ['POS', 'ATM', 'IPG']
  },

  'EXCEED AMOUNT LIMIT': {
    category: 'Policy',
    issuer_weight: 0.60,
    acquirer_weight: 0.10,
    network_weight: 0.00,
    cardholder_weight: 0.30,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Transaction exceeds cardholder daily limit',
      'Transaction exceeds single transaction limit',
      'Cumulative spending threshold reached'
    ],
    neutral_explanation:
      'The transaction amount exceeds limits established by the issuer or cardholder.',
    regulator_safe_statement:
      'Transaction limit declines are part of standard risk control and fraud prevention mechanisms.',
    severity_score: 3,
    channels: ['POS', 'ATM', 'IPG']
  },

  'INCORRECT PIN': {
    category: 'Cardholder',
    issuer_weight: 0.10,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.90,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Incorrect PIN entry by cardholder',
      'Cardholder memory error or typo'
    ],
    neutral_explanation:
      'The transaction was declined due to incorrect PIN entry.',
    regulator_safe_statement:
      'PIN-related declines reflect cardholder authentication behavior and are common in ATM and POS environments.',
    severity_score: 2,
    channels: ['ATM', 'POS']
  },

  'PIN TRY EXCEEDED': {
    category: 'Cardholder',
    issuer_weight: 0.20,
    acquirer_weight: 0.00,
    network_weight: 0.00,
    cardholder_weight: 0.80,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Multiple incorrect PIN attempts',
      'Card locked due to failed authentication'
    ],
    neutral_explanation:
      'The card has been temporarily locked due to excessive failed PIN attempts.',
    regulator_safe_statement:
      'PIN attempt limits are standard security measures to prevent unauthorized card use.',
    severity_score: 2,
    channels: ['ATM', 'POS']
  },

  // ==========================
  // TECHNICAL DECLINES
  // ==========================

  'FORMAT ERROR': {
    category: 'Technical',
    issuer_weight: 0.00,
    acquirer_weight: 0.50,
    network_weight: 0.20,
    cardholder_weight: 0.00,
    merchant_weight: 0.30,
    external_weight: 0.00,
    typical_causes: [
      'ISO 8583 message format violations',
      'Missing or invalid field mappings',
      'Terminal or gateway configuration errors',
      'Data element validation failures'
    ],
    neutral_explanation:
      'The transaction message did not conform to required message format and validation standards.',
    regulator_safe_statement:
      'Format declines may arise from terminal configuration, message transformation layers, or network validation rules.',
    severity_score: 4,
    channels: ['POS', 'ATM', 'IPG']
  },

  'ISSUER OR SWITCH IS INOPERATIVE': {
    category: 'Technical',
    issuer_weight: 0.05,
    acquirer_weight: 0.30,
    network_weight: 0.40,
    cardholder_weight: 0.00,
    merchant_weight: 0.00,
    external_weight: 0.25,
    typical_causes: [
      'Issuer host downtime',
      'Intermediary switch unavailability',
      'Network connectivity disruption',
      'Scheduled maintenance window'
    ],
    neutral_explanation:
      'The issuer or intermediary processing system was temporarily unavailable.',
    regulator_safe_statement:
      'Network unavailability events are occasional operational occurrences in payment processing environments.',
    severity_score: 5,
    channels: ['POS', 'ATM', 'IPG']
  },

  'SYSTEM MALFUNCTION': {
    category: 'Technical',
    issuer_weight: 0.05,
    acquirer_weight: 0.45,
    network_weight: 0.25,
    cardholder_weight: 0.00,
    merchant_weight: 0.10,
    external_weight: 0.15,
    typical_causes: [
      'Host processing error',
      'Network interruption',
      'General system failure',
      'Unrecoverable processing exception'
    ],
    neutral_explanation:
      'The transaction could not be processed due to a general system error.',
    regulator_safe_statement:
      'System-level declines are occasional events that may be recovered through transaction retry.',
    severity_score: 4,
    channels: ['POS', 'ATM', 'IPG']
  },

  'MAC VERIFICATION ERROR': {
    category: 'Technical',
    issuer_weight: 0.20,
    acquirer_weight: 0.50,
    network_weight: 0.20,
    cardholder_weight: 0.00,
    merchant_weight: 0.10,
    external_weight: 0.00,
    typical_causes: [
      'Cryptographic key mismatch',
      'HSM configuration issue',
      'Message integrity validation failure',
      'Timing or synchronization issue'
    ],
    neutral_explanation:
      'The transaction failed due to cryptographic validation during message authentication.',
    regulator_safe_statement:
      'MAC-related declines indicate standard security validation and are typically transient.',
    severity_score: 4,
    channels: ['POS', 'ATM', 'IPG']
  },

  'BATCH NUMBER NOT FOUND': {
    category: 'Technical',
    issuer_weight: 0.10,
    acquirer_weight: 0.60,
    network_weight: 0.10,
    cardholder_weight: 0.00,
    merchant_weight: 0.20,
    external_weight: 0.00,
    typical_causes: [
      'Settlement batch mismatch',
      'Terminal batch not opened',
      'Reconciliation discrepancy',
      'POS system error'
    ],
    neutral_explanation:
      'The settlement batch reference was not found in the host system.',
    regulator_safe_statement:
      'Batch-related declines are typically procedural and resolved through batch reconciliation.',
    severity_score: 3,
    channels: ['POS', 'ATM']
  },

  'ROUTING ERROR': {
    category: 'Network',
    issuer_weight: 0.20,
    acquirer_weight: 0.40,
    network_weight: 0.30,
    cardholder_weight: 0.00,
    merchant_weight: 0.10,
    external_weight: 0.00,
    typical_causes: [
      'Incorrect transaction routing',
      'Card network path unavailable',
      'Acquirer/switch configuration error',
      'BIN or routing table issue'
    ],
    neutral_explanation:
      'The transaction could not be routed to the appropriate processor.',
    regulator_safe_statement:
      'Routing declines are typically transient and resolvable through system optimization.',
    severity_score: 4,
    channels: ['POS', 'ATM', 'IPG']
  },

  'NEGATIVE CVV/CAM RESULTS': {
    category: 'Technical',
    issuer_weight: 0.40,
    acquirer_weight: 0.30,
    network_weight: 0.20,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'CVV/CVC validation failure',
      'Card authentication failure',
      'Cryptogram validation error',
      'EMV mismatch'
    ],
    neutral_explanation:
      'The transaction failed due to card authentication validation.',
    regulator_safe_statement:
      'Authentication-related declines are security measures and may require cardholder verification.',
    severity_score: 4,
    channels: ['POS', 'IPG']
  },

  'INVALID CHIP CARD DATA': {
    category: 'Technical',
    issuer_weight: 0.20,
    acquirer_weight: 0.50,
    network_weight: 0.10,
    cardholder_weight: 0.20,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'EMV chip data unreadable',
      'Card chip malfunction',
      'Terminal reader issue',
      'Data corruption'
    ],
    neutral_explanation:
      'The EMV chip data was invalid or could not be read properly.',
    regulator_safe_statement:
      'Chip-related declines may indicate terminal compatibility or card status issues.',
    severity_score: 3,
    channels: ['POS', 'ATM']
  },

  'TERMINAL ID INVALID': {
    category: 'Technical',
    issuer_weight: 0.10,
    acquirer_weight: 0.60,
    network_weight: 0.10,
    cardholder_weight: 0.00,
    merchant_weight: 0.20,
    external_weight: 0.00,
    typical_causes: [
      'Terminal ID not recognized',
      'Terminal not provisioned in system',
      'Terminal configuration error',
      'Terminal status inactive'
    ],
    neutral_explanation:
      'The terminal ID is invalid or not recognized in the processing system.',
    regulator_safe_statement:
      'Terminal-related declines reflect merchant or acquirer configuration and are resolvable.',
    severity_score: 3,
    channels: ['POS', 'ATM']
  },

  // ==========================
  // IPG-SPECIFIC DECLINES
  // ==========================

  '3DS AUTHENTICATION FAILED': {
    category: 'Authentication',
    issuer_weight: 0.40,
    acquirer_weight: 0.20,
    network_weight: 0.20,
    cardholder_weight: 0.20,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'OTP delivery or entry failure',
      'Cardholder authentication timeout',
      'Issuer ACS validation failure',
      'Device or browser incompatibility'
    ],
    neutral_explanation:
      'The transaction failed during 3D Secure cardholder authentication.',
    regulator_safe_statement:
      '3DS-related declines reflect strong customer authentication requirements and are operationally common.',
    severity_score: 3,
    channels: ['IPG']
  },

  'GATEWAY TIMEOUT': {
    category: 'External',
    issuer_weight: 0.10,
    acquirer_weight: 0.30,
    network_weight: 0.10,
    cardholder_weight: 0.00,
    merchant_weight: 0.20,
    external_weight: 0.30,
    typical_causes: [
      'Payment gateway processing delay',
      'Merchant integration latency',
      'Network timeout',
      'External service unavailability'
    ],
    neutral_explanation:
      'The transaction could not be completed due to processing timeout.',
    regulator_safe_statement:
      'Gateway timeout events reflect infrastructure performance and are typically recoverable.',
    severity_score: 4,
    channels: ['IPG']
  },

  'MERCHANT CONFIGURATION ERROR': {
    category: 'Merchant',
    issuer_weight: 0.05,
    acquirer_weight: 0.30,
    network_weight: 0.05,
    cardholder_weight: 0.00,
    merchant_weight: 0.60,
    external_weight: 0.00,
    typical_causes: [
      'Merchant API integration error',
      'Invalid merchant credentials',
      'Merchant account misconfiguration',
      'Callback URL failure'
    ],
    neutral_explanation:
      'The transaction could not be processed due to merchant system configuration.',
    regulator_safe_statement:
      'Merchant-side configuration issues are resolvable through integration support.',
    severity_score: 3,
    channels: ['IPG']
  },

  'INVALID CARD DATA': {
    category: 'Cardholder',
    issuer_weight: 0.20,
    acquirer_weight: 0.30,
    network_weight: 0.10,
    cardholder_weight: 0.40,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Incorrect card number format',
      'Invalid expiry date',
      'Card number validation failure',
      'Cardholder entry error'
    ],
    neutral_explanation:
      'The card details provided did not pass validation checks.',
    regulator_safe_statement:
      'Card data validation declines are routine and reflect input validation standards.',
    severity_score: 2,
    channels: ['IPG', 'POS']
  },

  'DUPLICATE TRANSACTION': {
    category: 'Technical',
    issuer_weight: 0.10,
    acquirer_weight: 0.60,
    network_weight: 0.10,
    cardholder_weight: 0.10,
    merchant_weight: 0.10,
    external_weight: 0.00,
    typical_causes: [
      'Duplicate processing detected',
      'Retransmitted transaction',
      'Idempotency check failure'
    ],
    neutral_explanation:
      'The transaction was identified as a duplicate of a recently processed transaction.',
    regulator_safe_statement:
      'Duplicate detection is a standard fraud prevention and integrity measure.',
    severity_score: 2,
    channels: ['POS', 'IPG']
  },

  // ==========================
  // GENERIC/FALLBACK DECLINES
  // ==========================

  'DECLINED': {
    category: 'Business',
    issuer_weight: 0.80,
    acquirer_weight: 0.05,
    network_weight: 0.05,
    cardholder_weight: 0.10,
    merchant_weight: 0.00,
    external_weight: 0.00,
    typical_causes: [
      'Generic issuer decline',
      'Issuer authorization policy'
    ],
    neutral_explanation:
      'The transaction was declined by the issuer.',
    regulator_safe_statement:
      'Generic declines represent issuer authorization decisions and are operationally normal.',
    severity_score: 3,
    channels: ['POS', 'ATM', 'IPG']
  },

  'UNKNOWN': {
    category: 'Business',
    issuer_weight: 0.50,
    acquirer_weight: 0.20,
    network_weight: 0.10,
    cardholder_weight: 0.10,
    merchant_weight: 0.10,
    external_weight: 0.00,
    typical_causes: [
      'Undefined or unmapped decline reason',
      'Legacy system response code',
      'Proprietary decline code'
    ],
    neutral_explanation:
      'The transaction was declined for an unspecified reason.',
    regulator_safe_statement:
      'Unclassified declines require investigation to determine root cause.',
    severity_score: 2,
    channels: ['POS', 'ATM', 'IPG']
  }
};

/**
 * Get decline entry with fallback to UNKNOWN
 */
export function getDeclineEntry(reasonName: string): DeclineEntry {
  const normalized = reasonName.toUpperCase().trim();
  return DECLINE_KNOWLEDGE_BASE[normalized] || DECLINE_KNOWLEDGE_BASE['UNKNOWN'];
}

/**
 * Get all decline reasons as array for iteration
 */
export function getAllDeclineReasons(): string[] {
  return Object.keys(DECLINE_KNOWLEDGE_BASE);
}

/**
 * Validate that weights sum to 1.0 for a decline entry
 */
export function validateDeclineWeights(entry: DeclineEntry): boolean {
  const sum =
    entry.issuer_weight +
    entry.acquirer_weight +
    entry.network_weight +
    entry.cardholder_weight +
    entry.merchant_weight +
    entry.external_weight;
  return Math.abs(sum - 1.0) < 0.01; // Allow small floating-point error
}
