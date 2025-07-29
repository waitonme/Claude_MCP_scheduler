#!/usr/bin/env node

import { CalendarManager } from '../calendar/calendar-manager.js';
import fs from 'fs/promises';

class Test {
  private manager = new CalendarManager();

  async run(): Promise<void> {
    console.log('🧪 캘린더 테스트\n');

    await this.manager.init();
    
    const tests = [
      { name: 'CRUD 테스트', fn: () => this.testCRUD() },
      { name: '조회 테스트', fn: () => this.testQueries() },
      { name: '로그 테스트', fn: () => this.testLogs() }
    ];

    for (const test of tests) {
      console.log(`\n📋 ${test.name}`);
      console.log('-'.repeat(30));
      try {
        await test.fn();
      } catch (error) {
        console.log(`❌ ${error}`);
      }
    }

    console.log('\n✅ 테스트 완료');
  }

  private async testCRUD(): Promise<void> {
    const testTitle = `테스트_${Date.now()}`;
    
    try {
      // 이벤트 CRUD
      console.log(await this.manager.addEvent(testTitle, new Date(Date.now() + 60 * 60 * 1000)));
      console.log(await this.manager.removeEvent(testTitle));
      
      // 리마인더 CRUD
      console.log(await this.manager.addReminder(testTitle, new Date(Date.now() + 60 * 60 * 1000)));
      console.log(await this.manager.removeReminder(testTitle));
    } catch (error) {
      console.log(`CRUD 테스트 실패: ${error}`);
    }
  }

  private async testQueries(): Promise<void> {
    try {
      const todayEvents = await this.manager.getTodayEvents();
      console.log(`📅 오늘 일정: ${todayEvents.length}개`);
      
      const yearEvents = await this.manager.getYearEvents(10);
      console.log(`📅 연간 일정: ${yearEvents.length}개 (최대 10개)`);
    } catch (error) {
      console.log(`조회 테스트 실패: ${error}`);
    }
  }

  private async testLogs(): Promise<void> {
    try {
      const logs = await fs.readFile('activity.log', 'utf-8');
      const lines = logs.split('\n').filter(line => line.trim());
      console.log(`📝 로그 항목: ${lines.length}개`);
      if (lines.length > 0) {
        console.log(`최근: ${lines[lines.length - 1]}`);
      }
    } catch {
      console.log('📝 로그 파일 없음');
    }
  }
}

new Test().run(); 