import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Plus, 
  Eye, 
  Edit3,
  Printer,
  QrCode,
  CheckCircle,
  AlertCircle,
  Circle,
  ChevronRight,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ToastContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { simpleFetcher } from '@/lib/simpleApiClient';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useAuth } from '../src/AuthContext';
import { UserAvatar } from '../components/ui/UserAvatar';

interface AlterationJob {
  id: number;
  jobNumber: string;
  status: string;
  notes: string;
  dueDate: string | null;
  calculatedDueDate: string | null;
  dueDateType: 'custom' | 'wedding' | null;
  completionPercentage: number;
  isOverdue: boolean;
  totalParts: number;
  completedParts: number;
  party?: {
    id: number;
    name: string;
    eventDate: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  partyMember?: {
    id: number;
    role: string;
    notes: string;
  };
  customer?: {
    id: number;
    name: string;
    phone: string;
  };
  jobParts: Array<{
    id: number;
    partName: string;
    status: string;
    qrCode: string;
    tasks: Array<{
      id: number;
      taskName: string;
      status: string;
    }>;
  }>;
}

interface AlterationsResponse {
  alterations: AlterationJob[];
  summary: {
    total: number;
    overdue: number;
    inProgress: number;
    notStarted: number;
    complete: number;
  };
}

export default function AlterationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<AlterationJob | null>(null);

  const { data, error, isLoading, mutate } = useSWR<AlterationsResponse>(
    '/api/alterations',
    simpleFetcher,
    { 
      refreshInterval: 30000,
      revalidateOnFocus: false,
      dedupingInterval: 10000
    }
  );

  const alterations = data?.alterations || [];
  const summary = data?.summary;

  // Filter alterations based on search and status
  const filteredAlterations = alterations.filter(alteration => {
    const matchesSearch = search === '' || 
      alteration.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
      alteration.notes.toLowerCase().includes(search.toLowerCase()) ||
      alteration.party?.name.toLowerCase().includes(search.toLowerCase()) ||
      alteration.partyMember?.notes.toLowerCase().includes(search.toLowerCase()) ||
      alteration.customer?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === '' || alteration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Summary data for hero section
  const heroSummary = {
    totalJobs: summary?.total || 0,
    overdueJobs: summary?.overdue || 0,
    inProgressJobs: summary?.inProgress || 0,
    completedJobs: summary?.complete || 0,
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'NOT_STARTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4" />;
      case 'NOT_STARTED':
        return <Circle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const formatDueDate = (dueDate: string | null, dueDateType: string | null) => {
    if (!dueDate) return 'No due date';
    
    const date = new Date(dueDate);
    const formatted = format(date, 'MMM d, yyyy');
    
    if (dueDateType === 'wedding') {
      return `${formatted} (7 days before wedding)`;
    }
    
    return formatted;
  };

  const getUrgencyColor = (alteration: AlterationJob) => {
    if (alteration.isOverdue) return 'border-red-500 bg-red-50 dark:bg-red-900/10';
    if (alteration.calculatedDueDate) {
      const dueDate = new Date(alteration.calculatedDueDate);
      const threeDaysFromNow = addDays(new Date(), 3);
      if (isBefore(dueDate, threeDaysFromNow)) return 'border-orange-500 bg-orange-50 dark:bg-orange-900/10';
    }
    return 'border-gray-200 dark:border-gray-700';
  };

  const handleViewParty = (partyId: number) => {
    router.push(`/parties/${partyId}`);
  };

  const handleViewJob = (job: AlterationJob) => {
    setSelectedJob(job);
  };

  const handlePrintTicket = async (jobId: number, printType: 'all' | 'sections' = 'all') => {
    try {
      const response = await fetch(`/api/alterations/jobs/${jobId}/ticket`);
      if (response.ok) {
        const ticketData = await response.json();
        
        // Send to local printer
        const printResponse = await fetch('/api/print/alterations-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...ticketData.ticketData,
            printType
          })
        });
        
        if (printResponse.ok) {
          const printResult = await printResponse.json();
          success(printResult.message || `Alteration ${printType} sent to printer!`);
        } else {
          toastError('Print failed. Please try again.');
        }
      }
    } catch (error) {
      toastError('Failed to generate ticket');
    }
  };

  if (authLoading) {
    return (
      <div className="w-full space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please sign in to view alterations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Error Loading Alterations
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Alteration Management</h1>
          <p className="text-lg text-blue-100 mb-4">Track and manage all your alteration jobs and progress.</p>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" showName />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <PieChart className="w-12 h-12 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">{heroSummary.completedJobs} / {heroSummary.totalJobs} Completed</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Scissors className="w-6 h-6 text-blue-600" />
            <CardTitle>Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-200 animate-countup">{heroSummary.totalJobs}</div>
            <div className="text-sm text-blue-500">alteration jobs</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <CardTitle>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-200 animate-countup">{heroSummary.overdueJobs}</div>
            <div className="text-sm text-red-500">need attention</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-200 animate-countup">{heroSummary.inProgressJobs}</div>
            <div className="text-sm text-purple-500">being worked on</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-200 animate-countup">{heroSummary.completedJobs}</div>
            <div className="text-sm text-green-500">finished</div>
          </CardContent>
        </Card>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Alteration Jobs
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all alteration jobs and track progress
          </p>
        </div>
        <Button onClick={() => router.push('/create-alteration')}>
          <Plus className="w-4 h-4 mr-2" />
          New Alteration Job
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by job number, customer, party..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETE">Complete</option>
            </select>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              {filteredAlterations.length} of {alterations.length} alterations
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alterations List */}
      <div className="space-y-4">
        {filteredAlterations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Alterations Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first alteration job to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlterations.map((alteration) => (
            <Card key={alteration.id} className={`border-2 ${getUrgencyColor(alteration)}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left side - Job info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {alteration.jobNumber}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alteration.status)}`}>
                            {getStatusIcon(alteration.status)}
                            {alteration.status.replace('_', ' ')}
                          </span>
                          {alteration.isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {/* Customer/Party info */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-gray-100">
                              {alteration.customer?.name || alteration.partyMember?.notes}
                            </span>
                            {alteration.party && (
                              <>
                                <span className="text-gray-400">•</span>
                                <button
                                  onClick={() => handleViewParty(alteration.party!.id)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                >
                                  {alteration.party.name}
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Due date */}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Due: {formatDueDate(alteration.calculatedDueDate, alteration.dueDateType)}
                            </span>
                          </div>
                          
                          {/* Progress */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${alteration.completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {alteration.completedParts}/{alteration.totalParts} parts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Parts summary */}
                    <div className="flex flex-wrap gap-2">
                      {alteration.jobParts.map((part) => (
                        <span
                          key={part.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            part.status === 'COMPLETE' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : part.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {part.partName}
                          {part.status === 'COMPLETE' && <CheckCircle className="w-3 h-3" />}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Right side - Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewJob(alteration)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintTicket(alteration.id, 'all')}
                        className="flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintTicket(alteration.id, 'sections')}
                        className="flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Sections
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/alterations/${alteration.id}`)}
                      className="flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Scan QR
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedJob.jobNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedJob(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Job info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                      {getStatusIcon(selectedJob.status)}
                      {selectedJob.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {formatDueDate(selectedJob.calculatedDueDate, selectedJob.dueDateType)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedJob.customer?.name || selectedJob.partyMember?.notes}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Progress:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedJob.completedParts}/{selectedJob.totalParts} parts ({selectedJob.completionPercentage}%)
                    </span>
                  </div>
                </div>
                
                {/* Parts details */}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Parts & Tasks</h3>
                  <div className="space-y-3">
                    {selectedJob.jobParts.map((part) => (
                      <div key={part.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {part.partName}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            part.status === 'COMPLETE' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : part.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {part.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {part.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-2 h-2 rounded-full ${
                                task.status === 'COMPLETE' 
                                  ? 'bg-green-500'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`} />
                              <span className="text-gray-700 dark:text-gray-300">
                                {task.taskName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Notes */}
                {selectedJob.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {selectedJob.notes}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintTicket(selectedJob.id, 'all')}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintTicket(selectedJob.id, 'sections')}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Sections
                  </Button>
                </div>
                <Button
                  onClick={() => router.push(`/alterations/${selectedJob.id}`)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Manage Job
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}