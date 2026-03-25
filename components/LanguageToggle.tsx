
import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  current: Language;
  onSelect: (lang: Language) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ current, onSelect }) => {
  const languages: Language[] = ['Oromo', 'Amharic', 'English'];

  return (
    <div className="flex bg-gray-100 p-1 rounded-lg">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onSelect(lang)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
            current === lang
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
};
