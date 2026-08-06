#!/bin/bash
# 完整登录测试脚本
# 用法: bash login_test.sh [admin|test|demo]

set -e

ACCOUNT="${1:-admin}"
BASE_URL="http://localhost:8080/api/v1"

case "$ACCOUNT" in
  admin)
    USERNAME="admin"
    PASSWORD="admin123"
    ;;
  test)
    USERNAME="test"
    PASSWORD="admin123"
    ;;
  demo)
    USERNAME="demo"
    PASSWORD="demo123"
    ;;
  *)
    echo "未知账号: $ACCOUNT"
    echo "用法: bash login_test.sh [admin|test|demo]"
    exit 1
    ;;
esac

echo "================================"
echo "  账号密码登录测试"
echo "  账号: $USERNAME"
echo "================================"
echo ""

# Step 1: 获取验证码，拿到真实 uuid
echo "[Step 1] 获取验证码..."
RESP=$(curl -s "$BASE_URL/auth/code")
echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"

UUID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['uuid'])")
IMG=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['img'])")

echo ""
echo "  UUID: $UUID"
echo ""

# Step 2: 解析 SVG 数学题
echo "[Step 2] 解析数学验证码..."

# 从 SVG 中提取数学表达式，例如 "8+3=" → 答案 11
# svg-captcha createMathExpr 将表达式放在 SVG text 内容里
ANSWER=$(echo "$IMG" | python3 -c "
import sys, re, html
svg = sys.stdin.read()

# 提取 <text> 标签中的内容（SVG 中的数学表达式）
texts = re.findall(r'<text[^>]*>([^<]+)</text>', svg)
if texts:
    expr = ''.join(texts).strip()
    print(expr)
else:
    # 备用方案：提取所有数字和运算符
    content = re.sub(r'<[^>]+>', ' ', svg)
    tokens = re.findall(r'[\d+\-=]', content)
    expr = ''.join(tokens).strip()
    print(expr)
")

echo "  验证码表达式: $ANSWER"

# 计算答案
RESULT=$(echo "$ANSWER" | python3 -c "
import sys
expr = sys.stdin.read().strip().rstrip('=')
print(int(eval(expr)))
")

echo "  计算结果: $RESULT"
echo ""

# Step 3: 执行登录
echo "[Step 3] 执行登录..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/login" \
  -H 'Content-Type: application/json' \
  -d "{\"code\":\"$RESULT\",\"userName\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"uuid\":\"$UUID\"}")

echo "$LOGIN_RESP" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESP"

# 检查结果
HTTP_CODE=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ 登录成功!"
    # 提取 token
    TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)
    echo "  Token: ${TOKEN:0:50}..."
else
    MSG=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('msg','unknown'))" 2>/dev/null)
    echo ""
    echo "❌ 登录失败: $MSG (code=$HTTP_CODE)"
fi
