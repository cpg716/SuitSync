import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Calendar, CheckCircle, Clock, AlertCircle, Package, Plus } from 'lucide-react';
import { CustomerAvatar } from './CustomerAvatar';
import { Input } from './Input';
import { Badge } from './Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { Button } from './Button';

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
  mode?: 'individual' | 'party' | 'both';
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
  showProgressIndicators = true,
  mode = 'both'
}) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('individual');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) {
      setCustomers([]);
      setParties([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const promises = [];
        
        // Only search customers if mode allows it
        if (mode === 'both' || mode === 'individual') {
          promises.push(
            fetch(`/api/customers?search=${encodeURIComponent(query)}&include=appointments,alterationJobs`, { 
              credentials: 'include' 
            })
          );
        }
        
        // Only search parties if mode allows it
        if (mode === 'both' || mode === 'party') {
          promises.push(
            fetch(`/api/parties?search=${encodeURIComponent(query)}&include=members,appointments,alterationJobs`, { 
              credentials: 'include' 
            })
          );
        }
        
        const responses = await Promise.all(promises);
        
        if (mode === 'both' || mode === 'individual') {
          const customersRes = responses[mode === 'both' ? 0 : 0];
          if (customersRes.ok) {
            const customersData = await customersRes.json();
            setCustomers(Array.isArray(customersData) ? customersData : customersData.customers || []);
          }
        }
        
        if (mode === 'both' || mode === 'party') {
          const partiesRes = responses[mode === 'both' ? 1 : 0];
          if (partiesRes.ok) {
            const partiesData = await partiesRes.json();
            setParties(Array.isArray(partiesData) ? partiesData : []);
          }
        }
        
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 200);

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

  const getNextAppointment = (appointments: Appointment[] = []) => {
    const futureAppointments = appointments.filter(a => new Date(a.dateTime) > new Date());
    if (futureAppointments.length > 0) {
      return futureAppointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
    }
    return null;
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
          {mode === 'both' ? (
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
                  <div className="p-4 text-center text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <div>No individual customers found</div>
                    <div className="text-xs text-gray-400 mt-1">Try searching with a different name</div>
                  </div>
                ) : (
                  customers.map((customer) => {
                    const progress = showProgressIndicators ? getProgressStatus(customer.appointments, customer.alterationJobs) : null;
                    const nextAppointment = getNextAppointment(customer.appointments);
                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 last:border-b-0 transition-colors"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="flex items-center space-x-3">
                          {progress ? getStatusIcon(progress.status) : <CustomerAvatar name={`${customer.first_name || ''} ${customer.last_name || ''}`} phone={customer.phone} email={customer.email} size="sm" />}
                          <div className="flex-1">
                            <div className="font-medium">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A'}</div>
                            <div className="text-sm text-gray-500 space-y-1">
                              {customer.email && <div>{customer.email}</div>}
                              {customer.phone && <div>{customer.phone}</div>}
                              {nextAppointment && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  Next: {new Date(nextAppointment.dateTime).toLocaleDateString()}
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
                  <div className="p-4 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <div>No wedding parties found</div>
                    <div className="text-xs text-gray-400 mt-1">Try searching with a different party name</div>
                  </div>
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
                        const nextAppointment = getNextAppointment(member.appointments);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 pl-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => handlePartyMemberSelect(party, member)}
                          >
                            <div className="flex items-center space-x-3">
                               {progress ? getStatusIcon(progress.status) : <CustomerAvatar name={member.role} size="sm" />}
                              <div className="flex-1">
                                <div className="font-medium">{member.role}</div>
                                <div className="text-sm text-gray-500 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span>Status: {member.lsCustomerId ? 'Linked to Lightspeed' : 'Pending Link'}</span>
                                  </div>
                                  {nextAppointment && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <Calendar className="h-3 w-3" />
                                      Next: {new Date(nextAppointment.dateTime).toLocaleDateString()}
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
          ) : (
            // Single mode display
            <div className="max-h-60 overflow-auto">
              {mode === 'individual' && (
                customers.map((customer) => {
                  const progress = showProgressIndicators ? getProgressStatus(customer.appointments, customer.alterationJobs) : null;
                  const nextAppointment = getNextAppointment(customer.appointments);
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 last:border-b-0 transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center space-x-3">
                        {progress ? getStatusIcon(progress.status) : <User className="h-4 w-4 text-gray-400" />}
                        <div className="flex-1">
                          <div className="font-medium">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A'}</div>
                          <div className="text-sm text-gray-500 space-y-1">
                            {customer.email && <div>{customer.email}</div>}
                            {customer.phone && <div>{customer.phone}</div>}
                            {nextAppointment && (
                              <div className="flex items-center gap-2 text-xs">
                                <Calendar className="h-3 w-3" />
                                Next: {new Date(nextAppointment.dateTime).toLocaleDateString()}
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
              
              {mode === 'party' && (
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
                      const nextAppointment = getNextAppointment(member.appointments);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 pl-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handlePartyMemberSelect(party, member)}
                        >
                          <div className="flex items-center space-x-3">
                            {progress ? getStatusIcon(progress.status) : <User className="h-4 w-4 text-gray-400" />}
                            <div className="flex-1">
                              <div className="font-medium">{member.role}</div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span>Status: {member.lsCustomerId ? 'Linked to Lightspeed' : 'Pending Link'}</span>
                                </div>
                                {nextAppointment && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar className="h-3 w-3" />
                                    Next: {new Date(nextAppointment.dateTime).toLocaleDateString()}
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
            </div>
          )}
        </div>
      )}

      {isOpen && !loading && query.length >= 2 && customers.length === 0 && parties.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500">
          <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <div>No customers or parties found for "{query}"</div>
          <div className="text-xs text-gray-400 mt-1">Try searching with a different name or party</div>
        </div>
      )}
    </div>
  );
};