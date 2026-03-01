#!/bin/bash
# LearningPhysics 统一管理脚本
# 用法: ./manage.sh [start|stop|restart|diagnose|init|status]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$PROJECT_ROOT/venv"
PYTHON="$VENV_DIR/bin/python3"
PIP="$VENV_DIR/bin/pip"

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

# 获取本机IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")

show_help() {
    echo "LearningPhysics 管理工具"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "有效命令:"
    echo "  start      后台启动前端和后端服务 (本地开发)"
    echo "  stop       停止所有项目相关进程 (本地开发)"
    echo "  prod       使用 Docker Compose 部署生产环境服务"
    echo "  prod-stop  使用 Docker Compose 停止生产环境服务"
    echo "  restart    重启所有开发服务"
    echo "  diagnose   运行系统诊断检查"
    echo "  init       初始化数据库和从 data/questions.json 导入题库 (本地开发)"
    echo "  status     查看服务运行状态"
    echo "  help       显示此帮助信息"
}

check_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        info "未发现虚拟环境，正在创建..."
        python3 -m venv "$VENV_DIR"
        $PIP install -r "$BACKEND_DIR/requirements.txt"
    fi
}

start_services() {
    check_venv
    info "正在清理旧进程..."
    stop_services --silent

    info "启动后端服务..."
    cd "$BACKEND_DIR"
    nohup "$PYTHON" main.py > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    info "启动前端服务..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!

    success "系统已启动！"
    echo -e "  前端地址: ${GREEN}http://${LOCAL_IP}:3000${NC}"
    echo -e "  后端地址: ${GREEN}http://${LOCAL_IP}:8000${NC}"
    echo -e "  后台管理: ${GREEN}http://${LOCAL_IP}:3000/admin${NC}"
    echo -e "  日志目录: $PROJECT_ROOT/logs/"
}

prod_services() {
    info "正在启动生产环境服务 (Docker Compose)..."
    cd "$PROJECT_ROOT"
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
    
    # 停止后端的 uvicorn/python 进程
    pkill -9 -f "python.*main.py" 2>/dev/null || true
    # 停止前端的 node/next 进程
    pkill -9 -f "next-server|next-dev" 2>/dev/null || true
    # 停止占用端口 8000 和 3000 的所有进程
    [ -n "$(lsof -ti:8000)" ] && lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    [ -n "$(lsof -ti:3000)" ] && lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
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
    BACKEND_PIDS=$(pgrep -f "python.*main.py" || true)
    FRONTEND_PIDS=$(pgrep -f "next-server|next-dev" || true)
    
    if [ -z "$BACKEND_PIDS" ] && [ -z "$FRONTEND_PIDS" ]; then
        echo -e "  所有服务均已${RED}停止${NC}"
        return 0
    fi

    if [ -n "$BACKEND_PIDS" ]; then
        echo -e "  后端: ${GREEN}运行中${NC} (PIDs: $BACKEND_PIDS)"
    else
        echo -e "  后端: ${RED}停止${NC}"
    fi

    if [ -n "$FRONTEND_PIDS" ]; then
        echo -e "  前端: ${GREEN}运行中${NC} (PIDs: $FRONTEND_PIDS)"
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
