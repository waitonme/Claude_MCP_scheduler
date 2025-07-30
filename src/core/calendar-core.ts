import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CalendarConfig, CalendarEvent, ConnectionStatus, AppConfig } from '../types.js';
import { Logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CalendarCore {
  private config: CalendarConfig = {};
  private appConfig: AppConfig = { maxEvents: 1000, defaultDays: 1, maxDays: 365 };
  private readonly configPath = path.join(__dirname, '..', '..', 'setting.json');
  private readonly appConfigPath = path.join(__dirname, '..', '..', 'config.json');
  private readonly logPath = path.join(__dirname, '..', '..', 'activity.log');
  private readonly debugLogPath = path.join(__dirname, '..', '..', 'debug.log');

  async loadAppConfig(): Promise<AppConfig> {
    try {
      await this.debugLog('INFO', '앱 설정 파일 로드 시작', { path: this.appConfigPath });
      const data = await fs.readFile(this.appConfigPath, 'utf-8');
      
      if (!data.trim()) {
        await this.debugLog('WARN', '빈 앱 설정 파일 발견', { path: this.appConfigPath });
        this.appConfig = { maxEvents: 1000, defaultDays: 1, maxDays: 365 };
        return this.appConfig;
      }

      try {
        this.appConfig = JSON.parse(data);
        await this.debugLog('INFO', '앱 설정 로드 완료', { config: this.appConfig });
      } catch (parseError) {
        await this.debugLog('ERROR', '앱 설정 JSON 파싱 오류', { error: parseError, data });
        this.appConfig = { maxEvents: 1000, defaultDays: 1, maxDays: 365 };
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await this.debugLog('INFO', '앱 설정 파일이 없음, 기본값 사용', { path: this.appConfigPath });
        this.appConfig = { maxEvents: 1000, defaultDays: 1, maxDays: 365 };
      } else {
        await this.debugLog('ERROR', '앱 설정 파일 읽기 오류', { error: error.message, code: error.code });
        this.appConfig = { maxEvents: 1000, defaultDays: 1, maxDays: 365 };
      }
    }
    return this.appConfig;
  }

    async loadConfig(): Promise<CalendarConfig> {
    try {
      await this.debugLog('INFO', '설정 파일 로드 시작', { path: this.configPath });
      const data = await fs.readFile(this.configPath, 'utf-8');
      
      if (!data.trim()) {
        await this.debugLog('WARN', '빈 설정 파일 발견', { path: this.configPath });
        this.config = {};
        await this.saveConfig();
        return this.config;
      }

      try {
        this.config = JSON.parse(data);
        await this.debugLog('INFO', '설정 로드 완료', { config: this.config });
      } catch (parseError) {
        await this.debugLog('ERROR', 'JSON 파싱 오류', { error: parseError, data });
        
        const backupPath = `${this.configPath}.backup.${Date.now()}`;
        await fs.copyFile(this.configPath, backupPath);
        await this.debugLog('INFO', '설정 파일 백업 생성', { backupPath });
        
        this.config = {};
        await this.saveConfig();
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await this.debugLog('INFO', '설정 파일이 없음, 새로 생성', { path: this.configPath });
        this.config = {};
        await this.saveConfig();
      } else {
        await this.debugLog('ERROR', '설정 파일 읽기 오류', { error: error.message, code: error.code });
        this.config = {};
      }
    }
    return this.config;
  }

  async init(): Promise<void> {
    await this.loadAppConfig();
    await this.loadConfig();
  }

  async saveConfig(): Promise<void> {
    try {
      await this.debugLog('INFO', '설정 저장 시작', { config: this.config });
      const configJson = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configJson);
      await this.debugLog('INFO', '설정 저장 완료', { path: this.configPath });
    } catch (error: any) {
      await this.debugLog('ERROR', '설정 저장 실패', { error: error.message, config: this.config });
      throw error;
    }
  }

  updateConfig(updates: Partial<CalendarConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): CalendarConfig {
    return { ...this.config };
  }

  getAppConfig(): AppConfig {
    return { ...this.appConfig };
  }

  needsSetup(): boolean {
    return !this.config.scheduleCalendar && !this.config.reminderCalendar;
  }

  getStatus(): ConnectionStatus {
    return {
      scheduleCalendarConnected: !!this.config.scheduleCalendar,
      reminderCalendarConnected: !!this.config.reminderCalendar,
      scheduleCalendarName: this.config.scheduleCalendar,
      reminderCalendarName: this.config.reminderCalendar
    };
  }

  private async log(action: string, type: 'event' | 'reminder', target: string): Promise<void> {
    try {
      const entry = `[${new Date().toISOString()}] ${action} ${type} "${target}"\n`;
      await fs.appendFile(this.logPath, entry);
    } catch (error) {
      Logger.error(`로그 저장 실패: ${error}`);
    }
  }

  async debugLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const detailsStr = details ? ` | Details: ${JSON.stringify(details)}` : '';
      const entry = `[${timestamp}] [${level}] ${message}${detailsStr}\n`;
      await fs.appendFile(this.debugLogPath, entry);
    } catch (error) {
      // debug 로그 실패는 콘솔에만 출력 (무한 루프 방지)
      console.error(`Debug log write failed: ${error}`);
    }
  }

  private async execute(script: string): Promise<string> {
    try {
      await this.debugLog('INFO', 'AppleScript 실행 시작', { script: script.substring(0, 100) + '...' });
      const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
      
      if (stderr && stderr.trim()) {
        await this.debugLog('WARN', 'AppleScript 경고', { stderr });
      }
      
      await this.debugLog('INFO', 'AppleScript 실행 완료', { stdoutLength: stdout.length });
      return stdout.trim();
    } catch (error: any) {
      await this.debugLog('ERROR', 'AppleScript 실행 실패', { error: error.message, script: script.substring(0, 100) + '...' });
      
      if (error.message.includes('Application isn\'t running')) {
        throw new Error('Calendar 또는 Reminders 앱이 실행되지 않았습니다. 앱을 먼저 실행해주세요.');
      } else if (error.message.includes('permission')) {
        throw new Error('Calendar/Reminders 앱 접근 권한이 필요합니다. 시스템 환경설정에서 권한을 확인해주세요.');
      } else {
        throw new Error(`AppleScript 실행 실패: ${error.message || error}`);
      }
    }
  }

  // 나머지 메서드들은 기존과 동일하되 console.log를 제거
  async getCalendars(): Promise<string[]> {
    try {
      await this.debugLog('INFO', '캘린더 목록 조회 시작');
      const output = await this.execute(`
        tell application "Calendar"
          set names to {}
          repeat with cal in calendars
            set end of names to (title of cal)
          end repeat
          return names
        end tell
      `);
      const calendars = output ? output.split(',').map(name => name.trim().replace(/"/g, '')) : [];
      await this.debugLog('INFO', '캘린더 목록 조회 완료', { count: calendars.length, calendars });
      return calendars;
    } catch (error: any) {
      await this.debugLog('ERROR', '캘린더 목록 조회 실패', { error: error.message });
      throw error;
    }
  }

  async getReminderLists(): Promise<string[]> {
    try {
      await this.debugLog('INFO', '리마인더 목록 조회 시작');
      const output = await this.execute(`
        tell application "Reminders"
          set names to {}
          repeat with lst in lists
            set end of names to (name of lst)
          end repeat
          return names
        end tell
      `);
      const lists = output ? output.split(',').map(name => name.trim().replace(/"/g, '')) : [];
      await this.debugLog('INFO', '리마인더 목록 조회 완료', { count: lists.length, lists });
      return lists;
    } catch (error: any) {
      await this.debugLog('ERROR', '리마인더 목록 조회 실패', { error: error.message });
      throw error;
    }
  }

  async getReminders(listName: string, days = 1, maxReminders = 1000): Promise<CalendarEvent[]> {
    try {
      await this.debugLog('INFO', '할일 조회 시작', { listName, days, maxReminders });
      const output = await this.execute(`
        tell application "Reminders"
          set startDate to current date
          set hours of startDate to 0
          set minutes of startDate to 0
          set seconds of startDate to 0
          set endDate to startDate + (${days} * 24 * 60 * 60)
          
          try
            set targetList to list "${listName}"
            set reminders to (reminders of targetList whose due date ≥ startDate and due date ≤ endDate)
            set reminderList to {}
            set count to 0
            repeat with rem in reminders
              if count < ${maxReminders} then
                set info to (name of rem) & "|" & (due date of rem as string) & "|" & (due date of rem as string) & "|" & "${listName}" & "|false"
                set end of reminderList to info
                set count to count + 1
              end if
            end repeat
            return reminderList
          on error
            return {}
          end try
        end tell
      `);

      const reminders = await this.parseEvents(output);
      await this.debugLog('INFO', '할일 조회 완료', { count: reminders.length, listName });
      return reminders;
    } catch (error: any) {
      await this.debugLog('ERROR', '할일 조회 실패', { error: error.message, listName, days });
      throw error;
    }
  }

  async getEvents(calendarName: string, days = 1, maxEvents = 1000): Promise<CalendarEvent[]> {
    try {
      await this.debugLog('INFO', '일정 조회 시작', { calendarName, days, maxEvents });
      const output = await this.execute(`
        tell application "Calendar"
          set startDate to current date
          set hours of startDate to 0
          set minutes of startDate to 0
          set seconds of startDate to 0
          set endDate to startDate + (${days} * 24 * 60 * 60)
          
          try
            set targetCal to calendar "${calendarName}"
            set events to (events of targetCal whose start date ≥ startDate and start date ≤ endDate)
            set eventList to {}
            set count to 0
            repeat with evt in events
              if count < ${maxEvents} then
                set info to (summary of evt) & "|" & (start date of evt as string) & "|" & (end date of evt as string) & "|" & "${calendarName}" & "|" & (allday event of evt)
                set end of eventList to info
                set count to count + 1
              end if
            end repeat
            return eventList
          on error
            return {}
          end try
        end tell
      `);

      const events = await this.parseEvents(output);
      await this.debugLog('INFO', '일정 조회 완료', { count: events.length, calendarName });
      return events;
    } catch (error: any) {
      await this.debugLog('ERROR', '일정 조회 실패', { error: error.message, calendarName, days });
      throw error;
    }
  }

  async addEvent(calendarName: string, title: string, startDate: Date, endDate?: Date): Promise<boolean> {
    try {
      await this.debugLog('INFO', '일정 추가 시작', { calendarName, title, startDate, endDate });
      const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const result = await this.execute(`
        tell application "Calendar"
          try
            set targetCal to calendar "${calendarName}"
            set startDate to date "${startDate.toLocaleDateString('en-US')} ${startDate.toLocaleTimeString('en-US')}"
            set endDate to date "${end.toLocaleDateString('en-US')} ${end.toLocaleTimeString('en-US')}"
            make new event at end of events of targetCal with properties {summary:"${title}", start date:startDate, end date:endDate}
            return "SUCCESS"
          on error
            return "FAILED"
          end try
        end tell
      `);

      const success = result.includes('SUCCESS');
      await this.debugLog(success ? 'INFO' : 'ERROR', '일정 추가 완료', { success, title, calendarName });
      await this.log(success ? 'ADD' : 'ADD_FAILED', 'event', title);
      return success;
    } catch (error: any) {
      await this.debugLog('ERROR', '일정 추가 실패', { error: error.message, title, calendarName });
      throw error;
    }
  }

  async removeEvent(calendarName: string, title: string): Promise<'success' | 'not_found' | 'failed'> {
    try {
      await this.debugLog('INFO', '일정 삭제 시작', { calendarName, title });
      const result = await this.execute(`
        tell application "Calendar"
          try
            set targetCal to calendar "${calendarName}"
            set targetEvents to (events of targetCal whose summary is "${title}")
            if (count of targetEvents) > 0 then
              delete item 1 of targetEvents
              return "SUCCESS"
            else
              return "NOT_FOUND"
            end if
          on error
            return "FAILED"
          end try
        end tell
      `);

      let status: 'success' | 'not_found' | 'failed';
      if (result.includes('SUCCESS')) status = 'success';
      else if (result.includes('NOT_FOUND')) status = 'not_found';
      else status = 'failed';

      await this.debugLog('INFO', '일정 삭제 완료', { status, title, calendarName });
      await this.log(status === 'success' ? 'DELETE' : 'DELETE_FAILED', 'event', title);
      return status;
    } catch (error: any) {
      await this.debugLog('ERROR', '일정 삭제 실패', { error: error.message, title, calendarName });
      throw error;
    }
  }

  async addReminder(listName: string, title: string, dueDate?: Date): Promise<boolean> {
    try {
      await this.debugLog('INFO', '리마인더 추가 시작', { listName, title, dueDate });
      const script = dueDate 
        ? `tell application "Reminders"
            try
              set targetList to list "${listName}"
              set due to date "${dueDate.toLocaleDateString('en-US')} ${dueDate.toLocaleTimeString('en-US')}"
              make new reminder at end of reminders of targetList with properties {name:"${title}", due date:due}
              return "SUCCESS"
            on error
              return "FAILED"
            end try
          end tell`
        : `tell application "Reminders"
            try
              set targetList to list "${listName}"
              make new reminder at end of reminders of targetList with properties {name:"${title}"}
              return "SUCCESS"
            on error
              return "FAILED"
            end try
          end tell`;

      const result = await this.execute(script);
      const success = result.includes('SUCCESS');
      await this.debugLog(success ? 'INFO' : 'ERROR', '리마인더 추가 완료', { success, title, listName });
      await this.log(success ? 'ADD' : 'ADD_FAILED', 'reminder', title);
      return success;
    } catch (error: any) {
      await this.debugLog('ERROR', '리마인더 추가 실패', { error: error.message, title, listName });
      throw error;
    }
  }

  async removeReminder(listName: string, title: string): Promise<'success' | 'not_found' | 'failed'> {
    try {
      await this.debugLog('INFO', '리마인더 삭제 시작', { listName, title });
      const result = await this.execute(`
        tell application "Reminders"
          try
            set targetList to list "${listName}"
            set targetReminders to (reminders of targetList whose name is "${title}")
            if (count of targetReminders) > 0 then
              delete item 1 of targetReminders
              return "SUCCESS"
            else
              return "NOT_FOUND"
            end if
          on error
            return "FAILED"
          end try
        end tell
      `);

      let status: 'success' | 'not_found' | 'failed';
      if (result.includes('SUCCESS')) status = 'success';
      else if (result.includes('NOT_FOUND')) status = 'not_found';
      else status = 'failed';

      await this.debugLog('INFO', '리마인더 삭제 완료', { status, title, listName });
      await this.log(status === 'success' ? 'DELETE' : 'DELETE_FAILED', 'reminder', title);
      return status;
    } catch (error: any) {
      await this.debugLog('ERROR', '리마인더 삭제 실패', { error: error.message, title, listName });
      throw error;
    }
  }

  async validateCalendar(name: string): Promise<boolean> {
    try {
      await this.debugLog('INFO', '캘린더 유효성 검사 시작', { name });
      const calendars = await this.getCalendars();
      const isValid = calendars.includes(name);
      await this.debugLog('INFO', '캘린더 유효성 검사 완료', { name, isValid, availableCalendars: calendars });
      return isValid;
    } catch (error: any) {
      await this.debugLog('ERROR', '캘린더 유효성 검사 실패', { error: error.message, name });
      throw error;
    }
  }

  async validateReminderList(name: string): Promise<boolean> {
    try {
      await this.debugLog('INFO', '리마인더 목록 유효성 검사 시작', { name });
      const lists = await this.getReminderLists();
      const isValid = lists.includes(name);
      await this.debugLog('INFO', '리마인더 목록 유효성 검사 완료', { name, isValid, availableLists: lists });
      return isValid;
    } catch (error: any) {
      await this.debugLog('ERROR', '리마인더 목록 유효성 검사 실패', { error: error.message, name });
      throw error;
    }
  }

  private async parseEvents(output: string): Promise<CalendarEvent[]> {
    try {
      if (!output.trim()) {
        await this.debugLog('INFO', '일정 파싱 - 빈 출력', { output });
        return [];
      }
      
      const events = output.split(',')
        .filter(item => item.trim())
        .map(item => {
          const parts = item.split('|');
          return parts.length >= 5 ? {
            title: parts[0].trim(),
            startDate: parts[1].trim(),
            endDate: parts[2].trim(),
            calendar: parts[3].trim(),
            allDay: parts[4].trim() === 'true'
          } : null;
        })
        .filter(Boolean) as CalendarEvent[];
      
      await this.debugLog('INFO', '일정 파싱 완료', { 
        inputLength: output.length, 
        parsedCount: events.length,
        sampleEvent: events.length > 0 ? events[0] : null
      });
      
      return events;
    } catch (error: any) {
      await this.debugLog('ERROR', '일정 파싱 실패', { error: error.message, output: output.substring(0, 200) });
      return [];
    }
  }
} 