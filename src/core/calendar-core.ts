import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CalendarConfig, CalendarEvent, ConnectionStatus } from '../types.js';
import { Logger } from '../utils/logger.js';

const execAsync = promisify(exec);

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CalendarCore {
  private config: CalendarConfig = {};
  private readonly configPath = path.join(__dirname, '..', '..', 'setting.json');
  private readonly logPath = path.join(__dirname, '..', '..', 'activity.log');

  async loadConfig(): Promise<CalendarConfig> {
    try {
      Logger.info(`설정 파일 로드 시도: ${this.configPath}`);
      const data = await fs.readFile(this.configPath, 'utf-8');
      
      if (!data.trim()) {
        Logger.info('빈 설정 파일 발견, 초기화합니다.');
        this.config = {};
        await this.saveConfig();
        return this.config;
      }

      try {
        this.config = JSON.parse(data);
        Logger.success('설정 로드 완료');
      } catch (parseError) {
        Logger.error(`JSON 파싱 오류: ${parseError}`);
        Logger.info('손상된 설정 파일을 백업하고 초기화합니다.');
        
        const backupPath = `${this.configPath}.backup.${Date.now()}`;
        await fs.copyFile(this.configPath, backupPath);
        Logger.info(`백업 생성: ${backupPath}`);
        
        this.config = {};
        await this.saveConfig();
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        Logger.info('설정 파일이 없습니다. 새로 생성합니다.');
        this.config = {};
        await this.saveConfig();
      } else {
        Logger.error(`설정 파일 읽기 오류: ${error.message}`);
        this.config = {};
      }
    }
    return this.config;
  }

  async saveConfig(): Promise<void> {
    try {
      const configJson = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configJson);
      Logger.success('설정 저장 완료');
    } catch (error) {
      Logger.error(`설정 저장 실패: ${error}`);
      throw error;
    }
  }

  updateConfig(updates: Partial<CalendarConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): CalendarConfig {
    return { ...this.config };
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

  private async execute(script: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
      
      if (stderr && stderr.trim()) {
        Logger.warning(`AppleScript 경고: ${stderr}`);
      }
      
      return stdout.trim();
    } catch (error: any) {
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
    const output = await this.execute(`
      tell application "Calendar"
        set names to {}
        repeat with cal in calendars
          set end of names to (title of cal)
        end repeat
        return names
      end tell
    `);
    return output ? output.split(',').map(name => name.trim().replace(/"/g, '')) : [];
  }

  async getReminderLists(): Promise<string[]> {
    const output = await this.execute(`
      tell application "Reminders"
        set names to {}
        repeat with lst in lists
          set end of names to (name of lst)
        end repeat
        return names
      end tell
    `);
    return output ? output.split(',').map(name => name.trim().replace(/"/g, '')) : [];
  }

  async getEvents(calendarName: string, days = 1, maxEvents = 1000): Promise<CalendarEvent[]> {
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

    return this.parseEvents(output);
  }

  async addEvent(calendarName: string, title: string, startDate: Date, endDate?: Date): Promise<boolean> {
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
    await this.log(success ? 'ADD' : 'ADD_FAILED', 'event', title);
    return success;
  }

  async removeEvent(calendarName: string, title: string): Promise<'success' | 'not_found' | 'failed'> {
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

    await this.log(status === 'success' ? 'DELETE' : 'DELETE_FAILED', 'event', title);
    return status;
  }

  async addReminder(listName: string, title: string, dueDate?: Date): Promise<boolean> {
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
    await this.log(success ? 'ADD' : 'ADD_FAILED', 'reminder', title);
    return success;
  }

  async removeReminder(listName: string, title: string): Promise<'success' | 'not_found' | 'failed'> {
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

    await this.log(status === 'success' ? 'DELETE' : 'DELETE_FAILED', 'reminder', title);
    return status;
  }

  async validateCalendar(name: string): Promise<boolean> {
    const calendars = await this.getCalendars();
    return calendars.includes(name);
  }

  async validateReminderList(name: string): Promise<boolean> {
    const lists = await this.getReminderLists();
    return lists.includes(name);
  }

  private parseEvents(output: string): CalendarEvent[] {
    if (!output.trim()) return [];
    
    return output.split(',')
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
  }
} 