#!/bin/bash

# ==============================================================================
#  LearningPhysics - 一键启动开发环境脚本
# ==============================================================================
#
# 功能：
#   - 检查必要依赖 (Docker, Node.js, Python)
#   - 自动启动 Docker 数据库容器
#   - 自动创建并激活 Python 虚拟环境
#   - 可选: 自动安装后端/前端依赖 (使用 --install 参数)
#   - 后台启动后端, 前台启动前端
#   - Ctrl+C 时优雅关闭所有服务
#
# 用法:
#   bash start.sh           # 正常启动
#   bash start.sh --install # 启动前先安装所有依赖
#
# ==============================================================================

set -e

# --- 颜色定义 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- 辅助函数 ---
info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}==> $1${NC}"; }

INSTALL_DEPS=false
if [[ "$1" == "--install" ]]; then
    INSTALL_DEPS=true
fi

# 获取脚本所在目录 (项目根目录)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

backend_pid=""

# --- 清理函数 (Ctrl+C 时调用) ---
cleanup() {
    echo ""
    step "正在关闭所有服务..."
    if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
        kill "$backend_pid" 2>/dev/null
        success "后端服务已停止 (PID: $backend_pid)"
    fi
    success "前端服务已停止"
    success "开发环境已干净退出"
    exit 0
}
trap cleanup EXIT INT TERM

# ==============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   ⚛  LearningPhysics 开发环境启动器     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# --- Step 1: 检查依赖 ---
step "检查依赖..."

if ! command -v docker &>/dev/null; then
    error "Docker 未安装。请先安装 Docker: https://docs.docker.com/get-docker/"
fi
success "Docker 已安装: $(docker --version | head -1)"

if ! command -v python3 &>/dev/null; then
    error "Python3 未安装。请先安装 Python 3.11+。"
fi
success "Python3 已安装: $(python3 --version)"

if ! command -v node &>/dev/null; then
    error "Node.js 未安装。请先安装 Node.js 18+: https://nodejs.org/"
fi
success "Node.js 已安装: $(node --version)"

if ! command -v npm &>/dev/null; then
    error "npm 未找到。请检查 Node.js 安装。"
fi
success "npm 已安装: $(npm --version)"

# --- Step 2: 启动 Docker 数据库 ---
step "检查数据库容器 (learningphysics_db)..."

if ! docker info &>/dev/null; then
    error "Docker 未启动，请先启动 Docker Desktop 或 Docker 服务。"
fi

if docker ps --filter "name=learningphysics_db" --format "{{.Names}}" | grep -q "learningphysics_db"; then
    success "数据库容器已在运行"
else
    warn "数据库容器未运行，正在启动..."
    if docker ps -a --filter "name=learningphysics_db" --format "{{.Names}}" | grep -q "learningphysics_db"; then
        docker start learningphysics_db &>/dev/null
        success "已重启现有容器 learningphysics_db"
    else
        info "使用 docker-compose 创建并启动数据库..."
        (cd "$SCRIPT_DIR" && docker-compose up -d)
        success "数据库容器已通过 docker-compose 创建并启动"
    fi
    info "等待数据库就绪..."
    sleep 3
fi

# --- Step 3: 配置后端虚拟环境 ---
step "配置后端 Python 虚拟环境..."

VENV_DIR="$SCRIPT_DIR/backend/venv"
if [ ! -d "$VENV_DIR" ]; then
    info "创建虚拟环境 backend/venv ..."
    python3 -m venv "$VENV_DIR"
    success "虚拟环境创建完成"
    INSTALL_DEPS=true  # 首次创建，强制安装依赖
else
    success "虚拟环境已存在"
fi

# 激活虚拟环境
source "$VENV_DIR/bin/activate"
success "虚拟环境已激活: $VIRTUAL_ENV"

# --- Step 4: 检查 .env 文件 ---
step "检查后端配置文件..."
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    warn ".env 文件不存在，正在从 .env.example 创建..."
    cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
    warn "请编辑 backend/.env 并填入您的 API 密钥!"
else
    success "backend/.env 配置文件已存在"
fi

# --- Step 5: 安装依赖 (可选) ---
if [ "$INSTALL_DEPS" = true ]; then
    step "安装后端依赖 (pip)..."
    pip install -r "$SCRIPT_DIR/backend/requirements.txt" -q
    success "后端依赖安装完成"

    step "安装前端依赖 (npm)..."
    (cd "$SCRIPT_DIR/frontend" && npm install --silent)
    success "前端依赖安装完成"
else
    info "跳过依赖安装 (使用 --install 参数可强制重新安装)"
fi

# --- Step 6: 启动后端 ---
step "启动后端服务 (http://localhost:8000)..."
(cd "$SCRIPT_DIR/backend" && python main.py) &
backend_pid=$!
info "后端进程 PID: $backend_pid"

# 等待后端启动
sleep 3

# 验证后端是否成功启动
if ! kill -0 "$backend_pid" 2>/dev/null; then
    error "后端启动失败！请检查 backend/.env 配置或数据库连接。"
fi
success "后端服务已在 http://localhost:8000 启动"
info "API 文档: http://localhost:8000/docs"
info "健康检查: http://localhost:8000/health"

# --- Step 7: 启动前端 ---
step "启动前端服务 (http://localhost:3000)..."
echo ""
echo -e "${GREEN}${BOLD}✅ 所有服务启动完毕！${NC}"
echo -e "   前端: ${CYAN}http://localhost:3000${NC}"
echo -e "   后端: ${CYAN}http://localhost:8000${NC}"
echo -e "   API文档: ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}   按 Ctrl+C 停止所有服务${NC}"
echo ""

(cd "$SCRIPT_DIR/frontend" && npm run dev)
