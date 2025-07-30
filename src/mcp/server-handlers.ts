import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CalendarManager } from '../calendar/calendar-manager.js';

export function setupServerHandlers(server: Server, calendarManager: CalendarManager): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'check_calendar_connection',
          description: '캘린더 및 리마인더 연결 상태를 확인합니다. 설정이 완료되었는지, 어떤 캘린더/리마인더가 연결되어 있는지 확인할 수 있습니다.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_events',
          description: '일정을 조회합니다. 특정 기간의 일정을 확인할 수 있습니다. 💡 AI 판단 가이드: 오늘 일정은 days=1, 이번 주는 days=7, 이번 달은 days=30을 사용하세요.',
          inputSchema: { 
            type: 'object', 
            properties: {
              days: { type: 'number', description: '조회할 일수 (기본: 1일)', default: 1 },
              maxEvents: { type: 'number', description: '최대 이벤트 수 (기본: config.json에서 가져옴)', default: undefined }
            }
          },
        },
        {
          name: 'get_reminders',
          description: '할일을 조회합니다. 특정 기간의 할일을 확인할 수 있습니다. 💡 AI 판단 가이드: 오늘 할일은 days=1, 이번 주는 days=7, 이번 달은 days=30을 사용하세요.',
          inputSchema: { 
            type: 'object', 
            properties: {
              days: { type: 'number', description: '조회할 일수 (기본: 1일)', default: 1 },
              maxReminders: { type: 'number', description: '최대 할일 수 (기본: config.json에서 가져옴)', default: undefined }
            }
          },
        },
        {
          name: 'get_events_and_reminders',
          description: '일정과 할일을 함께 조회합니다. 설정된 캘린더/리마인더만 조회합니다. 💡 AI 판단 가이드: 전체적인 일정과 할일을 한 번에 확인하고 싶을 때 사용하세요.',
          inputSchema: { 
            type: 'object', 
            properties: {
              days: { type: 'number', description: '조회할 일수 (기본: 1일)', default: 1 },
              maxEvents: { type: 'number', description: '최대 일정 수 (기본: config.json에서 가져옴)', default: undefined },
              maxReminders: { type: 'number', description: '최대 할일 수 (기본: config.json에서 가져옴)', default: undefined }
            }
          },
        },
        {
          name: 'add_event',
          description: '특정 시간에 진행되는 일정(약속, 회의, 이벤트)을 캘린더에 추가합니다. 💡 AI 판단 가이드: 시간이 정해진 일정에 사용하세요. 예: 미팅, 약속, 수업, 회의, 이벤트, 생일 등',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '일정 제목' },
              startDate: { type: 'string', description: 'ISO 형식 시작 시간 (예: 2024-01-01T14:00:00)' },
              endDate: { type: 'string', description: 'ISO 형식 종료 시간 (선택, 없으면 1시간 후로 설정)' }
            },
            required: ['title', 'startDate']
          },
        },
        {
          name: 'remove_event',
          description: '일정을 삭제합니다. ⚠️ 정확한 제목이 필요합니다. 💡 AI 판단 가이드: 방금 추가한 항목이면 → 바로 삭제 시도, 기존 항목이거나 불확실하면 → 먼저 조회 후 정확한 제목 확인하고 삭제',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '삭제할 일정 제목 (정확히 일치해야 함)' }
            },
            required: ['title']
          },
        },
        {
          name: 'add_reminder',
          description: '할 일, 작업, 태스크를 리마인더에 추가합니다. 💡 AI 판단 가이드: 시간이 정해지지 않은 작업이나 체크리스트에 사용하세요. 예: 공부하기, 과제하기, 정리하기, 쇼핑하기, 운동하기 등',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '할 일 제목' },
              dueDate: { type: 'string', description: 'ISO 형식 마감일 (선택, 없으면 마감일 없음)' }
            },
            required: ['title']
          },
        },
        {
          name: 'remove_reminder',
          description: '리마인더를 삭제합니다. ⚠️ 정확한 제목이 필요합니다. 💡 AI 판단 가이드: 방금 추가한 항목이면 → 바로 삭제 시도, 기존 항목이거나 불확실하면 → 먼저 조회 후 정확한 제목 확인하고 삭제',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '삭제할 리마인더 제목 (정확히 일치해야 함)' }
            },
            required: ['title']
          },
        },
        {
          name: 'add_test_event',
          description: '테스트용 일정을 추가합니다. 💡 AI 판단 가이드: 시스템이 제대로 작동하는지 확인하고 싶을 때 사용하세요. 10분 후에 시작되는 테스트 일정이 추가됩니다.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'add_test_reminder',
          description: '테스트용 리마인더를 추가합니다. 💡 AI 판단 가이드: 시스템이 제대로 작동하는지 확인하고 싶을 때 사용하세요. 2시간 후 마감인 테스트 할일이 추가됩니다.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'check_calendar_connection': {
          const status = calendarManager.getConnectionStatus();
          return {
            content: [{
              type: 'text',
              text: `🔗 캘린더 및 리마인더 연결 상태\n\n📅 일정 캘린더: ${status.scheduleCalendarConnected ? '✅ 연결됨' : '❌ 미연결'}\n📝 리마인더 목록: ${status.reminderCalendarConnected ? '✅ 연결됨' : '❌ 미연결'}\n\n${status.scheduleCalendarConnected ? `일정 캘린더명: ${status.scheduleCalendarName}` : ''}\n${status.reminderCalendarConnected ? `리마인더 목록명: ${status.reminderCalendarName}` : ''}`
            }]
          };
        }

        case 'get_events': {
          const { days, maxEvents } = args as any;
          const events = await calendarManager.getEvents(days, maxEvents);
          const periodText = days === 1 ? '오늘' : days === 365 ? '연간' : `${days}일간`;
          return {
            content: [{
              type: 'text',
              text: `📅 ${periodText} 일정 (${events.length}개)\n\n${
                events.length === 0 ? '일정이 없습니다.' : 
                events.slice(0, 10).map((evt: any) => `• ${evt.title}\n  ⏰ ${evt.startDate}${evt.allDay ? ' (종일)' : ''}`).join('\n\n') +
                (events.length > 10 ? `\n... 및 ${events.length - 10}개 더` : '')
              }`
            }]
          };
        }

        case 'get_reminders': {
          const { days, maxReminders } = args as any;
          const reminders = await calendarManager.getReminders(days, maxReminders);
          const periodText = days === 1 ? '오늘' : days === 365 ? '연간' : `${days}일간`;
          return {
            content: [{
              type: 'text',
              text: `📝 ${periodText} 할일 (${reminders.length}개)\n\n${
                reminders.length === 0 ? '할일이 없습니다.' : 
                reminders.slice(0, 10).map((rem: any) => `• ${rem.title}\n  📅 ${rem.startDate}`).join('\n\n') +
                (reminders.length > 10 ? `\n... 및 ${reminders.length - 10}개 더` : '')
              }`
            }]
          };
        }

        case 'get_events_and_reminders': {
          const { days, maxEvents, maxReminders } = args as any;
          const result = await calendarManager.getEventsAndReminders(days, maxEvents, maxReminders);
          const periodText = days === 1 ? '오늘' : days === 365 ? '연간' : `${days}일간`;
          
          let text = `📋 ${periodText} 일정 및 할일\n\n`;
          
          if (result.hasEvents) {
            text += `📅 일정 (${result.events.length}개)\n`;
            if (result.events.length === 0) {
              text += '일정이 없습니다.\n\n';
            } else {
              text += result.events.slice(0, 5).map((evt: any) => `• ${evt.title}\n  ⏰ ${evt.startDate}${evt.allDay ? ' (종일)' : ''}`).join('\n\n');
              if (result.events.length > 5) text += `\n... 및 ${result.events.length - 5}개 더`;
              text += '\n\n';
            }
          }
          
          if (result.hasReminders) {
            text += `📝 할일 (${result.reminders.length}개)\n`;
            if (result.reminders.length === 0) {
              text += '할일이 없습니다.\n\n';
            } else {
              text += result.reminders.slice(0, 5).map((rem: any) => `• ${rem.title}\n  📅 ${rem.startDate}`).join('\n\n');
              if (result.reminders.length > 5) text += `\n... 및 ${result.reminders.length - 5}개 더`;
              text += '\n\n';
            }
          }
          
          if (!result.hasEvents && !result.hasReminders) {
            text += '❌ 설정된 캘린더나 리마인더가 없습니다.';
          }
          
          return {
            content: [{
              type: 'text',
              text: text.trim()
            }]
          };
        }

        case 'add_event': {
          const { title, startDate, endDate } = args as any;
          const start = new Date(startDate);
          const end = endDate ? new Date(endDate) : undefined;
          const result = await calendarManager.addEvent(title, start, end);
          return { content: [{ type: 'text', text: result }] };
        }

        case 'remove_event': {
          const { title } = args as any;
          const result = await calendarManager.removeEvent(title);
          return { content: [{ type: 'text', text: result }] };
        }

        case 'add_reminder': {
          const { title, dueDate } = args as any;
          const due = dueDate ? new Date(dueDate) : undefined;
          const result = await calendarManager.addReminder(title, due);
          return { content: [{ type: 'text', text: result }] };
        }

        case 'remove_reminder': {
          const { title } = args as any;
          const result = await calendarManager.removeReminder(title);
          return { content: [{ type: 'text', text: result }] };
        }

        case 'add_test_event': {
          const result = await calendarManager.addTestEvent();
          return { content: [{ type: 'text', text: result }] };
        }

        case 'add_test_reminder': {
          const result = await calendarManager.addTestReminder();
          return { content: [{ type: 'text', text: result }] };
        }

        default:
          throw new Error(`알 수 없는 도구: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ 오류 발생: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  });
} 