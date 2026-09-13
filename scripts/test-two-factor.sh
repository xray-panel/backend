#!/usr/bin/env bash
# Интеграционная проверка двухфакторной аутентификации (TOTP) на живом стенде.
#
# Устроена так же, как scripts/test-admin-api.sh: те же приёмы с curl, тот же
# заголовок X-XLADA-Client-Type: browser (без него браузерный JWT получает
# 403), та же переменная XLADA_ADMIN_PASSWORD.
#
# Сценарий: статус выключен -> setup выдаёт секрет -> неверный код не включает
# второй фактор -> верный код включает -> вход теперь требует второй фактор ->
# 2fa/login с неверным кодом падает, с верным выдаёт токен -> disable по коду
# выключает второй фактор обратно.
#
# Верные TOTP-коды считаются локально тем же алгоритмом RFC 6238
# (HMAC-SHA1, 30 секунд, 6 цифр), что и apps/backend/src/common/helpers/totp.
#
# Использование:
#   XLADA_BASE_URL=https://panel.example.com \
#   XLADA_ADMIN_PASSWORD='...' \
#   bash scripts/test-two-factor.sh
#
# ВНИМАНИЕ: включает и выключает второй фактор на реальном стенде. Секрет
# печатается в консоль — по нему стенд можно восстановить вручную. Если
# второй фактор уже включён до запуска, скрипт отказывается работать.

set -Eeuo pipefail

BASE_URL="${XLADA_BASE_URL:-https://panel.kitten443.dev}"
ADMIN_PASSWORD="${XLADA_ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_PASSWORD" ]]; then
    echo "ОШИБКА: не задан XLADA_ADMIN_PASSWORD" >&2
    exit 1
fi

PASS=0
FAIL=0
TOTP_SECRET=""
TWO_FACTOR_ENABLED_BY_TEST=0

check() {
    local name="$1" actual="$2" expected="$3"
    if [[ "$actual" == "$expected" ]]; then
        echo "OK   $name"
        PASS=$((PASS + 1))
    else
        echo "FAIL $name: ожидалось '$expected', получено '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

# HTTP-код для произвольного запроса. Тело — в $BODY_FILE.
req() {
    local method="$1" path="$2" token="${3:-}" data="${4:-}"
    # Панель обращается к API с браузерным JWT, а JwtDefaultGuard пускает такие
    # токены только при наличии этого заголовка — без него будет 403.
    local args=(-s -o "$BODY_FILE" -w '%{http_code}' -X "$method" "$BASE_URL$path")
    args+=(-H 'X-XLADA-Client-Type: browser')
    [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
    if [[ -n "$data" ]]; then
        args+=(-H 'Content-Type: application/json' -d "$data")
    fi
    curl "${args[@]}"
}

BODY_FILE="$(mktemp)"

json() {
    python3 -c "import json,sys;d=json.load(open('$BODY_FILE'));print(eval(sys.argv[1],{'d':d}))" "$1" 2>/dev/null || echo "<нет поля>"
}

# Текущий TOTP-код по секрету base32 — RFC 6238, HMAC-SHA1, окно 30 с, 6 цифр.
# Точно тот же алгоритм, что в apps/backend/src/common/helpers/totp/totp.ts.
totp_code() {
    python3 - "$1" <<'PYEOF'
import base64, hashlib, hmac, struct, sys, time

secret = sys.argv[1].replace(' ', '').upper()
key = base64.b32decode(secret + '=' * (-len(secret) % 8))
counter = int(time.time()) // 30
digest = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
offset = digest[-1] & 0x0F
binary = struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF
print(str(binary % 10**6).zfill(6))
PYEOF
}

cleanup() {
    # Второй фактор, включённый тестом, не должен остаться на стенде даже при
    # падении: код для отключения вычисляется из напечатанного секрета.
    if [[ "$TWO_FACTOR_ENABLED_BY_TEST" == "1" && -n "${TOKEN:-}" && -n "$TOTP_SECRET" ]]; then
        local code
        code="$(totp_code "$TOTP_SECRET")"
        req POST /api/auth/2fa/disable "$TOKEN" "{\"code\":\"$code\"}" >/dev/null 2>&1 || true
    fi
    rm -f "$BODY_FILE"
}
trap cleanup EXIT

echo "стенд: $BASE_URL"

echo
echo "== вход суперадмина =="
CODE=$(req POST /api/auth/login "" "{\"username\":\"superadmin\",\"password\":\"$ADMIN_PASSWORD\"}")
check "вход суперадмина" "$CODE" "200"
check "второй фактор пока не требуется" "$(json "d['response']['twoFactorRequired']")" "False"
check "билета нет" "$(json "d['response']['twoFactorTicket'] is None")" "True"
TOKEN=$(json "d['response']['accessToken']")
if [[ "$TOKEN" == "<нет поля>" || "$TOKEN" == "None" ]]; then
    echo "ОШИБКА: не удалось получить токен. Если второй фактор уже включён," >&2
    echo "скрипт не должен запускаться: отключите его вручную через панель." >&2
    exit 1
fi

echo
echo "== статус второго фактора =="
CODE=$(req GET /api/auth/2fa/status "$TOKEN")
check "GET /api/auth/2fa/status" "$CODE" "200"
check "второй фактор выключен" "$(json "d['response']['isEnabled']")" "False"

CODE=$(req GET /api/auth/2fa/status "")
check "статус без токена — 401" "$CODE" "401"

echo
echo "== setup: генерация секрета =="
CODE=$(req POST /api/auth/2fa/setup "$TOKEN")
check "POST /api/auth/2fa/setup" "$CODE" "200"
TOTP_SECRET=$(json "d['response']['secret']")
check "секрет выдан" "$([[ "$TOTP_SECRET" != "<нет поля>" && -n "$TOTP_SECRET" ]] && echo yes)" "yes"
check "otpauth-адрес выдан" "$(json "d['response']['otpauthUrl'].startswith('otpauth://totp/')")" "True"
echo "секрет для восстановления вручную: $TOTP_SECRET"

echo
echo "== verify: неверный код не включает второй фактор =="
CODE=$(req POST /api/auth/2fa/verify "$TOKEN" "{\"code\":\"000000\"}")
check "неверный код отклонён" "$CODE" "400"
check "код ошибки — A269" "$(json "d['errorCode']")" "A269"

CODE=$(req GET /api/auth/2fa/status "$TOKEN")
check "второй фактор всё ещё выключен" "$(json "d['response']['isEnabled']")" "False"

echo
echo "== verify: верный код включает второй фактор =="
VALID_CODE=$(totp_code "$TOTP_SECRET")
CODE=$(req POST /api/auth/2fa/verify "$TOKEN" "{\"code\":\"$VALID_CODE\"}")
check "верный код принят" "$CODE" "200"
check "isEnabled в ответе — true" "$(json "d['response']['isEnabled']")" "True"
TWO_FACTOR_ENABLED_BY_TEST=1

CODE=$(req GET /api/auth/2fa/status "$TOKEN")
check "статус теперь включён" "$(json "d['response']['isEnabled']")" "True"

CODE=$(req POST /api/auth/2fa/setup "$TOKEN")
check "повторный setup отклонён (409)" "$CODE" "409"
check "код ошибки — A267" "$(json "d['errorCode']")" "A267"

echo
echo "== вход теперь требует второй фактор =="
CODE=$(req POST /api/auth/login "" "{\"username\":\"superadmin\",\"password\":\"$ADMIN_PASSWORD\"}")
check "вход с паролем — 200" "$CODE" "200"
check "требуется второй фактор" "$(json "d['response']['twoFactorRequired']")" "True"
check "токен доступа не выдан" "$(json "d['response']['accessToken'] is None")" "True"
TICKET=$(json "d['response']['twoFactorTicket']")
check "билет выдан" "$([[ "$TICKET" != "<нет поля>" && -n "$TICKET" && "$TICKET" != "None" ]] && echo yes)" "yes"

# Билет не должен работать как токен доступа: он подписан другим секретом.
CODE=$(req GET /api/auth/2fa/status "$TICKET")
check "билет не годится как access-токен" "$CODE" "401"

echo
echo "== 2fa/login =="
CODE=$(req POST /api/auth/2fa/login "" "{\"ticket\":\"$TICKET\",\"code\":\"000000\"}")
check "неверный код — 400" "$CODE" "400"
check "код ошибки — A269" "$(json "d['errorCode']")" "A269"

CODE=$(req POST /api/auth/2fa/login "" "{\"ticket\":\"bogus\",\"code\":\"123456\"}")
check "битый билет — 400" "$CODE" "400"
check "код ошибки — A270" "$(json "d['errorCode']")" "A270"

VALID_CODE=$(totp_code "$TOTP_SECRET")
CODE=$(req POST /api/auth/2fa/login "" "{\"ticket\":\"$TICKET\",\"code\":\"$VALID_CODE\"}")
check "верный код — 200" "$CODE" "200"
TOTP_TOKEN=$(json "d['response']['accessToken']")
check "токен доступа выдан" "$([[ "$TOTP_TOKEN" != "<нет поля>" && -n "$TOTP_TOKEN" && "$TOTP_TOKEN" != "None" ]] && echo yes)" "yes"

CODE=$(req GET /api/auth/2fa/status "$TOTP_TOKEN")
check "токен из 2fa/login работает" "$CODE" "200"

echo
echo "== disable =="
CODE=$(req POST /api/auth/2fa/disable "$TOKEN" "{\"code\":\"000000\"}")
check "disable с неверным кодом — 400" "$CODE" "400"

VALID_CODE=$(totp_code "$TOTP_SECRET")
CODE=$(req POST /api/auth/2fa/disable "$TOKEN" "{\"code\":\"$VALID_CODE\"}")
check "disable с верным кодом — 200" "$CODE" "200"
check "isEnabled в ответе — false" "$(json "d['response']['isEnabled']")" "False"
TWO_FACTOR_ENABLED_BY_TEST=0

CODE=$(req GET /api/auth/2fa/status "$TOKEN")
check "статус снова выключен" "$(json "d['response']['isEnabled']")" "False"

echo
echo "== вход снова обычный =="
CODE=$(req POST /api/auth/login "" "{\"username\":\"superadmin\",\"password\":\"$ADMIN_PASSWORD\"}")
check "вход — 200" "$CODE" "200"
check "второй фактор не требуется" "$(json "d['response']['twoFactorRequired']")" "False"
check "токен выдан" "$([[ "$(json "d['response']['accessToken']")" != "None" ]] && echo yes)" "yes"

echo
echo "пройдено $PASS, провалено $FAIL"
[[ "$FAIL" -eq 0 ]]
