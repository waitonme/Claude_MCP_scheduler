#!/bin/bash

# Claude Desktop 설정 파일 경로
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
PROJECT_PATH="$(pwd)"

echo "🚀 Claude Desktop MCP 서버 설정을 시작합니다..."

# 1. 의존성 설치
echo "📦 npm 의존성을 설치합니다..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm 설치 실패"
        exit 1
    fi
    echo "✅ 의존성 설치 완료"
else
    echo "✅ 의존성이 이미 설치되어 있습니다"
fi

# 2. TypeScript 빌드 (필요한 경우)
echo "🔨 TypeScript 빌드를 확인합니다..."
if [ ! -d "dist" ]; then
    echo "📝 dist 폴더가 없습니다. TypeScript 컴파일을 시도합니다..."
    npx tsc
    if [ $? -ne 0 ]; then
        echo "⚠️  TypeScript 컴파일 실패 (tsx로 실행하므로 계속 진행)"
    else
        echo "✅ TypeScript 빌드 완료"
    fi
else
    echo "✅ 빌드된 파일이 이미 존재합니다"
fi

# 설정 파일이 존재하는지 확인
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📝 설정 파일이 없습니다. 새로 생성합니다..."
    mkdir -p "$(dirname "$CONFIG_FILE")"
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "scheduler-server": {
      "command": "npx",
      "args": [
        "tsx",
        "$PROJECT_PATH/src/index.ts"
      ]
    }
  },
  "globalShortcut": ""
}
EOF
    echo "✅ 설정 파일이 생성되었습니다: $CONFIG_FILE"
else
    echo "📋 기존 설정 파일을 확인합니다..."
    
    # mcpServers가 이미 존재하는지 확인
    if grep -q '"mcpServers"' "$CONFIG_FILE"; then
        echo "⚠️  mcpServers가 이미 존재합니다. 기존 설정을 백업하고 업데이트합니다..."
        
        # 백업 생성
        cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        echo "📦 백업 생성: ${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # scheduler-server가 이미 존재하는지 확인
        if grep -q '"scheduler-server"' "$CONFIG_FILE"; then
            echo "🔄 scheduler-server 설정을 업데이트합니다..."
            # jq를 사용하여 scheduler-server 설정만 업데이트
            jq --arg cmd "npx" --arg tsx "tsx" --arg path "$PROJECT_PATH/src/index.ts" \
               '.mcpServers."scheduler-server" = {"command": $cmd, "args": [$tsx, $path]}' \
               "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
        else
            echo "➕ scheduler-server 설정을 추가합니다..."
            # jq를 사용하여 scheduler-server 설정 추가
            jq --arg cmd "npx" --arg tsx "tsx" --arg path "$PROJECT_PATH/src/index.ts" \
               '.mcpServers."scheduler-server" = {"command": $cmd, "args": [$tsx, $path]}' \
               "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
        fi
    else
        echo "➕ mcpServers 섹션을 추가합니다..."
        # jq를 사용하여 mcpServers 섹션 추가
        jq --arg cmd "npx" --arg tsx "tsx" --arg path "$PROJECT_PATH/src/index.ts" \
           '.mcpServers = {"scheduler-server": {"command": $cmd, "args": [$tsx, $path]}}' \
           "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    fi
    
    echo "✅ 설정이 업데이트되었습니다."
fi

echo ""
echo "📋 최종 설정 내용:"
cat "$CONFIG_FILE" | jq '.'
echo ""
echo "🎉 MCP 서버 설정이 완료되었습니다!"

# 3. 초기 설정 확인 및 진행
echo ""
echo "🔧 초기 설정을 확인합니다..."
if [ ! -f "setting.json" ] || [ ! -s "setting.json" ]; then
    echo "📝 초기 설정이 필요합니다. 설정을 진행합니다..."
    
    # 서버를 한 번 실행해서 초기 설정 완료
    echo "🚀 서버를 시작하여 초기 설정을 완료합니다..."
    npm run setup || true
    
    echo "✅ 초기 설정이 완료되었습니다"
else
    echo "✅ 초기 설정이 이미 완료되어 있습니다"
fi

echo ""
echo "🎉 모든 설정이 완료되었습니다!"
echo "💡 Claude Desktop을 재시작하면 scheduler-server를 사용할 수 있습니다."
echo ""
echo "📋 사용 가능한 기능:"
echo "   - 일정 추가/삭제 (add_event/remove_event)"
echo "   - 할 일 추가/삭제 (add_reminder/remove_reminder)"
echo "   - 일정 조회 (get_today_events, get_year_events)"
echo "   - 연결 상태 확인 (check_calendar_connection)" 