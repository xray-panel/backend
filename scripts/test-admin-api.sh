#!/usr/bin/env bash
# Интеграционная проверка API управления администраторами на живом стенде.
#
# Проверяет полный жизненный цикл: вход суперадмином, список, создание второго
# администратора, вход под ним (доказывает, что хеш пароля совместим),
# смена пароля, удаление и защиты от опасных удалений.
#
# Использование:
#   XLADA_BASE_URL=https://panel.example.com \
#   XLADA_ADMIN_PASSWORD='...' \
#   bash scripts/test-admin-api.sh
#
# ВНИМАНИЕ: создаёт и удаляет временного администратора на реальном стенде.

set -Eeuo pipefail

BASE_URL="${XLADA_BASE_URL:-https://panel.kitten443.dev}"
ADMIN_PASSWORD="${XLADA_ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_PASSWORD" ]]; then
    echo "ОШИБКА: не задан XLADA_ADMIN_PASSWORD" >&2
    exit 1
fi

PASS=0
FAIL=0
TMP_ADMIN="tempadmin$$"
TMP_PASSWORD='TempAdminVerify2026SecurePass!'
NEW_PASSWORD='TempAdminChanged2026SecurePass!'
TMP_UUID=""

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
trap 'rm -f "$BODY_FILE"' EXIT

cleanup() {
    # Временный администратор не должен остаться на стенде даже при падении теста.
    if [[ -n "$TMP_UUID" && -n "${TOKEN:-}" ]]; then
        req DELETE "/api/admins/$TMP_UUID" "$TOKEN" >/dev/null 2>&1 || true
    fi
}
trap 'cleanup; rm -f "$BODY_FILE"' EXIT

json() {
    python3 -c "import json,sys;d=json.load(open('$BODY_FILE'));print(eval(sys.argv[1],{'d':d}))" "$1" 2>/dev/null || echo "<нет поля>"
}

echo "стенд: $BASE_URL"

echo
echo "== вход суперадмина =="
CODE=$(req POST /api/auth/login "" "{\"username\":\"superadmin\",\"password\":\"$ADMIN_PASSWORD\"}")
check "вход суперадмина" "$CODE" "200"
TOKEN=$(json "d['response']['accessToken']")
if [[ "$TOKEN" == "<нет поля>" ]]; then
    echo "ОШИБКА: не удалось получить токен, дальше проверять нечего" >&2
    exit 1
fi

echo
echo "== список администраторов =="
CODE=$(req GET /api/admins "$TOKEN")
check "GET /api/admins" "$CODE" "200"
check "в списке ровно один администратор" "$(json "len(d['response']['admins'])")" "1"
check "первый администратор — superadmin" "$(json "d['response']['admins'][0]['username']")" "superadmin"
check "хеш пароля не утекает" "$(json "'passwordHash' in d['response']['admins'][0] or 'password' in d['response']['admins'][0]")" "False"
check "секрет TOTP не утекает" "$(json "'totpSecret' in d['response']['admins'][0]")" "False"
ORIGINAL_UUID=$(json "d['response']['admins'][0]['uuid']")

echo
echo "== создание администратора: отказ на слабом пароле =="
CODE=$(req POST /api/admins "$TOKEN" "{\"username\":\"$TMP_ADMIN\",\"password\":\"short\"}")
check "слабый пароль отклонён" "$CODE" "400"

CODE=$(req POST /api/admins "$TOKEN" "{\"username\":\"ab\",\"password\":\"$TMP_PASSWORD\"}")
check "слишком короткий логин отклонён" "$CODE" "400"

echo
echo "== создание администратора =="
CODE=$(req POST /api/admins "$TOKEN" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$TMP_PASSWORD\"}")
check "создание администратора" "$CODE" "201"
TMP_UUID=$(json "d['response']['uuid']")
check "в ответе нет хеша пароля" "$(json "'passwordHash' in d['response']")" "False"

CODE=$(req POST /api/admins "$TOKEN" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$TMP_PASSWORD\"}")
check "повтор логина отклонён (409)" "$CODE" "409"

CODE=$(req GET /api/admins "$TOKEN")
check "теперь администраторов двое" "$(json "len(d['response']['admins'])")" "2"

echo
echo "== вход под новым администратором =="
CODE=$(req POST /api/auth/login "" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$TMP_PASSWORD\"}")
check "новый администратор может войти" "$CODE" "200"
TMP_TOKEN=$(json "d['response']['accessToken']")

CODE=$(req POST /api/auth/login "" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$NEW_PASSWORD\"}")
check "неверный пароль отклонён" "$CODE" "403"

echo
echo "== смена пароля =="
CODE=$(req PATCH "/api/admins/$TMP_UUID" "$TOKEN" "{\"password\":\"$NEW_PASSWORD\"}")
check "смена пароля" "$CODE" "200"

CODE=$(req POST /api/auth/login "" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$NEW_PASSWORD\"}")
check "вход с новым паролем" "$CODE" "200"

CODE=$(req POST /api/auth/login "" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$TMP_PASSWORD\"}")
check "старый пароль больше не работает" "$CODE" "403"

echo
echo "== защиты =="
# Себя удалять нельзя: иначе администратор отрезает себе доступ к панели.
CODE=$(req DELETE "/api/admins/$ORIGINAL_UUID" "$TOKEN")
check "нельзя удалить себя (400)" "$CODE" "400"
check "код ошибки — A266" "$(json "d['errorCode']")" "A266"

# Контрольная проверка: запрет на самоудаление не должен удалять учётную запись.
CODE=$(req GET /api/admins "$TOKEN")
check "основной администратор не пострадал" "$CODE" "200"
check "основной администратор всё ещё в списке" \
    "$(json "any(a['uuid'] == '$ORIGINAL_UUID' for a in d['response']['admins'])")" "True"

# Временного администратора удалять пока нельзя: он ещё нужен дальше.
# Ни один запрос в этом файле не должен обращаться к $ORIGINAL_UUID
# иначе как «удалить себя» — проверять удаление чужой учётной записи
# на основном администраторе стенда недопустимо.

CODE=$(req DELETE /api/admins/00000000-0000-0000-0000-000000000000 "$TOKEN")
check "несуществующий администратор — 404" "$CODE" "404"
check "код ошибки — A065" "$(json "d['errorCode']")" "A065"

CODE=$(req PATCH /api/admins/00000000-0000-0000-0000-000000000000 "$TOKEN" "{\"password\":\"$NEW_PASSWORD\"}")
check "смена пароля у несуществующего — 404" "$CODE" "404"

CODE=$(req GET /api/admins "")
check "без токена — 401" "$CODE" "401"

echo
echo "== удаление =="
CODE=$(req DELETE "/api/admins/$TMP_UUID" "$TOKEN")
check "удаление временного администратора" "$CODE" "200"
TMP_UUID=""

CODE=$(req GET /api/admins "$TOKEN")
check "снова один администратор" "$(json "len(d['response']['admins'])")" "1"

# Токен удалённого администратора перестаёт работать сразу: гард заново
# проверяет, что учётная запись ещё существует.
CODE=$(req GET /api/admins "$TMP_TOKEN")
check "токен удалённого администратора не работает" "$CODE" "403"

CODE=$(req POST /api/auth/login "" "{\"username\":\"$TMP_ADMIN\",\"password\":\"$NEW_PASSWORD\"}")
check "удалённый администратор войти не может" "$CODE" "403"

echo
echo "пройдено $PASS, провалено $FAIL"
[[ "$FAIL" -eq 0 ]]
