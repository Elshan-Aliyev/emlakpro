import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('propertyMode') || 'buy');
  const [propertyCategory, setPropertyCategory] = useState('residential');

  const switchTheme = (newMode) => {
    setMode(newMode);
    localStorage.setItem('propertyMode', newMode);
  };

  return (
    <ThemeContext.Provider value={{
      switchTheme,
      isBuyMode:  mode === 'buy',
      isRentMode: mode === 'rent',
      propertyCategory,
      setPropertyCategory,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
