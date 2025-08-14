import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ToastContext';
import { CustomerSearch } from '../components/ui/CustomerSearchSimple';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  appointments?: any[];
  alterationJobs?: any[];
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PartyMember {
  id?: number;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  customerId?: number;
  suitItem?: string;
  suitStyle?: string;
  suitColor?: string;
}

export default function CreatePartyPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Party details
  const [eventDate, setEventDate] = useState('');
  const [suitItem, setSuitItem] = useState('');
  const [suitStyle, setSuitStyle] = useState('');
  const [suitColor, setSuitColor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('');

  // Groom/Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showGroomForm, setShowGroomForm] = useState(false);
  const [groomForm, setGroomForm] = useState({
    fullName: '',
    phone: '',
    email: ''
  });

  // Party members
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [newMember, setNewMember] = useState<PartyMember>({
    fullName: '',
    phone: '',
    email: '',
    role: '',
    suitItem: '',
    suitStyle: '',
    suitColor: ''
  });

  // Load staff members
  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        const response = await fetch('/api/admin/settings/staff', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setStaffMembers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load staff members:', err);
      }
    };
    
    loadStaffMembers();
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    
    // Add groom as first member
    if (customer) {
      const groomMember: PartyMember = {
        fullName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone || '',
        email: customer.email || '',
        role: 'GROOM',
        customerId: customer.id,
        suitItem: suitItem,
        suitStyle: suitStyle,
        suitColor: suitColor
      };
      setMembers([groomMember]);
    }
  };

  const handleGroomFormSubmit = () => {
    if (!groomForm.fullName || !groomForm.phone) {
      toastError('Please fill in groom name and phone number');
      return;
    }

    const groomMember: PartyMember = {
      fullName: groomForm.fullName,
      phone: groomForm.phone,
      email: groomForm.email,
      role: 'GROOM',
      suitItem: suitItem,
      suitStyle: suitStyle,
      suitColor: suitColor
    };
    
    setMembers([groomMember]);
    setShowGroomForm(false);
    setGroomForm({ fullName: '', phone: '', email: '' });
  };

  const addMember = () => {
    if (!newMember.fullName || !newMember.phone || !newMember.role) {
      toastError('Please fill in all required fields for the member');
      return;
    }

    setMembers([...members, { ...newMember, id: Date.now() }]);
    setNewMember({
      fullName: '',
      phone: '',
      email: '',
      role: '',
      suitItem: '',
      suitStyle: '',
      suitColor: ''
    });
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (members.length === 0 || !members.find(m => m.role === 'GROOM')) {
      toastError('Please add the groom to the party');
      return;
    }
    
    if (!selectedSalesPerson) {
      toastError('Please select a sales person');
      return;
    }
    
    if (!eventDate) {
      toastError('Please select the event date');
      return;
    }
    
    if (members.length === 0) {
      toastError('Please add at least one party member');
      return;
    }

    setLoading(true);
    
    try {
      // Get the groom's customer ID for the party
      const groom = members.find(m => m.role === 'GROOM');
      const partyCustomerId = groom?.customerId || null;

      const partyData = {
        eventDate: new Date(eventDate).toISOString(),
        suitItem,
        suitStyle,
        suitColor,
        notes,
        salesPersonId: parseInt(selectedSalesPerson),
        customerId: partyCustomerId, // Use groom's customer ID for the party
        members: members.map(member => ({
          fullName: member.fullName,
          phone: member.phone,
          email: member.email,
          role: member.role,
          customerId: member.customerId, // Will be null for new members, which triggers customer creation
          suitItem: member.suitItem,
          suitStyle: member.suitStyle,
          suitColor: member.suitColor
        }))
      };

      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(partyData),
      });

      if (!response.ok) {
        throw new Error('Failed to create party');
      }

      const result = await response.json();
      success('Party created successfully! Members will receive appointment scheduling invitations.');
      router.push(`/parties/${result.id}`);
    } catch (err) {
      console.error('Error creating party:', err);
      toastError('Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
    <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Wedding Party</CardTitle>
          <p className="text-gray-600">Set up a new wedding party with customer selection and member management. All members can be selected from existing customers or entered manually to avoid duplicates. The party will be created as a Lightspeed Customer Group named with the groom's last name and wedding date (e.g., "Smith 02/25/26").</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Groom Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Add Groom</Label>
              
              {members.find(m => m.role === 'GROOM') ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{members.find(m => m.role === 'GROOM')?.fullName}</p>
                      <p className="text-sm text-gray-600">{members.find(m => m.role === 'GROOM')?.phone}</p>
                      {members.find(m => m.role === 'GROOM')?.email && (
                        <p className="text-sm text-gray-600">{members.find(m => m.role === 'GROOM')?.email}</p>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => setMembers(members.filter(m => m.role !== 'GROOM'))}
                      variant="outline"
                      size="sm"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      onClick={() => setShowCustomerSearch(true)}
                      className="w-full"
                    >
                      Search Existing Customer
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setShowGroomForm(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Enter Groom Details
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">Choose to search for an existing customer or enter groom details manually. New customers will be automatically created in Lightspeed.</p>
                </div>
              )}

              {showCustomerSearch && (
                <div className="border rounded-lg p-4">
                  <CustomerSearch
                    onCustomerSelect={handleCustomerSelect}
                    onPartyMemberSelect={() => {}} // Not needed for individual mode
                    mode="individual"
                  />
                  <Button 
                    type="button" 
                    onClick={() => setShowCustomerSearch(false)}
                    variant="outline"
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {showGroomForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  <Label className="font-semibold">Enter Groom Details</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="groomName">Full Name *</Label>
                      <Input
                        id="groomName"
                        value={groomForm.fullName}
                        onChange={(e) => setGroomForm({...groomForm, fullName: e.target.value})}
                        placeholder="Enter groom's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="groomPhone">Phone Number *</Label>
                      <Input
                        id="groomPhone"
                        value={groomForm.phone}
                        onChange={(e) => setGroomForm({...groomForm, phone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groomEmail">Email (Optional)</Label>
                    <Input
                      id="groomEmail"
                      type="email"
                      value={groomForm.email}
                      onChange={(e) => setGroomForm({...groomForm, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={handleGroomFormSubmit}
                      className="flex-1"
                    >
                      Add Groom
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        setShowGroomForm(false);
                        setGroomForm({ fullName: '', phone: '', email: '' });
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sales Person Assignment */}
            <div className="space-y-2">
              <Label htmlFor="salesPerson">Sales Person *</Label>
              <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sales person..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers
                    .filter(staff => ['sales', 'sales_management', 'admin'].includes(staff.role))
                    .map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.name} ({staff.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Details */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Event Details</Label>
              <p className="text-sm text-gray-600">Set default suit details for the party. Individual members can override these with their own suit preferences.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Wedding Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suitItem">Suit Item</Label>
                  <Input
                    id="suitItem"
                    placeholder="e.g., 2-Piece Suit, 3-Piece Suit, Tuxedo"
                    value={suitItem}
                    onChange={(e) => setSuitItem(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suitStyle">Suit Style</Label>
                  <Input
                    id="suitStyle"
                    placeholder="e.g., Classic, Modern, Slim Fit"
                    value={suitStyle}
                    onChange={(e) => setSuitStyle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suitColor">Suit Color</Label>
                  <Input
                    id="suitColor"
                    placeholder="e.g., Navy, Charcoal, Black"
                    value={suitColor}
                    onChange={(e) => setSuitColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about the party..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Party Members */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Party Members</Label>
              <p className="text-sm text-gray-600">Add party members. Select from existing customers first to avoid duplicate customer files, or enter details manually.</p>
              
              {/* Current Members */}
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <div key={member.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{member.fullName}</p>
                        <p className="text-sm text-gray-600">{member.phone}</p>
                        {member.email && <p className="text-sm text-gray-600">{member.email}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={member.role === 'GROOM' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          {(member.suitItem || member.suitStyle || member.suitColor) && (
                            <div className="text-xs text-gray-500">
                              {[member.suitItem, member.suitStyle, member.suitColor].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {member.role !== 'GROOM' && (
                        <Button
                          type="button"
                          onClick={() => removeMember(index)}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Member */}
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="font-semibold">Add Party Member</Label>
                {/* Search existing customer to avoid duplicates */}
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => setShowCustomerSearch(true)}>Search Existing Customer</Button>
                  {showCustomerSearch && (
                    <div className="border rounded-lg p-3">
                      <CustomerSearch
                        onCustomerSelect={(c:any) => {
                          // Prefill new member from selection
                          const full = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || '';
                          const already = members.some(m => (m.customerId && m.customerId === c.id) || (m.fullName.toLowerCase() === full.toLowerCase()));
                          setShowCustomerSearch(false);
                          if (already) { return; }
                          setNewMember(n => ({
                            ...n,
                            fullName: full,
                            phone: c.phone || '',
                            email: c.email || '',
                            customerId: c.id,
                          }));
                        }}
                        onPartyMemberSelect={() => {}}
                        mode="individual"
                      />
                      <div className="mt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowCustomerSearch(false)}>Close</Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberName">Full Name *</Label>
                    <Input
                      id="memberName"
                      value={newMember.fullName}
                      onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberPhone">Phone Number *</Label>
                    <Input
                      id="memberPhone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">Email (Optional)</Label>
                    <Input
                      id="memberEmail"
                      type="email"
                      value={newMember.email || ''}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberRole">Role *</Label>
                    <Select 
                      value={newMember.role} 
                      onValueChange={(value) => setNewMember({...newMember, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEST_MAN">Best Man</SelectItem>
                        <SelectItem value="GROOMSMAN">Groomsman</SelectItem>
                        <SelectItem value="FATHER">Father</SelectItem>
                        <SelectItem value="BROTHER">Brother</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Member Suit Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Suit Details (Optional - Override party defaults)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberSuitItem">Suit Item</Label>
                      <Input
                        id="memberSuitItem"
                        placeholder="e.g., 2-Piece Suit, 3-Piece Suit, Tuxedo"
                        value={newMember.suitItem || ''}
                        onChange={(e) => setNewMember({...newMember, suitItem: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberSuitStyle">Suit Style</Label>
                      <Input
                        id="memberSuitStyle"
                        placeholder="e.g., Classic, Modern, Slim Fit"
                        value={newMember.suitStyle || ''}
                        onChange={(e) => setNewMember({...newMember, suitStyle: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberSuitColor">Suit Color</Label>
                      <Input
                        id="memberSuitColor"
                        placeholder="e.g., Navy, Charcoal, Black"
                        value={newMember.suitColor || ''}
                        onChange={(e) => setNewMember({...newMember, suitColor: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={addMember}
                  variant="outline"
                  className="w-full"
                >
                  Add Member
                </Button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating Party...' : 'Create Wedding Party'}
              </Button>
            </div>
      </form>
        </CardContent>
    </Card>
    </div>
  );
}