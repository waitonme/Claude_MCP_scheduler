#!/usr/bin/env node

import { App } from './app/app.js';

async function main() {
  try {
    const isTestMode = process.argv.includes('--test-mode');
    
    if (isTestMode) {
      console.log('🧪 테스트 모드로 실행 중...');
      const app = await App.create();
      await app.run();
      console.log('✅ 테스트 모드 완료');
      process.exit(0);
    } else {
      const app = await App.create();
      await app.run();
    }
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

main();