import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Textarea } from './Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Checkbox } from './checkbox';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Separator } from './separator';
import { Plus, Trash2, User, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../ToastContext';
import { format } from 'date-fns';
import { api } from '../../lib/apiClient';
import type { Party } from '../../src/types/parties';
// Touch-friendly unified search for customers and parties
import { CustomerSearch } from './CustomerSearchSimple';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface PartyMember {
  id: number;
  role: string;
  lsCustomerId?: string;
}

interface AlterationTask {
  taskName: string;
  taskType: string;
  measurements?: string;
  notes?: string;
}

interface AlterationJobPart {
  partName: string;
  partType: string;
  priority: string;
  estimatedTime?: number;
  notes?: string;
  tasks: AlterationTask[];
}

interface AlterationJobModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (jobData: any) => Promise<void>;
  customers: Customer[];
  parties: Party[];
  preselectedCustomerId?: number;
  preselectedPartyId?: number;
  preselectedPartyMemberId?: number;
}

const GARMENT_PART_TYPES = [
  { value: 'JACKET', label: 'Jacket' },
  { value: 'PANTS', label: 'Pants' },
  { value: 'VEST', label: 'Vest' },
  { value: 'SHIRT', label: 'Shirt' },
  { value: 'DRESS', label: 'Dress' },
  { value: 'SKIRT', label: 'Skirt' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-600' },
  { value: 'RUSH', label: 'Rush', color: 'bg-red-100 text-red-600' },
];

const ORDER_STATUS_OPTIONS = [
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'IN_STOCK', label: 'In-Stock' },
  { value: 'ALTERATION_ONLY', label: 'Alteration Only' },
];

const COMMON_TASKS = {
  JACKET: [
    'Shorten Sleeves',
    'Take in Sides',
    'Take in Back',
    'Shorten Length',
    'Button Adjustment',
    'Lapel Adjustment',
    'Shoulder Adjustment',
    'Chest Adjustment',
    'Waist Suppression',
    'Sleeve Pitch',
    'Cuff Adjustment',
    'Vent Adjustment',
    'Pocket Adjustment',
    'Lining Adjustment',
    'Buttonhole Work',
    'Button Replacement',
    'Thread Matching',
    'Press & Finish'
  ],
  PANTS: [
    'Hem',
    'Take in Waist',
    'Take in Seat',
    'Taper Legs',
    'Shorten Inseam',
    'Cuff Adjustment',
    'Waistband Adjustment',
    'Pleat Adjustment',
    'Pocket Adjustment',
    'Zipper Adjustment',
    'Crotch Adjustment',
    'Thigh Adjustment',
    'Knee Adjustment',
    'Button Work',
    'Hook & Eye',
    'Belt Loop Adjustment',
    'Press & Finish'
  ],
  VEST: [
    'Take in Sides',
    'Take in Back',
    'Button Adjustment',
    'Length Adjustment',
    'Shoulder Adjustment',
    'Chest Adjustment',
    'Waist Suppression',
    'Armhole Adjustment',
    'Buttonhole Work',
    'Button Replacement',
    'Pocket Adjustment',
    'Thread Matching',
    'Press & Finish'
  ],
  SHIRT: [
    'Shorten Sleeves',
    'Take in Sides',
    'Shorten Length',
    'Collar Adjustment',
    'Cuff Adjustment',
    'Shoulder Adjustment',
    'Chest Adjustment',
    'Waist Adjustment',
    'Armhole Adjustment',
    'Button Work',
    'Button Replacement',
    'Buttonhole Work',
    'Pocket Adjustment',
    'Pleat Adjustment',
    'Thread Matching',
    'Press & Finish'
  ],
  DRESS: [
    'Hem',
    'Take in Sides',
    'Take in Back',
    'Shorten Length',
    'Shoulder Adjustment',
    'Chest Adjustment',
    'Waist Adjustment',
    'Sleeve Adjustment',
    'Neckline Adjustment',
    'Button Work',
    'Zipper Adjustment',
    'Pocket Adjustment',
    'Thread Matching',
    'Press & Finish'
  ],
  SKIRT: [
    'Hem',
    'Take in Waist',
    'Take in Hips',
    'Shorten Length',
    'Waistband Adjustment',
    'Pleat Adjustment',
    'Pocket Adjustment',
    'Zipper Adjustment',
    'Button Work',
    'Hook & Eye',
    'Thread Matching',
    'Press & Finish'
  ],
  OTHER: [
    'Hem',
    'Take in Sides',
    'Shorten Length',
    'Button Work',
    'Zipper Adjustment',
    'Pocket Adjustment',
    'Thread Matching',
    'Press & Finish'
  ]
};

// Button work tasks that can be applied to multiple garments
const BUTTON_WORK_TASKS = [
  'Button Replacement',
  'Buttonhole Work',
  'Button Adjustment',
  'Thread Matching',
  'Hook & Eye',
  'Snap Installation',
  'Velcro Installation'
];

// Common measurement tasks
const MEASUREMENT_TASKS = [
  'Initial Measurements',
  'Fitting Measurements',
  'Final Measurements',
  'Quality Check Measurements'
];

export function AlterationJobModal({
  open,
  onClose,
  onSubmit,
  customers,
  parties,
  preselectedCustomerId,
  preselectedPartyId,
  preselectedPartyMemberId
}: AlterationJobModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  
  const safeCustomers = Array.isArray(customers) ? customers : [];
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: preselectedCustomerId || '',
    partyId: preselectedPartyId || '',
    partyMemberId: preselectedPartyMemberId || '',
    orderStatus: 'ALTERATION_ONLY',
    dueDate: '',
    rushOrder: false,
    notes: '',
  });

  const [jobParts, setJobParts] = useState<AlterationJobPart[]>([
    {
      partName: '',
      partType: 'JACKET',
      priority: 'NORMAL',
      estimatedTime: undefined,
      notes: '',
      tasks: []
    }
  ]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        customerId: preselectedCustomerId || '',
        partyId: preselectedPartyId || '',
        partyMemberId: preselectedPartyMemberId || '',
        orderStatus: 'ALTERATION_ONLY',
        dueDate: '',
        rushOrder: false,
        notes: '',
      });
      setJobParts([{
        partName: '',
        partType: 'JACKET',
        priority: 'NORMAL',
        estimatedTime: undefined,
        notes: '',
        tasks: []
      }]);
    }
  }, [open, preselectedCustomerId, preselectedPartyId, preselectedPartyMemberId]);

  const selectedParty = Array.isArray(parties) ? parties.find(p => p.id === parseInt(formData.partyId as string)) : null;
  const selectedCustomer = safeCustomers.find(c => c.id === parseInt(formData.customerId as string)) || selectedParty?.customer;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addJobPart = () => {
    setJobParts(prev => [...prev, {
      partName: '',
      partType: 'JACKET',
      priority: 'NORMAL',
      estimatedTime: undefined,
      notes: '',
      tasks: []
    }]);
  };

  const removeJobPart = (index: number) => {
    if (jobParts.length > 1) {
      setJobParts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateJobPart = (index: number, field: string, value: any) => {
    setJobParts(prev => prev.map((part, i) => 
      i === index ? { ...part, [field]: value } : part
    ));
  };

  const addTask = (partIndex: number, taskName: string = '') => {
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: [...part.tasks, { taskName, taskType: 'alteration', measurements: '', notes: '' }]
      } : part
    ));
  };

  const removeTask = (partIndex: number, taskIndex: number) => {
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: part.tasks.filter((_, j) => j !== taskIndex)
      } : part
    ));
  };

  const updateTask = (partIndex: number, taskIndex: number, field: string, value: any) => {
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: part.tasks.map((task, j) => 
          j === taskIndex ? { ...task, [field]: value } : task
        )
      } : part
    ));
  };

  const addCommonTasks = (partIndex: number, partType: string) => {
    const commonTasks = COMMON_TASKS[partType as keyof typeof COMMON_TASKS] || [];
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: [
          ...part.tasks,
          ...commonTasks.map(taskName => ({
            taskName,
            taskType: 'alteration',
            measurements: '',
            notes: ''
          }))
        ]
      } : part
    ));
  };

  const addButtonWorkTasks = (partIndex: number) => {
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: [
          ...part.tasks,
          ...BUTTON_WORK_TASKS.map(taskName => ({
            taskName,
            taskType: 'button_work',
            measurements: '',
            notes: ''
          }))
        ]
      } : part
    ));
  };

  const addMeasurementTasks = (partIndex: number) => {
    setJobParts(prev => prev.map((part, i) => 
      i === partIndex ? {
        ...part,
        tasks: [
          ...part.tasks,
          ...MEASUREMENT_TASKS.map(taskName => ({
            taskName,
            taskType: 'measurement',
            measurements: '',
            notes: ''
          }))
        ]
      } : part
    ));
  };

  const addButtonWorkToAllGarments = () => {
    setJobParts(prev => prev.map(part => ({
      ...part,
      tasks: [
        ...part.tasks,
        ...BUTTON_WORK_TASKS.map(taskName => ({
          taskName,
          taskType: 'button_work',
          measurements: '',
          notes: ''
        }))
      ]
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customerId && !formData.partyId) {
      toastError('Please select a customer or party');
      return;
    }

    if (jobParts.length === 0) {
      toastError('Please add at least one garment part');
      return;
    }

    const invalidParts = (Array.isArray(jobParts) ? jobParts : []).filter(part => !part.partName.trim());
    if (invalidParts.length > 0) {
      toastError('Please provide names for all garment parts');
      return;
    }

    setLoading(true);
    try {
      const jobData = {
        ...formData,
        customerId: formData.customerId ? parseInt(formData.customerId as string) : undefined,
        partyId: formData.partyId ? parseInt(formData.partyId as string) : undefined,
        partyMemberId: formData.partyMemberId ? parseInt(formData.partyMemberId as string) : undefined,
        jobParts: (Array.isArray(jobParts) ? jobParts : []).map(part => ({
          ...part,
          partName: part.partName.trim(),
          estimatedTime: part.estimatedTime ? parseInt(part.estimatedTime.toString()) : undefined,
          tasks: (Array.isArray(part.tasks) ? part.tasks : []).filter(task => task.taskName.trim())
        }))
      };

      // Submit to backend create endpoint that triggers auto-scheduling
      const res = await api.post('/api/alterations', jobData);
      const rd: any = res.data as any;
      const newJobId = rd?.alterationJob?.id || rd?.id;
      toastSuccess('Alteration job created successfully');
      onClose();
      if (typeof window !== 'undefined' && newJobId) {
        // Redirect to open scheduling prompt
        const url = `/alterations?newJob=${newJobId}&schedulePrompt=1`;
        window.location.assign(url);
      }
    } catch (error) {
      console.error('Error creating alteration job:', error);
      toastError('Failed to create alteration job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Create Alteration Job
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer/Party Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer & Party Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    value={formData.customerId.toString()}
                    onValueChange={(value) => handleInputChange('customerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(customers) ? customers : []).map(customer => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} {customer.phone && `(${customer.phone})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="partyId">Party (Optional)</Label>
                  <Select
                    value={formData.partyId.toString()}
                    onValueChange={(value) => handleInputChange('partyId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(parties) ? parties : []).map(party => (
                        <SelectItem key={party.id} value={party.id.toString()}>
                          {party.name} - {party.eventDate ? format(new Date(party.eventDate), 'MMM d, yyyy') : 'Date unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedParty && Array.isArray(selectedParty.members) && selectedParty.members.length > 0 && (
                <div>
                  <Label htmlFor="partyMemberId">Party Member (Optional)</Label>
                  <Select
                    value={formData.partyMemberId.toString()}
                    onValueChange={(value) => handleInputChange('partyMemberId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party member" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedParty.members.map(member => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedCustomer && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>}
                  {selectedCustomer.email && <p className="text-sm text-gray-600">{selectedCustomer.email}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="orderStatus">Order Status</Label>
                  <Select
                    value={formData.orderStatus}
                    onValueChange={(value) => handleInputChange('orderStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="rushOrder"
                    checked={formData.rushOrder}
                    onCheckedChange={(checked) => handleInputChange('rushOrder', checked)}
                  />
                  <Label htmlFor="rushOrder" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Rush Order
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Job Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special instructions or notes for this job..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Garment Parts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Garment Parts & Tasks</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={addButtonWorkToAllGarments} 
                    variant="outline" 
                    size="sm"
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    disabled={jobParts.length === 0}
                  >
                    Add Button Work to All
                  </Button>
                  <Button type="button" onClick={addJobPart} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Array.isArray(jobParts) ? jobParts : []).map((part, partIndex) => (
                <Card key={partIndex} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Part {partIndex + 1}</CardTitle>
                      {jobParts.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeJobPart(partIndex)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Part Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Part Name *</Label>
                        <Input
                          value={part.partName}
                          onChange={(e) => updateJobPart(partIndex, 'partName', e.target.value)}
                          placeholder="e.g., Navy Suit Jacket"
                          required
                        />
                      </div>
                      <div>
                        <Label>Part Type</Label>
                        <Select
                          value={part.partType}
                          onValueChange={(value) => updateJobPart(partIndex, 'partType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GARMENT_PART_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={part.priority}
                          onValueChange={(value) => updateJobPart(partIndex, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <Badge className={option.color}>{option.label}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Est. Time (min)</Label>
                        <Input
                          type="number"
                          value={part.estimatedTime || ''}
                          onChange={(e) => updateJobPart(partIndex, 'estimatedTime', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="60"
                        />
                      </div>
                    </div>

                    {/* Part Notes */}
                    <div>
                      <Label>Part Notes</Label>
                      <Textarea
                        value={part.notes || ''}
                        onChange={(e) => updateJobPart(partIndex, 'notes', e.target.value)}
                        placeholder="Any specific notes for this part..."
                        rows={2}
                      />
                    </div>

                    <Separator />

                    {/* Tasks */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-base font-semibold">Tasks</Label>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            onClick={() => addCommonTasks(partIndex, part.partType)}
                            variant="outline"
                            size="sm"
                          >
                            Add Common Tasks
                          </Button>
                          <Button
                            type="button"
                            onClick={() => addButtonWorkTasks(partIndex)}
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                          >
                            Add Button Work
                          </Button>
                          <Button
                            type="button"
                            onClick={() => addMeasurementTasks(partIndex)}
                            variant="outline"
                            size="sm"
                            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          >
                            Add Measurements
                          </Button>
                          <Button
                            type="button"
                            onClick={() => addTask(partIndex)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Custom Task
                          </Button>
                        </div>
                      </div>

                      {(Array.isArray(part.tasks) ? part.tasks : []).length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No tasks added yet</p>
                      ) : (
                        <div className="space-y-3">
                          {(Array.isArray(part.tasks) ? part.tasks : []).map((task, taskIndex) => (
                            <div key={taskIndex} className={`border rounded-lg p-3 ${
                              task.taskType === 'button_work' ? 'border-blue-200 bg-blue-50' :
                              task.taskType === 'measurement' ? 'border-green-200 bg-green-50' :
                              'border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium">Task {taskIndex + 1}</Label>
                                  {task.taskType === 'button_work' && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Button Work</Badge>
                                  )}
                                  {task.taskType === 'measurement' && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">Measurement</Badge>
                                  )}
                                  {task.taskType === 'alteration' && (
                                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">Alteration</Badge>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeTask(partIndex, taskIndex)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label>Task Name *</Label>
                                  <Input
                                    value={task.taskName}
                                    onChange={(e) => updateTask(partIndex, taskIndex, 'taskName', e.target.value)}
                                    placeholder="e.g., Shorten Sleeves"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label>Measurements</Label>
                                  <Input
                                    value={task.measurements || ''}
                                    onChange={(e) => updateTask(partIndex, taskIndex, 'measurements', e.target.value)}
                                    placeholder="e.g., 1.5 inches"
                                  />
                                </div>
                              </div>
                              <div className="mt-2">
                                <Label>Task Notes</Label>
                                <Textarea
                                  value={task.notes || ''}
                                  onChange={(e) => updateTask(partIndex, taskIndex, 'notes', e.target.value)}
                                  placeholder="Any specific instructions for this task..."
                                  rows={1}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Alteration Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AlterationJobModal; 