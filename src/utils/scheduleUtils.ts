import type { SearchSchedule } from '../types';

export const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const generateWeeklyDayOptions = () => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};

export const generateMonthlyDayOptions = () => {
  return Array.from({ length: 31 }, (_, i) => i + 1);
};

export const getDefaultSchedule = (): SearchSchedule => ({
  enabled: false,
  frequency: 'Daily',
  customSchedule: '09:00',
  notificationType: 'Email',
  quietHours: {
    start: '22:00',
    end: '08:00',
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
