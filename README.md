# Claude MCP Calendar Server

Claude Desktop에서 사용할 수 있는 캘린더 및 리마인더 관리 MCP 서버입니다.

## 🚀 빠른 시작

### 1. 프로젝트 클론
```bash
git clone <repository-url>
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

## 📋 사용 가능한 기능

### 일정 관리
- **add_event**: 특정 시간에 진행되는 일정(약속, 회의, 이벤트) 추가
- **remove_event**: 일정 삭제
- **get_today_events**: 오늘의 일정 조회
- **get_year_events**: 1년간의 일정 조회

### 할 일 관리
- **add_reminder**: 할 일, 작업, 태스크 추가
- **remove_reminder**: 할 일 삭제

### 시스템
- **check_calendar_connection**: 캘린더 및 리마인더 연결 상태 확인

## 🔧 수동 설정

### 의존성 설치
```bash
npm install
```

### TypeScript 빌드
```bash
npx tsc
```

### MCP 서버 실행
```bash
npx tsx src/index.ts
```

## 📁 프로젝트 구조

```
src/
├── app/           # 애플리케이션 메인
├── calendar/      # 캘린더 관리
├── core/          # 핵심 기능
├── mcp/           # MCP 서버 핸들러
├── server/        # 서버 관리
├── utils/         # 유틸리티
└── types.ts       # 타입 정의
```

## ⚙️ 설정 파일

- `setting.json`: 캘린더 및 리마인더 설정
- `activity.log`: 활동 로그

## 🐛 문제 해결

### 권한 오류
Calendar/Reminders 앱에 대한 접근 권한이 필요합니다


## 📝 라이선스

MIT License 