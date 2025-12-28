import { useState, useCallback } from 'react';
import { evaluateFormula } from '@/lib/formula-calculator';

interface UseFormulaInputOptions {
  onCalculate?: (value: number) => void;
  initialValue?: number | string;
}

/**
 * Hook for handling formula-enabled input fields
 * Allows users to type formulas like =20+30 similar to Excel
 */
export function useFormulaInput(options: UseFormulaInputOptions = {}) {
  const { onCalculate, initialValue = '' } = options;
  
  const [displayValue, setDisplayValue] = useState(
    initialValue ? initialValue.toString() : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleChange = useCallback((value: string) => {
    setDisplayValue(value);
    setError(null);
    
    // Show if it's a formula
    setIsCalculating(value.trim().startsWith('='));
  }, []);

  const handleBlur = useCallback(() => {
    if (!displayValue.trim()) {
      setIsCalculating(false);
      return;
    }

    const calculated = evaluateFormula(displayValue);
    
    if (calculated !== null) {
      // Valid result
      setError(null);
      setIsCalculating(false);
      
      // Update display to show calculated result
      setDisplayValue(calculated.toString());
      
      // Callback with calculated value
      if (onCalculate) {
        onCalculate(calculated);
      }
    } else if (displayValue.trim().startsWith('=')) {
      // Invalid formula
      setError('Invalid formula');
      setIsCalculating(false);
    } else {
      // Invalid number
      setError('Invalid number');
      setIsCalculating(false);
    }
  }, [displayValue, onCalculate]);

  const reset = useCallback((value: number | string = '') => {
    setDisplayValue(value.toString());
    setError(null);
    setIsCalculating(false);
  }, []);

  return {
    displayValue,
    error,
    isCalculating,
    handleChange,
    handleBlur,
    reset,
    setDisplayValue,
  };
}
