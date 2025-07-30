export interface CalendarConfig {
  scheduleCalendar?: string;
  reminderCalendar?: string;
}

export interface AppConfig {
  maxEvents: number;
  defaultDays: number;
  maxDays: number;
}

export interface CalendarEvent {
  title: string;
  startDate: string;
  endDate?: string;
  calendar: string;
  allDay: boolean;
}

export interface ConnectionStatus {
  scheduleCalendarConnected: boolean;
  reminderCalendarConnected: boolean;
  scheduleCalendarName?: string;
  reminderCalendarName?: string;
} 