import { Parser } from 'expr-eval';

/**
 * Evaluates a formula string and returns the calculated result
 * Supports Excel-like formulas starting with "="
 * 
 * Examples:
 * - "100" → 100
 * - "=20+30" → 50
 * - "=100-25" → 75
 * - "=50*2" → 100
 * - "=(20+30)*2" → 100
 * 
 * @param input - The input string (can be a number or formula starting with "=")
 * @returns The calculated number or null if invalid
 */
export function evaluateFormula(input: string): number | null {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return null;
  }
  
  // Check if it starts with "=" (formula mode)
  if (trimmed.startsWith('=')) {
    const expression = trimmed.slice(1).trim(); // Remove "="
    
    if (!expression) {
      return null;
    }
    
    try {
      const parser = new Parser();
      const result = parser.evaluate(expression);
      
      // Ensure result is a valid number
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
      
      return null;
    } catch (error) {
      // Invalid expression
      console.debug('Formula evaluation error:', error);
      return null;
    }
  }
  
  // Regular number input
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validates if a formula is valid without evaluating it
 * @param input - The input string
 * @returns true if valid, false otherwise
 */
export function isValidFormula(input: string): boolean {
  return evaluateFormula(input) !== null;
}

/**
 * Formats the result of a formula for display
 * @param value - The calculated value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatFormulaResult(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}
