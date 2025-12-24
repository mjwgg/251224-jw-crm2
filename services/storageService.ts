export const getItem = <T>(key: string): T | null => {
  try {
    const item = window.localStorage.getItem(key);
    if (item === null || item === 'undefined') {
        return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return null;
  }
};

export const setItem = <T>(key: string, value: T): boolean => {
  try {
    if (value === undefined) {
        window.localStorage.removeItem(key);
    } else {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
    return false;
  }
};
