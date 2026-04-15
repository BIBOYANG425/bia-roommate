# George Tirebiter — Manual Test Plan

> Covers the 4 unchecked items from the PR test plan.
> Run these against a local dev instance (`cd george && npm run dev`).

---

## Prerequisites

```bash
# 1. Copy env and fill in real keys
cp george/.env.example george/.env

# 2. Required env vars
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WECHAT_TOKEN=your-wechat-token
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...
ADMIN_TOKEN=test-admin-secret

# 3. Optional (for iMessage tests)
IMESSAGE_API_KEY=...
IMESSAGE_SERVER_URL=http://localhost:1234

# 4. Start server
cd george && npm run dev
# Expect: "🐕 George Tirebiter is haunting port 3001..."
```

---

## Test 1: Send WeChat message → George responds in character

**What:** Simulate a WeChat user sending a text message and verify George replies in-character.

### Steps

1. **Verify WeChat endpoint is up** (signature verification / echo check):
   ```bash
   # Generate valid signature
   TOKEN="your-wechat-token"
   TIMESTAMP=$(date +%s)
   NONCE="test123"
   ECHOSTR="hello"
   SIGNATURE=$(echo -n "$(echo -e "$NONCE\n$TIMESTAMP\n$TOKEN" | sort | tr -d '\n')" | shasum -a 1 | cut -d ' ' -f 1)

   curl "http://localhost:3001/wechat?signature=$SIGNATURE&timestamp=$TIMESTAMP&nonce=$NONCE&echostr=$ECHOSTR"
   ```
   **Expected:** Response body is `hello` (echostr echoed back).

2. **Send a simulated text message** (POST XML):
   ```bash
   TIMESTAMP=$(date +%s)
   NONCE="test456"
   SIGNATURE=$(echo -n "$(echo -e "$NONCE\n$TIMESTAMP\n$TOKEN" | sort | tr -d '\n')" | shasum -a 1 | cut -d ' ' -f 1)

   curl -X POST "http://localhost:3001/wechat?signature=$SIGNATURE&timestamp=$TIMESTAMP&nonce=$NONCE" \
     -H "Content-Type: text/xml" \
     -d "<xml>
       <ToUserName><![CDATA[gh_test]]></ToUserName>
       <FromUserName><![CDATA[test_user_001]]></FromUserName>
       <CreateTime>$TIMESTAMP</CreateTime>
       <MsgType><![CDATA[text]]></MsgType>
       <Content><![CDATA[USC附近有什么好吃的？]]></Content>
       <MsgId>100001</MsgId>
     </xml>"
   ```
   **Expected:**
   - HTTP response: `success` (immediate — WeChat requires fast ack)
   - Server logs show `intent_classified` and `message_processed`
   - George calls `campus_knowledge` tool and sends a reply via WeChat customer service API
   - Reply is in George's voice (mischievous ghost dog, mixes Chinese/English)

3. **Send a non-text message** (voice):
   ```bash
   curl -X POST "http://localhost:3001/wechat?signature=$SIGNATURE&timestamp=$TIMESTAMP&nonce=$NONCE" \
     -H "Content-Type: text/xml" \
     -d "<xml>
       <ToUserName><![CDATA[gh_test]]></ToUserName>
       <FromUserName><![CDATA[test_user_001]]></FromUserName>
       <CreateTime>$TIMESTAMP</CreateTime>
       <MsgType><![CDATA[voice]]></MsgType>
       <MsgId>100002</MsgId>
     </xml>"
   ```
   **Expected:** George replies with the voice rejection message:
   `我是一只幽灵狗诶，你让我用什么耳朵听语音？👻 打字发给我吧！`

### Pass criteria
- [x] GET /wechat echoes back echostr on valid signature
- [ ] POST /wechat returns `success` immediately
- [ ] Server logs show intent classification + message processing
- [ ] Response is in George's character (ghost dog personality, BIA-loyal)
- [ ] Non-text messages get the correct canned rejection

---

## Test 2: Proactive push sends to correct platform

**What:** Verify `matchStudentsToEvents()` sends proactive messages to the student's primary platform (WeChat if available, else iMessage).

### Setup

1. **Insert a test student with interests** (via Supabase SQL Editor or dashboard):
   ```sql
   INSERT INTO students (id, wechat_open_id, interests, major, onboarding_complete)
   VALUES ('11111111-1111-1111-1111-111111111111', 'test_wechat_user', ARRAY['AI', 'hackathon'], 'Computer Science', true);
   ```

2. **Insert a matching event** (created recently so it passes the 6-hour window):
   ```sql
   INSERT INTO events (title, date, location, category, source, status, created_at)
   VALUES ('AI Hackathon 2026', '2026-04-20T10:00:00Z', 'SAL 101', 'hackathon', 'manual', 'active', NOW());
   ```

3. **Set rollout to 100%** so the test student is always eligible:
   ```bash
   PROACTIVE_ROLLOUT_PCT=100
   ```

### Steps

1. **Trigger the proactive engine manually** (or wait for cron):
   ```bash
   # Call from a test script or add a temporary admin endpoint:
   # Or run the function directly in a Node REPL:
   node -e "
     import('./dist/jobs/proactive.js').then(m => m.matchStudentsToEvents().then(console.log))
   "
   ```

2. **Check the proactive_log table:**
   ```sql
   SELECT * FROM proactive_log
   WHERE student_id = '11111111-1111-1111-1111-111111111111'
   ORDER BY sent_at DESC LIMIT 5;
   ```

### Expected results

| Student has          | Expected platform | Rationale                                    |
|----------------------|-------------------|----------------------------------------------|
| `wechat_open_id` only | `wechat`         | Only platform available                      |
| `imessage_id` only   | `imessage`        | Only platform available                      |
| Both                 | `wechat`          | Code: `student.wechat_open_id ? 'wechat' : 'imessage'` |

### Pass criteria
- [ ] Proactive message logged in `proactive_log` with correct `platform`
- [ ] Message sent via WeChat API (check server logs for `wechat_send` or API call)
- [ ] Quiet hours respected (no sends between 10pm–8am)
- [ ] Max 3 pushes/day/student enforced
- [ ] Same event not sent twice to same student

### Cleanup
```sql
DELETE FROM proactive_log WHERE student_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM events WHERE title = 'AI Hackathon 2026';
DELETE FROM students WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Test 3: Account linking flow between WeChat and iMessage

**What:** A student with separate WeChat and iMessage profiles links them into one unified account.

### Steps

1. **Simulate iMessage user requesting a link code.**
   Send a WeChat message from user A with text `link account`:
   ```bash
   # (use the same curl pattern from Test 1 with Content = "link account")
   ```
   **Expected:** George replies with a 6-digit code:
   `你的账号链接验证码是: XXXXXX\n在另一个平台上发送这6位数字给我就行！验证码10分钟有效 👻`

2. **Verify the code is stored:**
   ```sql
   SELECT id, link_code, link_code_expires_at
   FROM students
   WHERE wechat_open_id = 'test_user_A';
   ```
   **Expected:** `link_code` is a 6-digit number, `link_code_expires_at` is ~10 minutes from now.

3. **Simulate the other platform user sending the code.**
   Send a WeChat message from a *different* user (user B) with just the 6-digit code:
   ```bash
   # POST XML with FromUserName = test_user_B, Content = the 6-digit code
   ```
   **Expected:** George replies with a success message.

4. **Verify accounts merged:**
   ```sql
   -- User A's record should now have user B's wechat_open_id
   SELECT id, wechat_open_id, imessage_id FROM students WHERE id = '<user_A_id>';

   -- User B's record should be DELETED
   SELECT * FROM students WHERE wechat_open_id = 'test_user_B';
   ```

5. **Test edge cases:**

   | Input                          | Expected response       |
   |--------------------------------|------------------------|
   | Wrong 6-digit code             | `验证码不存在`          |
   | Code after 10-min expiry       | `验证码已过期`          |
   | User sends own code            | `不能链接自己的账号`     |

### Pass criteria
- [ ] `link account` or `链接账号` triggers code generation
- [ ] Code is 6 digits, expires in 10 minutes
- [ ] Sending valid code from different user merges accounts
- [ ] Duplicate student record is deleted
- [ ] All messages reassigned to the surviving account
- [ ] Invalid/expired/self codes return correct error messages

---

## Test 4: Admin endpoints require bearer token

**What:** Verify `/admin/*` endpoints reject unauthenticated requests and accept valid bearer tokens.

### Steps

1. **No auth header → 401:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST http://localhost:3001/admin/scrape-instagram
   ```
   **Expected:** `403` (no admin token configured) or `401` (wrong token)

2. **Wrong token → 401:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST http://localhost:3001/admin/scrape-instagram \
     -H "Authorization: Bearer wrong-token"
   ```
   **Expected:** `401`

3. **Valid token → 200:**
   ```bash
   curl -s -w "\n%{http_code}" \
     -X POST http://localhost:3001/admin/scrape-instagram \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"accounts": []}'
   ```
   **Expected:** `200` with `{"status":"ok"}` (or 500 if APIFY_TOKEN not set — that's fine, auth passed)

4. **Repeat for /admin/scrape-usc:**
   ```bash
   # No auth
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST http://localhost:3001/admin/scrape-usc
   # Expected: 403 or 401

   # Valid auth
   curl -s -w "\n%{http_code}" \
     -X POST http://localhost:3001/admin/scrape-usc \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   # Expected: 200
   ```

5. **Verify non-admin endpoints are open:**
   ```bash
   curl -s http://localhost:3001/health
   # Expected: {"status":"ok","character":"George Tirebiter 👻🐕","tools":15}

   curl -s http://localhost:3001/stats
   # Expected: JSON stats object (no auth required)
   ```

### Pass criteria
- [ ] `/admin/scrape-instagram` rejects requests without valid bearer token
- [ ] `/admin/scrape-usc` rejects requests without valid bearer token
- [ ] Valid bearer token grants access to both admin endpoints
- [ ] `/health` and `/stats` remain publicly accessible (no auth required)
- [ ] Response codes: 403 (no token configured), 401 (wrong token), 200 (valid)

## Skill Pool Smoke Test

**Goal:** Verify the skill registry loads, the catalog reaches the LLM, and `load_skill` runs end-to-end against the real backend.

**Setup:**

1. `cd george && npm run dev`
2. Watch the boot logs for `skill_registry_loaded` with `orchestratorCount: 3, perSubAgent: { event: 1, course: 1, social: 1 }, totalCount: 6`
3. If the line is missing or counts are wrong, stop and fix the registry before continuing

### Test 1: Event skill triggers

1. Open `http://localhost:3000/george`
2. Send: `我想找点活动`
3. Watch backend logs for the sequence:
   - `intent_classified intent=event`
   - `tool_executed tool=load_skill`
   - `tool_executed tool=search_events`
   - `message_processed`
4. Verify response leads with a BIA event and uses George's voice

### Test 2: Course overload skill triggers

1. Send: `我感觉这学期课太多了`
2. Expect log sequence with `tool=load_skill` (skill name `diagnose-course-overload`) followed by `tool=plan_schedule`
3. Verify response acknowledges workload concerns in George's grumpy-caring voice

### Test 3: Skills are strictly additive (no regression)

1. Send: `hi`
2. Expect normal greeting response
3. Logs should NOT contain `load_skill` (no skill matched, George responds directly)
4. This proves removing the skill layer would not break existing behavior

### Test 4: Boot validation catches a broken skill

1. Stop the backend
2. Temporarily edit `george/src/skills/orchestrator/remember-preference.md` and remove the `name:` line
3. Run `npm run dev`
4. Expect `skill_registry_load_failed` log + process exit
5. Restore the file, restart, confirm normal boot

### Pass criteria

- [ ] `skill_registry_loaded` log present at boot with 3 orchestrator + 1 event + 1 course + 1 social
- [ ] Test 1: event skill loads, search_events runs, BIA-first response
- [ ] Test 2: course overload skill loads, plan_schedule runs
- [ ] Test 3: `hi` does not trigger `load_skill` (skills are additive)
- [ ] Test 4: malformed skill blocks boot with `skill_registry_load_failed`

