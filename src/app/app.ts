import { ServerManager } from '../server/server-manager.js';

export class App {
  private serverManager: ServerManager;

  constructor() {
    this.serverManager = new ServerManager();
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes('--test-mode')) {
      await this.serverManager.testMode();
      process.exit(0);
    } else {
      await this.serverManager.initializeAndStart();
    }
  }

  static async create(): Promise<App> {
    return new App();
  }
} 