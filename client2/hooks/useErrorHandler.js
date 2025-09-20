import { useState, useCallback } from 'react';
import { handleError, withErrorHandling } from '../utils/errorHandler';

/**
 * Custom hook for centralized error and loading state management
 * @param {Object} options - Configuration options
 * @param {any} options.fallbackData - Default fallback data
 * @param {boolean} options.showFallback - Whether to show fallback data on error
 * @returns {Object} Error handling utilities and state
 */
export const useErrorHandler = (options = {}) => {
  const { fallbackData = null, showFallback = true } = options;

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear error message
  const clearError = useCallback(() => {
    setError('');
  }, []);

  // Handle error with all context
  const handleErrorWithContext = useCallback((error, context = 'Operation', customMessage = null) => {
    handleError(error, {
      setError,
      setLoading,
      context,
      customMessage,
      fallbackData,
      showFallback
    });
  }, [fallbackData, showFallback]);

  // Execute async function with automatic error handling
  const executeWithErrorHandling = useCallback(async (asyncFn, context = 'API Call') => {
    const result = await withErrorHandling(asyncFn, {
      setError,
      setLoading,
      context,
      fallbackData,
      showFallback
    });
    return result;
  }, [fallbackData, showFallback]);

  // Safe API call wrapper
  const safeApiCall = useCallback(async (apiCall, context = 'API Call', onSuccess = null, onError = null) => {
    try {
      setLoading(true);
      clearError();

      const result = await apiCall();

      if (onSuccess) {
        onSuccess(result);
      }

      return { success: true, data: result };
    } catch (error) {
      handleErrorWithContext(error, context);

      if (onError) {
        onError(error);
      }

      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [clearError, handleErrorWithContext]);

  return {
    // State
    error,
    loading,

    // Actions
    setError,
    setLoading,
    clearError,
    handleError: handleErrorWithContext,
    executeWithErrorHandling,
    safeApiCall
  };
};