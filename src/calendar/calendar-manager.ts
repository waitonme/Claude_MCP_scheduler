import readline from 'readline';
import { CalendarCore } from '../core/calendar-core.js';
import { CalendarEvent, ConnectionStatus } from '../types.js';
import { Logger } from '../utils/logger.js';

export class CalendarManager {
  private core = new CalendarCore();

  async init(): Promise<void> {
    try {
      await this.core.debugLog('INFO', 'Calendar Manager 초기화 시작');
      
      await this.core.init();
      
      if (this.core.needsSetup()) {
        await this.core.debugLog('INFO', '설정이 필요함');
        await this.runSetup();
      } else {
        await this.core.debugLog('INFO', '기존 설정 검증 시작');
        await this.validateConfig();
      }
      
      await this.core.debugLog('INFO', 'Calendar Manager 초기화 완료');
    } catch (error: any) {
      await this.core.debugLog('ERROR', 'Calendar Manager 초기화 실패', { error: error.message });
      throw error;
    }
  }

  private async runSetup(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr // MCP에서는 stderr 사용
    });

    try {
      const [calendars, reminderLists] = await Promise.all([
        this.core.getCalendars(),
        this.core.getReminderLists()
      ]);

      const config = this.core.getConfig();

      // 캘린더 선택
      if (calendars.length > 0) {
        await this.core.debugLog('INFO', '캘린더 선택 시작', { availableCalendars: calendars });
        Logger.log('\n📅 캘린더 선택:');
        calendars.forEach((cal, i) => Logger.log(`  ${i + 1}. ${cal}`));
        Logger.log('  0. 건너뛰기');

        const choice = await this.question(rl, '선택 (번호): ');
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < calendars.length) {
          config.scheduleCalendar = calendars[index];
          await this.core.debugLog('INFO', '캘린더 선택됨', { selectedCalendar: config.scheduleCalendar });
        }
      }

      // 리마인더 선택
      if (reminderLists.length > 0) {
        await this.core.debugLog('INFO', '리마인더 선택 시작', { availableLists: reminderLists });
        Logger.log('\n📝 리마인더 선택:');
        reminderLists.forEach((list, i) => Logger.log(`  ${i + 1}. ${list}`));
        Logger.log('  0. 건너뛰기');

        const choice = await this.question(rl, '선택 (번호): ');
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < reminderLists.length) {
          config.reminderCalendar = reminderLists[index];
          await this.core.debugLog('INFO', '리마인더 선택됨', { selectedList: config.reminderCalendar });
        }
      }

      if (config.scheduleCalendar || config.reminderCalendar) {
        this.core.updateConfig(config);
        await this.core.saveConfig();
        await this.core.debugLog('INFO', '설정 완료', { config });
      }
    } finally {
      rl.close();
    }
  }

  private async validateConfig(): Promise<void> {
    const config = this.core.getConfig();
    const tasks = [];

    if (config.scheduleCalendar) {
      tasks.push(this.core.validateCalendar(config.scheduleCalendar));
    }
    if (config.reminderCalendar) {
      tasks.push(this.core.validateReminderList(config.reminderCalendar));
    }

    const results = await Promise.all(tasks);
    const allValid = results.every(Boolean);

          if (allValid) {
        const status = this.getConnectionStatus();
        await this.core.debugLog('INFO', '설정 유효', { status });
      } else {
        await this.core.debugLog('WARN', '설정이 무효함, 재설정 시작');
        this.core.updateConfig({});
        await this.runSetup();
      }
  }

  private question(rl: readline.Interface, prompt: string): Promise<string> {
    return new Promise(resolve => rl.question(prompt, resolve));
  }

  // Public API
  getConnectionStatus(): ConnectionStatus {
    return this.core.getStatus();
  }

  async getEvents(days?: number, maxEvents?: number): Promise<CalendarEvent[]> {
    try {
      const appConfig = this.core.getAppConfig();
      const actualDays = days ?? appConfig.defaultDays;
      const actualMaxEvents = maxEvents ?? appConfig.maxEvents;
      
      // days가 maxDays를 초과하면 maxDays로 제한
      const limitedDays = Math.min(actualDays, appConfig.maxDays);
      
      await this.core.debugLog('INFO', '일정 조회 시작', { 
        requestedDays: days, 
        actualDays: limitedDays, 
        requestedMaxEvents: maxEvents, 
        actualMaxEvents: actualMaxEvents 
      });
      
      const config = this.core.getConfig();
      if (!config.scheduleCalendar) {
        await this.core.debugLog('ERROR', '일정 캘린더 미설정');
        throw new Error('일정 캘린더 미설정');
      }
      
      const events = await this.core.getEvents(config.scheduleCalendar, limitedDays, actualMaxEvents);
      await this.core.debugLog('INFO', '일정 조회 완료', { 
        count: events.length, 
        days: limitedDays, 
        maxEvents: actualMaxEvents 
      });
      return events;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '일정 조회 실패', { 
        error: error.message, 
        days, 
        maxEvents 
      });
      throw error;
    }
  }

  async getReminders(days?: number, maxReminders?: number): Promise<CalendarEvent[]> {
    try {
      const appConfig = this.core.getAppConfig();
      const actualDays = days ?? appConfig.defaultDays;
      const actualMaxReminders = maxReminders ?? appConfig.maxEvents;
      
      // days가 maxDays를 초과하면 maxDays로 제한
      const limitedDays = Math.min(actualDays, appConfig.maxDays);
      
      await this.core.debugLog('INFO', '할일 조회 시작', { 
        requestedDays: days, 
        actualDays: limitedDays, 
        requestedMaxReminders: maxReminders, 
        actualMaxReminders: actualMaxReminders 
      });
      
      const config = this.core.getConfig();
      if (!config.reminderCalendar) {
        await this.core.debugLog('ERROR', '리마인더 미설정');
        throw new Error('리마인더 미설정');
      }
      
      const reminders = await this.core.getReminders(config.reminderCalendar, limitedDays, actualMaxReminders);
      await this.core.debugLog('INFO', '할일 조회 완료', { 
        count: reminders.length, 
        days: limitedDays, 
        maxReminders: actualMaxReminders 
      });
      return reminders;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '할일 조회 실패', { 
        error: error.message, 
        days, 
        maxReminders 
      });
      throw error;
    }
  }

  async getEventsAndReminders(days?: number, maxEvents?: number, maxReminders?: number): Promise<{
    events: CalendarEvent[];
    reminders: CalendarEvent[];
    hasEvents: boolean;
    hasReminders: boolean;
  }> {
    try {
      await this.core.debugLog('INFO', '일정 및 할일 통합 조회 시작', { days, maxEvents, maxReminders });
      
      const config = this.core.getConfig();
      const hasEvents = !!config.scheduleCalendar;
      const hasReminders = !!config.reminderCalendar;
      
      const results = await Promise.allSettled([
        hasEvents ? this.getEvents(days, maxEvents) : Promise.resolve([]),
        hasReminders ? this.getReminders(days, maxReminders) : Promise.resolve([])
      ]);
      
      const events = results[0].status === 'fulfilled' ? results[0].value : [];
      const reminders = results[1].status === 'fulfilled' ? results[1].value : [];
      
      await this.core.debugLog('INFO', '일정 및 할일 통합 조회 완료', { 
        eventsCount: events.length, 
        remindersCount: reminders.length,
        hasEvents,
        hasReminders
      });
      
      return {
        events,
        reminders,
        hasEvents,
        hasReminders
      };
    } catch (error: any) {
      await this.core.debugLog('ERROR', '일정 및 할일 통합 조회 실패', { 
        error: error.message, 
        days, 
        maxEvents, 
        maxReminders 
      });
      throw error;
    }
  }

  async addEvent(title: string, startDate: Date, endDate?: Date): Promise<string> {
    try {
      await this.core.debugLog('INFO', '일정 추가 시작', { title, startDate, endDate });
      const config = this.core.getConfig();
      if (!config.scheduleCalendar) {
        await this.core.debugLog('ERROR', '일정 캘린더 미설정');
        throw new Error('일정 캘린더 미설정');
      }
      
      const success = await this.core.addEvent(config.scheduleCalendar, title, startDate, endDate);
      const result = success ? `✅ 일정 추가됨: ${title}` : `❌ 일정 추가 실패: ${title}`;
      await this.core.debugLog(success ? 'INFO' : 'ERROR', '일정 추가 완료', { success, title, result });
      return result;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '일정 추가 실패', { error: error.message, title });
      throw error;
    }
  }

  async removeEvent(title: string): Promise<string> {
    try {
      await this.core.debugLog('INFO', '일정 삭제 시작', { title });
      const config = this.core.getConfig();
      if (!config.scheduleCalendar) {
        await this.core.debugLog('ERROR', '일정 캘린더 미설정');
        throw new Error('일정 캘린더 미설정');
      }
      
      const result = await this.core.removeEvent(config.scheduleCalendar, title);
      let message: string;
      switch (result) {
        case 'success': message = `✅ 일정 삭제됨: ${title}`; break;
        case 'not_found': message = `⚠️ 일정을 찾을 수 없음: ${title}`; break;
        default: message = `❌ 일정 삭제 실패: ${title}`; break;
      }
      
      await this.core.debugLog('INFO', '일정 삭제 완료', { result, title, message });
      return message;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '일정 삭제 실패', { error: error.message, title });
      throw error;
    }
  }

  async addReminder(title: string, dueDate?: Date): Promise<string> {
    try {
      await this.core.debugLog('INFO', '리마인더 추가 시작', { title, dueDate });
      const config = this.core.getConfig();
      if (!config.reminderCalendar) {
        await this.core.debugLog('ERROR', '리마인더 미설정');
        throw new Error('리마인더 미설정');
      }
      
      const success = await this.core.addReminder(config.reminderCalendar, title, dueDate);
      const result = success ? `✅ 리마인더 추가됨: ${title}` : `❌ 리마인더 추가 실패: ${title}`;
      await this.core.debugLog(success ? 'INFO' : 'ERROR', '리마인더 추가 완료', { success, title, result });
      return result;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '리마인더 추가 실패', { error: error.message, title });
      throw error;
    }
  }

  async removeReminder(title: string): Promise<string> {
    try {
      await this.core.debugLog('INFO', '리마인더 삭제 시작', { title });
      const config = this.core.getConfig();
      if (!config.reminderCalendar) {
        await this.core.debugLog('ERROR', '리마인더 미설정');
        throw new Error('리마인더 미설정');
      }
      
      const result = await this.core.removeReminder(config.reminderCalendar, title);
      let message: string;
      switch (result) {
        case 'success': message = `✅ 리마인더 삭제됨: ${title}`; break;
        case 'not_found': message = `⚠️ 리마인더를 찾을 수 없음: ${title}`; break;
        default: message = `❌ 리마인더 삭제 실패: ${title}`; break;
      }
      
      await this.core.debugLog('INFO', '리마인더 삭제 완료', { result, title, message });
      return message;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '리마인더 삭제 실패', { error: error.message, title });
      throw error;
    }
  }

  async addTestEvent(): Promise<string> {
    try {
      await this.core.debugLog('INFO', '테스트 일정 추가 시작');
      const now = new Date();
      const title = `테스트 일정 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const result = await this.addEvent(title, new Date(now.getTime() + 10 * 60 * 1000));
      await this.core.debugLog('INFO', '테스트 일정 추가 완료', { title, result });
      return result;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '테스트 일정 추가 실패', { error: error.message });
      throw error;
    }
  }

  async addTestReminder(): Promise<string> {
    try {
      await this.core.debugLog('INFO', '테스트 리마인더 추가 시작');
      const now = new Date();
      const title = `테스트 리마인더 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const result = await this.addReminder(title, new Date(now.getTime() + 2 * 60 * 60 * 1000));
      await this.core.debugLog('INFO', '테스트 리마인더 추가 완료', { title, result });
      return result;
    } catch (error: any) {
      await this.core.debugLog('ERROR', '테스트 리마인더 추가 실패', { error: error.message });
      throw error;
    }
  }
} 
 