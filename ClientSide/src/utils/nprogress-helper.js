import { startLoading, finishLoading, setLoading, incrementLoading } from '@lib/nprogress';

/**
 * Utility functions for NProgress integration
 */

// For manual API calls
export const withProgress = async (asyncFunction, options = {}) => {
  const { 
    showProgress = true, 
    minDuration = 300,
    onStart = null,
    onFinish = null 
  } = options;

  if (showProgress) {
    startLoading();
    if (onStart) onStart();
  }

  const startTime = Date.now();

  try {
    const result = await asyncFunction();
    
    // Ensure minimum duration for better UX
    const elapsed = Date.now() - startTime;
    if (elapsed < minDuration) {
      await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
    }

    return result;
  } catch (error) {
    throw error;
  } finally {
    if (showProgress) {
      finishLoading();
      if (onFinish) onFinish();
    }
  }
};

// For file uploads with progress
export const uploadWithProgress = async (uploadFunction, onProgress = null) => {
  startLoading();
  
  try {
    const result = await uploadFunction((progressEvent) => {
      if (progressEvent.lengthComputable) {
        const progress = progressEvent.loaded / progressEvent.total;
        setLoading(progress);
        if (onProgress) onProgress(progress);
      }
    });
    
    return result;
  } catch (error) {
    throw error;
  } finally {
    finishLoading();
  }
};

// For batch operations
export const batchWithProgress = async (operations, options = {}) => {
  const { showIndividualProgress = true } = options;
  
  startLoading();
  
  try {
    const results = [];
    const total = operations.length;
    
    for (let i = 0; i < total; i++) {
      if (showIndividualProgress) {
        setLoading((i + 0.5) / total);
      }
      
      const result = await operations[i]();
      results.push(result);
      
      if (showIndividualProgress) {
        setLoading((i + 1) / total);
      }
    }
    
    return results;
  } catch (error) {
    throw error;
  } finally {
    finishLoading();
  }
};

// For delayed operations
export const delayedProgress = (delay = 1000) => {
  startLoading();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      finishLoading();
      resolve();
    }, delay);
  });
};

export { startLoading, finishLoading, setLoading, incrementLoading };
