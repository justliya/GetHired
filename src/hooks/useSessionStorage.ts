// hooks/useSessionStorage.ts
import { useState, useEffect } from "react";

export function useSessionStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error("SessionStorage error:", e);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("SessionStorage set error:", e);
    }
  }, [key, value]);

  return [value, setValue];
}