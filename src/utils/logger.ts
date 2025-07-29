export class Logger {
  // MCP 서버에서는 stdout을 JSON-RPC 전용으로 사용해야 하므로
  // 모든 일반 로그는 stderr로 출력
  static log(message: string): void {
    console.error(message); // stderr로 출력
  }

  static info(message: string): void {
    console.error(`ℹ️ ${message}`);
  }

  static success(message: string): void {
    console.error(`✅ ${message}`);
  }

  static warning(message: string): void {
    console.error(`⚠️ ${message}`);
  }

  static error(message: string): void {
    console.error(`❌ ${message}`);
  }

  static section(title: string): void {
    console.error(`\n📋 ${title}`);
    console.error('-'.repeat(40));
  }
} 