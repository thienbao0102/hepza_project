import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { startLoading, finishLoading } from '@lib/nprogress';

const LoadingProgress = () => {
  const location = useLocation();

  useEffect(() => {
    // Start loading when route changes
    startLoading();
    
    // Finish loading after a short delay to show the progress bar
    const timer = setTimeout(() => {
      finishLoading();
    }, 300);

    return () => {
      clearTimeout(timer);
      finishLoading();
    };
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

export default LoadingProgress;
