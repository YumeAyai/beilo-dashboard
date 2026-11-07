import { useContext } from 'react';
import { ThemeContext } from './themeState';

export const useThemeContext = () => useContext(ThemeContext);