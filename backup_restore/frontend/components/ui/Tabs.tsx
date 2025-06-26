import React from 'react';

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange, className = '' }) => (
  <div className={`flex space-x-2 ${className}`}>
    {tabs.map(tab => (
      <button
        key={tab.value}
        className={`px-4 py-2 rounded-t ${value === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default Tabs; 