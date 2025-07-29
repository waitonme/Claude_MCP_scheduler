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

## ⚙️ 설정 파일

- `setting.json`: 캘린더 및 리마인더 설정
- `activity.log`: 일정 및 작업 추가삭제 이력


## 📝 라이선스

MIT License 