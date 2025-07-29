import readline from 'readline';
import { CalendarCore } from '../core/calendar-core.js';
import { CalendarEvent, ConnectionStatus } from '../types.js';
import { Logger } from '../utils/logger.js';

export class CalendarManager {
  private core = new CalendarCore();

  async init(): Promise<void> {
    Logger.section('Calendar Manager 초기화');
    
    await this.core.loadConfig();
    
    if (this.core.needsSetup()) {
      Logger.info('설정이 필요합니다');
      await this.runSetup();
    } else {
      await this.validateConfig();
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
        Logger.log('\n📅 캘린더 선택:');
        calendars.forEach((cal, i) => Logger.log(`  ${i + 1}. ${cal}`));
        Logger.log('  0. 건너뛰기');

        const choice = await this.question(rl, '선택 (번호): ');
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < calendars.length) {
          config.scheduleCalendar = calendars[index];
          Logger.success(`일정 캘린더: ${config.scheduleCalendar}`);
        }
      }

      // 리마인더 선택
      if (reminderLists.length > 0) {
        Logger.log('\n📝 리마인더 선택:');
        reminderLists.forEach((list, i) => Logger.log(`  ${i + 1}. ${list}`));
        Logger.log('  0. 건너뛰기');

        const choice = await this.question(rl, '선택 (번호): ');
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < reminderLists.length) {
          config.reminderCalendar = reminderLists[index];
          Logger.success(`리마인더: ${config.reminderCalendar}`);
        }
      }

      if (config.scheduleCalendar || config.reminderCalendar) {
        this.core.updateConfig(config);
        await this.core.saveConfig();
        Logger.success('설정 완료!');
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
      Logger.success('설정 유효');
      const status = this.getConnectionStatus();
      if (status.scheduleCalendarConnected) Logger.log(`📅 ${status.scheduleCalendarName}`);
      if (status.reminderCalendarConnected) Logger.log(`📝 ${status.reminderCalendarName}`);
    } else {
      Logger.warning('설정이 무효합니다. 재설정합니다.');
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

  async getTodayEvents(): Promise<CalendarEvent[]> {
    const config = this.core.getConfig();
    if (!config.scheduleCalendar) throw new Error('일정 캘린더 미설정');
    return this.core.getEvents(config.scheduleCalendar, 1);
  }

  async getYearEvents(maxEvents = 1000): Promise<CalendarEvent[]> {
    const config = this.core.getConfig();
    if (!config.scheduleCalendar) throw new Error('일정 캘린더 미설정');
    return this.core.getEvents(config.scheduleCalendar, 365, maxEvents);
  }

  async addEvent(title: string, startDate: Date, endDate?: Date): Promise<string> {
    const config = this.core.getConfig();
    if (!config.scheduleCalendar) throw new Error('일정 캘린더 미설정');
    
    const success = await this.core.addEvent(config.scheduleCalendar, title, startDate, endDate);
    return success ? `✅ 일정 추가됨: ${title}` : `❌ 일정 추가 실패: ${title}`;
  }

  async removeEvent(title: string): Promise<string> {
    const config = this.core.getConfig();
    if (!config.scheduleCalendar) throw new Error('일정 캘린더 미설정');
    
    const result = await this.core.removeEvent(config.scheduleCalendar, title);
    switch (result) {
      case 'success': return `✅ 일정 삭제됨: ${title}`;
      case 'not_found': return `⚠️ 일정을 찾을 수 없음: ${title}`;
      default: return `❌ 일정 삭제 실패: ${title}`;
    }
  }

  async addReminder(title: string, dueDate?: Date): Promise<string> {
    const config = this.core.getConfig();
    if (!config.reminderCalendar) throw new Error('리마인더 미설정');
    
    const success = await this.core.addReminder(config.reminderCalendar, title, dueDate);
    return success ? `✅ 리마인더 추가됨: ${title}` : `❌ 리마인더 추가 실패: ${title}`;
  }

  async removeReminder(title: string): Promise<string> {
    const config = this.core.getConfig();
    if (!config.reminderCalendar) throw new Error('리마인더 미설정');
    
    const result = await this.core.removeReminder(config.reminderCalendar, title);
    switch (result) {
      case 'success': return `✅ 리마인더 삭제됨: ${title}`;
      case 'not_found': return `⚠️ 리마인더를 찾을 수 없음: ${title}`;
      default: return `❌ 리마인더 삭제 실패: ${title}`;
    }
  }

  async addTestEvent(): Promise<string> {
    const now = new Date();
    const title = `테스트 일정 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    return this.addEvent(title, new Date(now.getTime() + 10 * 60 * 1000));
  }

  async addTestReminder(): Promise<string> {
    const now = new Date();
    const title = `테스트 리마인더 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    return this.addReminder(title, new Date(now.getTime() + 2 * 60 * 60 * 1000));
  }
} 
 