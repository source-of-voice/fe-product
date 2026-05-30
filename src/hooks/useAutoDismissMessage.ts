import { useEffect, type Dispatch, type SetStateAction } from 'react';

export function useAutoDismissMessage<T>(
  message: T | null,
  setMessage: Dispatch<SetStateAction<T | null>>,
  delay = 5000
) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, setMessage, delay]);
}
