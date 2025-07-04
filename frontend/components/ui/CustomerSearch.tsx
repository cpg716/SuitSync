import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Badge } from './Badge';
import { UserAvatar } from './UserAvatar';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  lightspeedId?: string;
  measurements?: any;
  appointments?: Appointment[];
  parties?: Party[];
}

interface Party {
  id: number;
  name: string;
  eventDate: string;
  members?: PartyMember[];
}

interface PartyMember {
  id: number;
  role: string;
  lsCustomerId?: string;
  appointments?: Appointment[];
  measurements?: any;
}

interface Appointment {
  id: number;
  type: string;
  status: string;
  dateTime: string;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
  onPartyMemberSelect: (party: Party, member: PartyMember) => void;
  placeholder?: string;
  className?: string;
  showProgressIndicators?: boolean;
  mode?: 'both' | 'customers' | 'parties';
}

interface SearchResult {
  type: 'customer' | 'party';
  data: Customer | Party;
  member?: PartyMember;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onCustomerSelect,
  onPartyMemberSelect,
  placeholder = "Search customers or parties...",
  className = "",
  showProgressIndicators = true,
  mode = 'both'
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, mode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const performSearch = async (searchQuery: string): Promise<SearchResult[]> => {
    const searchResults: SearchResult[] = [];

    // Search customers
    if (mode === 'both' || mode === 'customers') {
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}&limit=5`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const customers = data.customers || [];
          customers.forEach((customer: Customer) => {
            searchResults.push({ type: 'customer', data: customer });
          });
        }
      } catch (error) {
        console.error('Error searching customers:', error);
      }
    }

    // Search parties and their members
    if (mode === 'both' || mode === 'parties') {
      try {
        const response = await fetch(`/api/parties?search=${encodeURIComponent(searchQuery)}&includeMembers=true`, {
          credentials: 'include'
        });
        if (response.ok) {
          const parties = await response.json();
          parties.forEach((party: Party) => {
            // Add party itself as a result
            searchResults.push({ type: 'party', data: party });
            
            // Add individual members if they match the search
            if (party.members) {
              party.members.forEach((member: PartyMember) => {
                if (member.role.toLowerCase().includes(searchQuery.toLowerCase())) {
                  searchResults.push({ type: 'party', data: party, member });
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error searching parties:', error);
      }
    }

    return searchResults.slice(0, 10); // Limit results
  };

  const handleResultSelect = (result: SearchResult) => {
    if (result.type === 'customer') {
      onCustomerSelect(result.data as Customer);
      setQuery((result.data as Customer).name);
    } else if (result.member) {
      onPartyMemberSelect(result.data as Party, result.member);
      setQuery(`${(result.data as Party).name} - ${result.member.role}`);
    } else {
      // Party selected without specific member
      const party = result.data as Party;
      if (party.members && party.members.length > 0) {
        // For now, just show the party name and let user select member separately
        setQuery(party.name);
      }
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getProgressStatus = (appointments: Appointment[] = []) => {
    const hasFirstFitting = appointments.some(a => a.type === 'first_fitting');
    const hasAlterationsFitting = appointments.some(a => a.type === 'alterations_fitting');
    const hasPickup = appointments.some(a => a.type === 'pickup');
    
    if (hasPickup) return { stage: 'completed', icon: CheckCircle, color: 'text-green-600' };
    if (hasAlterationsFitting) return { stage: 'alterations', icon: Clock, color: 'text-blue-600' };
    if (hasFirstFitting) return { stage: 'measurements', icon: Calendar, color: 'text-yellow-600' };
    return { stage: 'new', icon: AlertCircle, color: 'text-gray-400' };
  };

  const renderResult = (result: SearchResult, index: number) => {
    const isSelected = index === selectedIndex;

    if (result.type === 'customer') {
      const customer = result.data as Customer;
      const progress = showProgressIndicators ? getProgressStatus(customer.appointments) : null;

      return (
        <div
          key={`customer-${customer.id}`}
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
            isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
          }`}
          onClick={() => handleResultSelect(result)}
        >
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">
              {customer.name}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {customer.email || customer.phone || 'No contact info'}
            </div>
          </div>
          {progress && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <progress.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", progress.color)} />
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                {progress.stage}
              </Badge>
            </div>
          )}
        </div>
      );
    } else {
      const party = result.data as Party;
      const member = result.member;
      
      if (member) {
        const progress = showProgressIndicators ? getProgressStatus(member.appointments) : null;
        
        return (
          <div
            key={`party-member-${party.id}-${member.id}`}
            className={cn(
              "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
              isSelected && "bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={() => handleResultSelect(result)}
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">
                <span className="sm:hidden">{member.role}</span>
                <span className="hidden sm:inline">{party.name} - {member.role}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                <span className="sm:hidden">{party.name}</span>
                <span className="hidden sm:inline">Event: {new Date(party.eventDate).toLocaleDateString()}</span>
                <span className="sm:hidden">{new Date(party.eventDate).toLocaleDateString()}</span>
              </div>
            </div>
            {progress && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <progress.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", progress.color)} />
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {progress.stage}
                </Badge>
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={`party-${party.id}`}
            className={cn(
              "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
              isSelected && "bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={() => handleResultSelect(result)}
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">
                {party.name}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                <span className="hidden sm:inline">Event: {new Date(party.eventDate).toLocaleDateString()} • {party.members?.length || 0} members</span>
                <span className="sm:hidden">{new Date(party.eventDate).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Party
            </Badge>
          </div>
        );
      }
    }
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 sm:max-h-80 overflow-y-auto">
          {results.map((result, index) => renderResult(result, index))}
        </div>
      )}

      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 sm:p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          No customers or parties found for "{query}"
        </div>
      )}
    </div>
  );
};
