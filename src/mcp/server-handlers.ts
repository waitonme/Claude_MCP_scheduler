import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CalendarManager } from '../calendar/calendar-manager.js';

export function setupServerHandlers(server: Server, calendarManager: CalendarManager): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'check_calendar_connection',
          description: '캘린더 및 리마인더 연결 상태를 확인합니다',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_today_events',
          description: '오늘의 일정을 가져옵니다',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'get_year_events',
          description: '1년간의 일정을 가져옵니다 (최대 1000개)',
          inputSchema: { 
            type: 'object', 
            properties: {
              maxEvents: { type: 'number', description: '최대 이벤트 수 (기본: 1000)', default: 1000 }
            }
          },
        },
        {
          name: 'add_event',
          description: '특정 시간에 진행되는 일정(약속, 회의, 이벤트)을 캘린더에 추가합니다. 예: 미팅, 약속, 수업, 회의, 이벤트 등',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '일정 제목' },
              startDate: { type: 'string', description: 'ISO 형식 시작 시간' },
              endDate: { type: 'string', description: 'ISO 형식 종료 시간 (선택)' }
            },
            required: ['title', 'startDate']
          },
        },
        {
          name: 'remove_event',
          description: '일정을 삭제합니다',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '삭제할 일정 제목' }
            },
            required: ['title']
          },
        },
        {
          name: 'add_reminder',
          description: '할 일, 작업, 태스크를 리마인더에 추가합니다. 예: 공부하기, 과제하기, 정리하기, 쇼핑하기 등',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '할 일 제목' },
              dueDate: { type: 'string', description: 'ISO 형식 마감일 (선택)' }
            },
            required: ['title']
          },
        },
        {
          name: 'remove_reminder',
          description: '리마인더를 삭제합니다',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '삭제할 리마인더 제목' }
            },
            required: ['title']
          },
        },
        {
          name: 'add_test_event',
          description: '테스트용 일정을 추가합니다',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'add_test_reminder',
          description: '테스트용 리마인더를 추가합니다',
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

        case 'get_today_events': {
          const events = await calendarManager.getTodayEvents();
          return {
            content: [{
              type: 'text',
              text: `📅 오늘의 일정 (${events.length}개)\n\n${
                events.length === 0 ? '일정이 없습니다.' : 
                events.map(evt => `• ${evt.title}\n  ⏰ ${evt.startDate}${evt.allDay ? ' (종일)' : ''}`).join('\n\n')
              }`
            }]
          };
        }

        case 'get_year_events': {
          const maxEvents = (args as any)?.maxEvents || 1000;
          const events = await calendarManager.getYearEvents(maxEvents);
          return {
            content: [{
              type: 'text',
              text: `📅 연간 일정 (${events.length}개)\n\n${
                events.length === 0 ? '일정이 없습니다.' : 
                events.slice(0, 10).map(evt => `• ${evt.title} (${evt.startDate})`).join('\n') +
                (events.length > 10 ? `\n... 및 ${events.length - 10}개 더` : '')
              }`
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