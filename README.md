# Claude MCP Calendar Server

Claude Desktop에서 사용할 수 있는 캘린더 및 리마인더 관리 MCP 서버입니다.

## 🚀 빠른 시작

### 1. 프로젝트 클론
```bash
git clone https://github.com/waitonme/Claude_MCP_scheduler.git
cd Claude_MCP_scheduler
```

### 2. 자동 설정 실행
```bash
chmod +x setup_mcp.sh
./setup_mcp.sh
```

이 스크립트는 다음을 자동으로 처리합니다:
- npm 의존성 설치
- TypeScript 빌드
- Claude Desktop MCP 설정
- 초기 캘린더/리마인더 설정

### 3. Claude Desktop 재시작
Claude Desktop을 재시작하면 `scheduler-server`를 사용할 수 있습니다.

## 🔧 수동 설정 방법

자동 설정 스크립트를 사용하지 않는 경우, 다음 단계로 수동 설정할 수 있습니다:

### 1. 의존성 설치
```bash
npm install
```

### 2. TypeScript 빌드
```bash
npx tsc
```

### 3. Claude Desktop 설정 파일 수정
Claude Desktop 설정 파일을 수정합니다:
```bash
# 설정 파일 경로
~/Library/Application Support/Claude/claude_desktop_config.json
```

다음 내용을 `mcpServers` 섹션에 추가:
```json
{
  "mcpServers": {
    "scheduler-server": {
      "command": "npx",
      "args": ["tsx", "/path/to/your/project/src/index.ts"]
    }
  }
}
```

### 4. 초기 설정 실행
```bash
npm run setup
```

### 5. Claude Desktop 재시작
Claude Desktop을 재시작하면 scheduler-server를 사용할 수 있습니다.

## 📋 사용 가능한 기능

### 일정 관리
- **일정 추가**: 특정 시간에 진행되는 일정(약속, 회의, 이벤트)을 캘린더에 추가
- **일정 삭제**: 기존 일정을 삭제 (정확한 제목 필요)
- **일정 조회**: 오늘, 이번 주, 이번 달, 1년 등 원하는 기간의 일정 조회

### 할 일 관리
- **할 일 추가**: 시간이 정해지지 않은 작업이나 체크리스트를 리마인더에 추가
- **할 일 삭제**: 기존 할 일을 삭제 (정확한 제목 필요)
- **할 일 조회**: 오늘, 이번 주, 이번 달 등 원하는 기간의 할 일 조회




## ⚙️ 설정 파일

### `setting.json`
캘린더 및 리마인더 설정 파일
```json
{
  "scheduleCalendar": "캘린더명",
  "reminderCalendar": "리마인더목록명"
}
```

### `config.json`
시스템 동작 설정 파일
```json
{
  "maxEvents": 1000,
  "defaultDays": 1,
  "maxDays": 365
}
```
- **maxEvents**: 한 번에 조회할 수 있는 최대 일정/할 일 개수
- **defaultDays**: 기본 조회 기간 (일수)
- **maxDays**: 조회 가능한 최대 기간 (일수)

### 로그 파일
- `activity.log`: 일정 및 작업 추가/삭제 이력
- `debug.log`: 시스템 오류 및 디버그 정보


## 📝 라이선스

MIT License 