import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Calendar, CheckCircle, Clock, AlertCircle, Package } from 'lucide-react';
import { Input } from './Input';
import { Badge } from './Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  appointments?: Appointment[];
  alterationJobs?: AlterationJob[];
  first_name?: string;
  last_name?: string;
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
  alterationJobs?: AlterationJob[];
}

interface Appointment {
  id: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  status: string;
  dateTime: string;
}

interface AlterationJob {
  id: number;
  status: string;
  jobNumber: string;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
  onPartyMemberSelect: (party: Party, member: PartyMember) => void;
  placeholder?: string;
  showProgressIndicators?: boolean;
}

function getProgressStatus(appointments: Appointment[] = [], jobs: AlterationJob[] = []) {
  const hasFirstFitting = appointments.some(a => a.type === 'first_fitting');
  const hasAlterationsFitting = appointments.some(a => a.type === 'alterations_fitting');
  const hasPickup = appointments.some(a => a.type === 'pickup');
  const hasCompletedJob = jobs.some(j => j.status === 'COMPLETE');
  
  if (hasPickup || hasCompletedJob) return { status: 'ready_pickup', label: 'Ready for Pickup', icon: Package, color: 'bg-green-100 text-green-800' };
  if (hasAlterationsFitting) return { status: 'alterations', label: 'Alterations Phase', icon: Clock, color: 'bg-blue-100 text-blue-800' };
  if (hasFirstFitting) return { status: 'measured', label: 'Measured', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-800' };
  return { status: 'new', label: 'New Customer', icon: AlertCircle, color: 'bg-gray-100 text-gray-800' };
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onCustomerSelect,
  onPartyMemberSelect,
  placeholder = "Search customers or parties...",
  showProgressIndicators = true
}) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('individual');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setCustomers([]);
      setParties([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const [customersRes, partiesRes] = await Promise.all([
          fetch(`/api/customers?search=${encodeURIComponent(query)}&include=appointments,alterationJobs`, { credentials: 'include' }),
          fetch(`/api/parties?search=${encodeURIComponent(query)}&include=members,appointments,alterationJobs`, { credentials: 'include' })
        ]);
        
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(Array.isArray(customersData) ? customersData : customersData.customers || []);
        }
        
        if (partiesRes.ok) {
          const partiesData = await partiesRes.json();
          setParties(Array.isArray(partiesData) ? partiesData : []);
        }
        
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

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

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setQuery(`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A');
    setIsOpen(false);
  };

  const handlePartyMemberSelect = (party: Party, member: PartyMember) => {
    onPartyMemberSelect(party, member);
    setQuery(`${party.name} - ${member.role}`);
    setIsOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready_pickup': return <Package className="h-4 w-4" />;
      case 'alterations': return <Clock className="h-4 w-4" />;
      case 'measured': return <CheckCircle className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isOpen && (customers.length > 0 || parties.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Individual ({customers.length})
              </TabsTrigger>
              <TabsTrigger value="parties" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Parties ({parties.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="max-h-60 overflow-auto">
              {customers.length === 0 ? (
                <div className="p-3 text-center text-gray-500">No individual customers found</div>
              ) : (
                customers.map((customer) => {
                  const progress = showProgressIndicators ? getProgressStatus(customer.appointments, customer.alterationJobs) : null;
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 last:border-b-0"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center space-x-3">
                        {progress ? getStatusIcon(progress.status) : <User className="h-4 w-4 text-gray-400" />}
                        <div className="flex-1">
                          <div className="font-medium">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A'}</div>
                          <div className="text-sm text-gray-500 space-y-1">
                            {customer.email && <div>{customer.email}</div>}
                            {customer.appointments && customer.appointments.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                Next: {new Date(customer.appointments.find(a => new Date(a.dateTime) > new Date())?.dateTime || '').toLocaleDateString() || 'None scheduled'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {progress && <Badge className={progress.color}>{progress.label}</Badge>}
                    </div>
                  );
                })
              )}
            </TabsContent>
            
            <TabsContent value="parties" className="max-h-60 overflow-auto">
              {parties.length === 0 ? (
                <div className="p-3 text-center text-gray-500">No wedding parties found</div>
              ) : (
                parties.map((party) => (
                  <div key={party.id} className="border-b border-gray-100 last:border-b-0">
                    <div className="p-3 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{party.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(party.eventDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {party.members?.map((member) => {
                      const progress = showProgressIndicators ? getProgressStatus(member.appointments, member.alterationJobs) : null;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 pl-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => handlePartyMemberSelect(party, member)}
                        >
                          <div className="flex items-center space-x-3">
                            {progress ? getStatusIcon(progress.status) : <User className="h-4 w-4 text-gray-400" />}
                            <div className="flex-1">
                              <div className="font-medium">{member.role}</div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <div>Status: {member.lsCustomerId ? 'Linked to Lightspeed' : 'Pending Link'}</div>
                                {member.appointments && member.appointments.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    Next: {new Date(member.appointments.find(a => new Date(a.dateTime) > new Date())?.dateTime || '').toLocaleDateString() || 'None scheduled'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {progress && <Badge className={progress.color}>{progress.label}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {isOpen && !loading && query.length >= 2 && customers.length === 0 && parties.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No customers or parties found for "{query}"
        </div>
      )}
    </div>
  );
};