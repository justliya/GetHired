import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../context/UserContext';
import { 
  getUserScheduledSearches, 
  updateScheduledSearch, 
  deleteScheduledSearch,
  type ScheduledSearch 
} from '../../services/scheduledSearchService';
import { Timestamp } from 'firebase/firestore';

interface ScheduleStatusDisplayProps {
  onEditSchedule?: (schedule: ScheduledSearch) => void;
  className?: string;
}

type TimestampLike = Timestamp | { toDate: () => Date } | string | Date | null | undefined;

const ScheduleStatusDisplay: React.FC<ScheduleStatusDisplayProps> = ({ 
  onEditSchedule, 
  className = '' 
}) => {
  const { user } = User();
  const [schedules, setSchedules] = useState<ScheduledSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await getUserScheduledSearches(user.uid);
      
      if (result.success) {
        setSchedules(result.data || []);
      } else {
        setError(result.error || 'Failed to load schedules');
      }
    } catch (err) {
      setError('Error loading schedules');
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      loadSchedules();
    }
  }, [user?.uid, loadSchedules]);

  const handleToggleSchedule = async (schedule: ScheduledSearch) => {
    try {
      const newStatus = schedule.status === 'active' ? 'paused' : 'active';
      
      const result = await updateScheduledSearch({
        scheduleId: schedule.id!,
        status: newStatus
      });

      if (result.success) {
        await loadSchedules(); // Reload to get updated data
      } else {
        setError(result.error || 'Failed to update schedule');
      }
    } catch (err) {
      setError('Error updating schedule');
      console.error('Error updating schedule:', err);
    }
  };

  const handleDeleteSchedule = async (schedule: ScheduledSearch) => {
    if (!confirm('Are you sure you want to delete this scheduled search?')) {
      return;
    }

    try {
      const result = await deleteScheduledSearch(schedule.id!);
      
      if (result.success) {
        await loadSchedules(); // Reload to get updated data
      } else {
        setError(result.error || 'Failed to delete schedule');
      }
    } catch (err) {
      setError('Error deleting schedule');
      console.error('Error deleting schedule:', err);
    }
  };

  const formatNextRun = (nextRunAt: TimestampLike) => {
    if (!nextRunAt) return 'Not scheduled';
    
    try {
      // Handle Firestore Timestamp
      let date: Date;
      if (nextRunAt && typeof nextRunAt === 'object' && 'toDate' in nextRunAt) {
        date = (nextRunAt as any).toDate();
      } else {
        date = new Date(nextRunAt as string);
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  const formatLastRun = (lastRunAt: TimestampLike) => {
    if (!lastRunAt) return 'Never';
    
    try {
      let date: Date;
      if (lastRunAt && typeof lastRunAt === 'object' && 'toDate' in lastRunAt) {
        date = (lastRunAt as any).toDate();
      } else {
        date = new Date(lastRunAt as string);
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        return 'Less than an hour ago';
      }
    } catch {
      return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'paused':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'disabled':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button 
            onClick={loadSchedules}
            className="mt-2 text-red-600 dark:text-red-400 underline text-sm hover:text-red-800 dark:hover:text-red-200"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No Scheduled Searches
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Configure a schedule in your preferences to get automatic job search updates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Scheduled Searches ({schedules.length})
      </h3>
      
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <div 
            key={schedule.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={getStatusBadge(schedule.status)}>
                    {schedule.status}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {schedule.schedule.frequency} at {schedule.schedule.customSchedule}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Roles: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {schedule.preferences.titles?.join(', ') || 'Any'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Locations: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {schedule.preferences.locations?.join(', ') || 'Any'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Next Run: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatNextRun(schedule.nextRunAt)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Last Run: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatLastRun(schedule.lastRunAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleToggleSchedule(schedule)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    schedule.status === 'active'
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                  }`}
                  title={schedule.status === 'active' ? 'Pause schedule' : 'Resume schedule'}
                >
                  {schedule.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                
                {onEditSchedule && (
                  <button
                    onClick={() => onEditSchedule(schedule)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                    title="Edit schedule"
                  >
                    Edit
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteSchedule(schedule)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                  title="Delete schedule"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleStatusDisplay;
