#!/bin/bash
# LearningPhysics 统一管理脚本
# 本地开发请使用: start|stop|restart|diagnose|init|status
# 生产部署请使用: prod|prod-stop

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$PROJECT_ROOT/venv"
PYTHON="$VENV_DIR/bin/python3"
PIP="$VENV_DIR/bin/pip"
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

get_local_ip() {
    local ip=""
    ip=$(ipconfig getifaddr en0 2>/dev/null || true)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null || true)
    fi
    if [ -z "$ip" ] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)
    fi
    echo "${ip:-localhost}"
}

LOCAL_IP=$(get_local_ip)

show_help() {
    echo "LearningPhysics 管理工具"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "说明:"
    echo "  - start/stop/restart/status/diagnose/init 仅用于本地开发"
    echo "  - prod/prod-stop 用于生产部署"
    echo ""
    echo "有效命令:"
    echo "  start      后台启动前端和后端服务 (仅本地开发)"
    echo "  stop       停止所有项目相关进程 (仅本地开发)"
    echo "  prod       使用 Docker Compose 部署生产环境服务"
    echo "  prod-stop  使用 Docker Compose 停止生产环境服务"
    echo "  restart    重启所有开发服务 (仅本地开发)"
    echo "  diagnose   运行系统诊断检查 (仅本地开发)"
    echo "  init       初始化数据库和从 data/questions.json 导入题库 (仅本地开发)"
    echo "  status     查看服务运行状态 (仅本地开发)"
    echo "  help       显示此帮助信息"
}

check_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        info "未发现虚拟环境，正在创建..."
        python3 -m venv "$VENV_DIR"
        $PIP install -r "$BACKEND_DIR/requirements.txt"
    fi
}

wait_for_http() {
    local url="$1"
    local name="$2"
    local retries="${3:-30}"
    local delay="${4:-1}"

    for ((i=1; i<=retries; i++)); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            success "$name 已就绪"
            return 0
        fi
        sleep "$delay"
    done

    return 1
}

launch_detached() {
    local log_file="$1"
    shift

    if command -v setsid >/dev/null 2>&1; then
        setsid "$@" </dev/null >> "$log_file" 2>&1 &
    else
        nohup "$@" </dev/null >> "$log_file" 2>&1 &
        disown || true
    fi

    echo $!
}

is_pid_running() {
    local pid="$1"
    if [ -z "$pid" ]; then
        return 1
    fi
    kill -0 "$pid" 2>/dev/null
}

start_backend() {
    info "启动后端服务..."
    (
        cd "$BACKEND_DIR"
        launch_detached "$BACKEND_LOG" "$PYTHON" main.py > "$BACKEND_PID_FILE"
    )
}

start_frontend() {
    info "启动前端服务..."
    (
        cd "$FRONTEND_DIR"
        launch_detached "$FRONTEND_LOG" npm run dev > "$FRONTEND_PID_FILE"
    )
}

show_recent_logs() {
    local log_file="$1"
    if [ -f "$log_file" ]; then
        tail -n 40 "$log_file"
    fi
}

start_services() {
    check_venv
    info "正在清理旧进程..."
    stop_services --silent

    mkdir -p "$LOG_DIR"
    : > "$BACKEND_LOG"
    : > "$FRONTEND_LOG"

    start_backend
    if ! wait_for_http "http://127.0.0.1:8000/health" "后端服务"; then
        error "后端启动失败。最近日志如下:\n$(show_recent_logs "$BACKEND_LOG")"
    fi

    start_frontend
    if ! wait_for_http "http://127.0.0.1:3000/" "前端服务"; then
        error "前端启动失败。最近日志如下:\n$(show_recent_logs "$FRONTEND_LOG")"
    fi

    success "系统已启动！"
    echo -e "  前端地址: ${GREEN}http://${LOCAL_IP}:3000${NC}"
    echo -e "  后端地址: ${GREEN}http://${LOCAL_IP}:8000${NC}"
    echo -e "  后台管理: ${GREEN}http://${LOCAL_IP}:3000/admin${NC}"
    echo -e "  日志目录: $LOG_DIR/"
}

prod_services() {
    info "正在启动生产环境服务 (Docker Compose)..."
    cd "$PROJECT_ROOT"
    export APP_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    export BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
    docker compose -f docker-compose.prod.yml up -d --build
    success "Docker 容器已启动！"
    info "提示: 如果是首次启动，您可能需要进入 backend 容器执行初始化:"
    echo -e "  ${YELLOW}docker exec -it learningphysics_backend_prod python init_system.py${NC}"
}

prod_stop() {
    info "正在停止生产环境服务 (Docker Compose)..."
    cd "$PROJECT_ROOT"
    docker compose -f docker-compose.prod.yml down
    success "Docker 容器已停止!"
}

stop_services() {
    if [ "$1" != "--silent" ]; then info "停止所有服务..."; fi

    if [ -f "$BACKEND_PID_FILE" ]; then
        kill -9 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null || true
        rm -f "$BACKEND_PID_FILE"
    fi
    if [ -f "$FRONTEND_PID_FILE" ]; then
        kill -9 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
        rm -f "$FRONTEND_PID_FILE"
    fi

    [ -n "$(lsof -ti:8000 2>/dev/null)" ] && lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    [ -n "$(lsof -ti:3000 2>/dev/null)" ] && lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    if [ "$1" != "--silent" ]; then success "服务已停止"; fi
}

diagnose() {
    info "运行系统诊断..."
    
    # 后端检查
    if curl -s http://localhost:8000/health | grep -q "ok"; then
        echo -e "  [后端] ${GREEN}✓ 运行中${NC}"
    else
        echo -e "  [后端] ${RED}✗ 未响应${NC}"
    fi

    # 前端检查
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "  [前端] ${GREEN}✓ 运行中${NC}"
    else
        echo -e "  [前端] ${RED}✗ 未响应${NC}"
    fi

    # 数据库检查 (通过 python 脚本简单测试)
    cd "$BACKEND_DIR"
    if "$PYTHON" -c "from app.db.session import async_engine; print('OK')" &>/dev/null; then
        echo -e "  [数据库] ${GREEN}✓ 连接正常${NC}"
    else
        echo -e "  [数据库] ${RED}✗ 连接失败${NC}"
    fi
}

init_data() {
    check_venv
    info "初始化系统数据和题库..."
    cd "$BACKEND_DIR"
    # 初始化核心系统数据
    "$PYTHON" init_system.py
    # 导入题库 (默认从根目录 data/ 导入)
    PYTHONPATH=. "$PYTHON" import_questions.py "$PROJECT_ROOT/data/questions.json"
    success "数据初始化完成"
}

status() {
    echo -e "\n服务状态:"
    BACKEND_PID=$(cat "$BACKEND_PID_FILE" 2>/dev/null || true)
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)
    BACKEND_OK=""
    FRONTEND_OK=""

    if is_pid_running "$BACKEND_PID" && curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
        BACKEND_OK="1"
    fi
    if is_pid_running "$FRONTEND_PID" && curl -fsS "http://127.0.0.1:3000/" >/dev/null 2>&1; then
        FRONTEND_OK="1"
    fi
    
    if [ -z "$BACKEND_OK" ] && [ -z "$FRONTEND_OK" ]; then
        echo -e "  所有服务均已${RED}停止${NC}"
        return 0
    fi

    if [ -n "$BACKEND_OK" ]; then
        echo -e "  后端: ${GREEN}运行中${NC} (PID: $BACKEND_PID)"
    else
        echo -e "  后端: ${RED}停止${NC}"
    fi

    if [ -n "$FRONTEND_OK" ]; then
        echo -e "  前端: ${GREEN}运行中${NC} (PID: $FRONTEND_PID)"
    else
        echo -e "  前端: ${RED}停止${NC}"
    fi
}

case "$1" in
    start)    start_services ;;
    stop)     stop_services ;;
    prod)     prod_services ;;
    prod-stop) prod_stop ;;
    restart)  stop_services; sleep 1; start_services ;;
    diagnose) diagnose ;;
    init)     init_data ;;
    status)   status ;;
    help|*)   show_help ;;
esac
