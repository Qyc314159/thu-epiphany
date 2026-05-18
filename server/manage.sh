#!/bin/bash
# 学习圈服务管理脚本
# 用法: TOKEN=sk_fox_xxx ./manage.sh {start|stop|status|flush|restart|token}

PORT=${PORT:-18999}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="$SCRIPT_DIR/server.js"

case "$1" in
  start)
    echo "🚀 启动服务 (port $PORT)..."
    nohup node "$SERVER" > /tmp/learning-circle-server.log 2>&1 &
    echo "PID: $!"
    sleep 2
    curl -s http://localhost:$PORT/api/health | python3 -m json.tool
    ;;
  stop)
    echo "🛑 停止服务..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    echo "已停止"
    ;;
  status)
    if lsof -ti:$PORT > /dev/null 2>&1; then
      echo "✅ 服务运行中"
      curl -s http://localhost:$PORT/api/health | python3 -m json.tool
    else
      echo "❌ 服务未运行"
    fi
    ;;
  restart)
    $0 stop; sleep 1; $0 start
    ;;
  token)
    shift; node "$SCRIPT_DIR/token.js" "$@"
    ;;
  scan)
    node "$SCRIPT_DIR/literature-search.js" "$2"
    ;;
  *)
    echo "用法: $0 {start|stop|status|restart|token|scan}"
    echo "  token: $0 token generate|list|revoke|validate ..."
    echo "  scan:  $0 scan [--dry-run|--force]"
    ;;
esac
