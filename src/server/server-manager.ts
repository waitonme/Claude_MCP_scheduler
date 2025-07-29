import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CalendarManager } from '../calendar/calendar-manager.js';
import { setupServerHandlers } from '../mcp/server-handlers.js';
import { Logger } from '../utils/logger.js';

export class ServerManager {
  private server: Server;
  private calendarManager: CalendarManager;

  constructor() {
    this.server = new Server({
      name: 'interactive-calendar-server',
      version: '1.0.0',
    });
    this.calendarManager = new CalendarManager();
  }

  async initialize(): Promise<void> {
    // MCP 서버에서는 stdout을 JSON-RPC 전용으로 사용해야 하므로
    // 초기화 메시지는 stderr로 출력
    Logger.section('Interactive Apple Calendar MCP Server');
    
    // 캘린더 매니저 초기화
    await this.calendarManager.init();
    
    // MCP 핸들러 설정
    setupServerHandlers(this.server, this.calendarManager);
  }

  async start(): Promise<void> {
    // MCP 서버 시작
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    Logger.success('MCP Server running on stdio');
  }

  async initializeAndStart(): Promise<void> {
    await this.initialize();
    await this.start();
  }

  async testMode(): Promise<void> {
    await this.initialize();
    Logger.info('테스트 모드로 종료합니다.');
  }
} 