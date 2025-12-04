import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Buy Theme - Professional, stable, trustworthy
const buyTheme = {
  name: 'buy',
  mode: 'buy',
  colors: {
    primary: '#1D4ED8',           // Vibrant Royal Blue
    secondary: '#0EA5E9',         // Light Cyan Blue
    backgroundLow: '#F8FAFC',     // Off-White Snow Blue
    backgroundHigh: '#FFFFFF',    // Pure White
    button: '#1D4ED8',
    icon: '#1E3A8A',              // Deep Navy
    hover: '#2563EB',             // Brighter Blue
    // Legacy support
    bgLowest: '#F8FAFC',
    bgHigher: '#FFFFFF',
    buttonPrimary: '#1D4ED8',
    buttonSecondary: '#0EA5E9',
    text: '#1E293B',
    textLight: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B'
  },
  fonts: {
    primary: "'Inter', sans-serif",
    fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weights: {
      normal: 400,
      semibold: 600,
      bold: 700
    }
  },
  styles: {
    borderRadius: '8px',
    cardShadow: '0 2px 8px rgba(30, 58, 138, 0.1)',
    cardShadowHover: '0 8px 24px rgba(30, 58, 138, 0.15)',
    buttonShadow: '0 2px 4px rgba(29, 78, 216, 0.2)',
    cardBorderRadius: '12px'
  }
};

// Rent Theme - Energetic, flexible, modern
const rentTheme = {
  name: 'rent',
  mode: 'rent',
  colors: {
    primary: '#DC2626',           // Modern Cherry Red
    secondary: '#F97316',         // Bright Orange Accent
    backgroundLow: '#FFF7F7',     // Soft Warm Pink-White
    backgroundHigh: '#FFFFFF',    // Pure White
    button: '#DC2626',
    icon: '#B91C1C',              // Deep Burgundy
    hover: '#EF4444',             // Light Red
    // Legacy support
    bgLowest: '#FFF7F7',
    bgHigher: '#FFFFFF',
    buttonPrimary: '#DC2626',
    buttonSecondary: '#F97316',
    text: '#1E293B',
    textLight: '#64748B',
    border: '#FEE2E2',
    success: '#10B981',
    error: '#DC2626',
    warning: '#F97316'
  },
  fonts: {
    primary: "'Poppins', sans-serif",
    fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weights: {
      normal: 400,
      semibold: 600,
      bold: 700
    }
  },
  styles: {
    borderRadius: '12px',
    cardShadow: '0 2px 8px rgba(185, 28, 28, 0.08)',
    cardShadowHover: '0 8px 24px rgba(220, 38, 38, 0.15)',
    buttonShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
    cardBorderRadius: '16px'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get theme from localStorage or default to 'buy'
    const savedTheme = localStorage.getItem('propertyTheme');
    return savedTheme === 'rent' ? rentTheme : buyTheme;
  });

  const switchTheme = (themeName) => {
    const newTheme = themeName === 'rent' ? rentTheme : buyTheme;
    setCurrentTheme(newTheme);
    localStorage.setItem('propertyTheme', themeName);
    
    // Apply CSS variables to document root
    applyThemeToDocument(newTheme);
  };

  const applyThemeToDocument = (theme) => {
    const root = document.documentElement;
    
    // Apply color variables (new naming convention)
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-background-low', theme.colors.backgroundLow);
    root.style.setProperty('--theme-background-high', theme.colors.backgroundHigh);
    root.style.setProperty('--theme-button', theme.colors.button);
    root.style.setProperty('--theme-icon', theme.colors.icon);
    root.style.setProperty('--theme-hover', theme.colors.hover);
    
    // Legacy support (old naming convention)
    root.style.setProperty('--theme-bg-lowest', theme.colors.bgLowest);
    root.style.setProperty('--theme-bg-higher', theme.colors.bgHigher);
    root.style.setProperty('--theme-button-primary', theme.colors.buttonPrimary);
    root.style.setProperty('--theme-button-secondary', theme.colors.buttonSecondary);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-light', theme.colors.textLight);
    root.style.setProperty('--theme-border', theme.colors.border);
    
    // Apply font
    root.style.setProperty('--theme-font', theme.fonts.primary);
    
    // Apply styles
    root.style.setProperty('--theme-border-radius', theme.styles.borderRadius);
    root.style.setProperty('--theme-card-shadow', theme.styles.cardShadow);
    root.style.setProperty('--theme-card-shadow-hover', theme.styles.cardShadowHover);
    root.style.setProperty('--theme-button-shadow', theme.styles.buttonShadow);
    root.style.setProperty('--theme-card-border-radius', theme.styles.cardBorderRadius);
    
    // Add theme class to body
    document.body.className = `theme-${theme.name}`;
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  const value = {
    theme: currentTheme,
    switchTheme,
    isBuyMode: currentTheme.name === 'buy',
    isRentMode: currentTheme.name === 'rent'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
