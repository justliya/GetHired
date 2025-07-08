import React, { useState } from 'react';
import ButtonGroup from './ButtonGroup';
import type { SearchFrequency, NotificationType, SearchSchedule } from '../../types';

interface ScheduleConfigProps {
  schedule: SearchSchedule;
  onChange: (schedule: SearchSchedule) => void;
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};

const generateWeeklyDayOptions = () => {
  return [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ];
};

const generateMonthlyDayOptions = () => {
  return Array.from({ length: 31 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() }));
};

const timeOptions = generateTimeOptions();
const weeklyDayOptions = generateWeeklyDayOptions();
const monthlyDayOptions = generateMonthlyDayOptions();

// Available timezones array
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Halifax',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland'
];

const ScheduleConfig: React.FC<ScheduleConfigProps> = ({ schedule, onChange }) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const updateSchedule = (updates: Partial<SearchSchedule>) => {
    onChange({
      ...schedule,
      ...updates,
    });
  };

  const handleFrequencyChange = (frequency: string) => {
    const newSchedule: Partial<SearchSchedule> = {
      frequency: frequency as SearchFrequency,
      customSchedule: ''
    };

    // Set default schedule based on frequency
    switch (frequency) {
      case 'Daily':
        newSchedule.customSchedule = '09:00';
        break;
      case 'Weekly':
        newSchedule.customSchedule = '1,09:00'; // Monday at 9 AM
        break;
      case 'Monthly':
        newSchedule.customSchedule = '1,09:00'; // 1st day at 9 AM
        break;
      case 'Custom':
        newSchedule.customSchedule = '* * * * *'; // Default CRON
        break;
    }

    updateSchedule(newSchedule);
  };

  const handleTimeChange = (time: string) => {
    let newSchedule = time;
    if (schedule.frequency === 'Weekly') {
      const [currentDay] = (schedule.customSchedule || '').split(',');
      newSchedule = `${currentDay || '0'},${time}`;
    } else if (schedule.frequency === 'Monthly') {
      const [currentDay] = (schedule.customSchedule || '').split(',');
      newSchedule = `${currentDay || '1'},${time}`;
    }
    updateSchedule({ customSchedule: newSchedule });
  };

  const handleDayChange = (day: string) => {
    const [, currentTime] = (schedule.customSchedule || '').split(',');
    updateSchedule({ 
      customSchedule: `${day},${currentTime || '09:00'}`
    });
  };

  const handleCronChange = (cron: string) => {
    updateSchedule({ customSchedule: cron });
  };

  const handleQuietHoursChange = (type: 'start' | 'end', value: string) => {
    const currentQuietHours = schedule.quietHours || { start: '22:00', end: '08:00' };
    updateSchedule({
      quietHours: {
        ...currentQuietHours,
        [type]: value
      }
    });
  };

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 rounded-lg p-6">
      {/* Enable/Disable Switch */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => updateSchedule({ enabled: e.target.checked })}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-600 dark:focus:ring-offset-gray-800"
          />
          <span className="text-gray-900 dark:text-gray-100 font-medium">Enable Automated Job Search</span>
        </label>
        <span className={`px-3 py-1 rounded-full text-sm ${
          schedule.enabled
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}>
          {schedule.enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      {schedule.enabled && (
        <>
          {/* Frequency Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Frequency
            </label>
            <ButtonGroup
              options={['Daily', 'Weekly', 'Monthly', 'Custom']}
              selected={schedule.frequency}
              onChange={handleFrequencyChange}
            />
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-4">
            {schedule.frequency === 'Daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time of Day
                </label>
                <select
                  value={schedule.customSchedule}
                  onChange={(e) => updateSchedule({ customSchedule: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{formatTime(time)}</option>
                  ))}
                </select>
              </div>
            )}

            {schedule.frequency === 'Weekly' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={(schedule.customSchedule || '').split(',')[0]}
                    onChange={(e) => handleDayChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                  >
                    {weeklyDayOptions.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time of Day
                  </label>
                  <select
                    value={(schedule.customSchedule || '').split(',')[1] || '09:00'}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{formatTime(time)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {schedule.frequency === 'Monthly' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day of Month
                  </label>
                  <select
                    value={(schedule.customSchedule || '').split(',')[0]}
                    onChange={(e) => handleDayChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                  >
                    {monthlyDayOptions.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time of Day
                  </label>
                  <select
                    value={(schedule.customSchedule || '').split(',')[1] || '09:00'}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{formatTime(time)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {schedule.frequency === 'Custom' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom CRON Schedule
                  </label>
                  <input
                    type="text"
                    value={schedule.customSchedule}
                    onChange={(e) => handleCronChange(e.target.value)}
                    placeholder="* * * * *"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Format: minute hour day-of-month month day-of-week
                  </p>
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
              >
                <span>{showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options</span>
                <svg
                  className={`ml-2 h-5 w-5 transform transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedOptions && (
                <div className="mt-4 space-y-4">
                  {/* Notification Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Type
                    </label>
                    <select
                      value={schedule.notificationType}
                      onChange={(e) => updateSchedule({ notificationType: e.target.value as NotificationType })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                    >
                      <option value="Email">Email Only</option>
                      <option value="Push">Push Notification</option>
                      <option value="Both">Email & Push</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  {/* Quiet Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quiet Hours
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">Start</label>
                        <select
                          value={schedule.quietHours?.start || '22:00'}
                          onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">End</label>
                        <select
                          value={schedule.quietHours?.end || '08:00'}
                          onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                        >
                          {timeOptions.map(time => (
                            <option key={time} value={time}>{formatTime(time)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={schedule.timezone}
                      onChange={(e) => updateSchedule({ timezone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-indigo-500"
                    >
                      {timezones.map(zone => (
                        <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScheduleConfig;
