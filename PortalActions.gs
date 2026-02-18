/*******************************************************
 * BOW Sports Capital — Portal Actions API
 * Secure server-to-server action router for Next.js portal
 *******************************************************/

const PORTAL_SHARED_SECRET_PROPERTY = 'PORTAL_SHARED_SECRET';
const PORTAL_SIGNATURE_WINDOW_MS = 10 * 60 * 1000;
const TICKETS_PER_XP = 100;
const DEFAULT_POD_SIZE = 4;
const LEAGUE_POINTS = {
  CLAIM_ACCEPTED: 10,
  JOURNAL_SUBMITTED: 5,
  JOURNAL_HIGH_SCORE: 8,
  EVENT_PARTICIPATION: 20,
  EVENT_TOP_1: 20,
  EVENT_TOP_2: 12,
  EVENT_TOP_3: 8,
  POD_KUDOS: 1
};
const PORTAL_IDEMPOTENT_ACTIONS = new Set([
  'portal.submitClaim',
  'portal.enterRaffle',
  'portal.submitEventEntry',
  'portal.claimQuestReward',
  'portal.admin.publishCurriculum',
  'portal.admin.rollbackCurriculum',
  'portal.createJournalEntry',
  'portal.admin.scoreJournalEntry',
  'portal.sendPodKudos',
  'portal.admin.createSeason',
  'portal.admin.upsertEvent',
  'portal.admin.assignPods',
  'portal.admin.upsertQuest'
]);

function setPortalSharedSecret(secret) {
  const s = String(secret || '').trim();
  if (!s) throw new Error('Secret is required.');
  PropertiesService.getScriptProperties().setProperty(PORTAL_SHARED_SECRET_PROPERTY, s);
}

function clearPortalSharedSecret() {
  PropertiesService.getScriptProperties().deleteProperty(PORTAL_SHARED_SECRET_PROPERTY);
}

function portalOk_(code, message, data) {
  return {
    ok: true,
    code: code || 'OK',
    message: message || 'Success',
    data: data === undefined ? null : data
  };
}

function portalErr_(code, message, data) {
  return {
    ok: false,
    code: code || 'ERROR',
    message: message || 'Unknown error',
    data: data === undefined ? null : data
  };
}

function nowIso_() {
  return new Date().toISOString();
}

function normalizeRole_(role) {
  return upper(role || '');
}

function normalizeUserStatus_(status) {
  const s = upper(status || 'ACTIVE');
  return s || 'ACTIVE';
}

function toDate_(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function sortAscDate_(a, b) {
  return new Date(a).getTime() - new Date(b).getTime();
}

function generateId_(prefix) {
  return String(prefix || 'ID') + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 18).toUpperCase();
}

function getPortalSharedSecret_() {
  const secret = PropertiesService.getScriptProperties().getProperty(PORTAL_SHARED_SECRET_PROPERTY);
  return String(secret || '').trim();
}

function signatureMessage_(payload) {
  const ts = String(payload.ts || '');
  const requestId = String(payload.requestId || '');
  const action = String(payload.action || '');
  const actorEmail = String(payload.actorEmail || '').toLowerCase();
  const dataJson = safeStringify(payload.data || {});
  return [ts, requestId, action, actorEmail, dataJson].join('.');
}

function computePortalSignature_(payload, secret) {
  const msg = signatureMessage_(payload);
  const bytes = Utilities.computeHmacSha256Signature(msg, secret);
  return Utilities.base64Encode(bytes);
}

function verifyPortalSignature_(payload) {
  const secret = getPortalSharedSecret_();
  if (!secret) {
    return { ok: false, reason: 'MISSING_SERVER_SECRET' };
  }

  const ts = Number(payload.ts || 0);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }

  const drift = Math.abs(Date.now() - ts);
  if (drift > PORTAL_SIGNATURE_WINDOW_MS) {
    return { ok: false, reason: 'TIMESTAMP_OUT_OF_WINDOW' };
  }

  const incoming = String(payload.signature || '');
  if (!incoming) {
    return { ok: false, reason: 'MISSING_SIGNATURE' };
  }

  const expected = computePortalSignature_(payload, secret);
  if (incoming !== expected) {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }

  return { ok: true };
}

function requirePortalRole_(payload, allowedRoles) {
  const role = normalizeRole_(payload.actorRole || '');
  const allow = (allowedRoles || []).map(normalizeRole_);
  if (allow.indexOf(role) === -1) {
    throw new Error('FORBIDDEN_ROLE:' + role);
  }
}

function assertActorEmail_(payload) {
  const email = String(payload.actorEmail || '').toLowerCase().trim();
  if (!email) throw new Error('MISSING_ACTOR_EMAIL');
  return email;
}

function getPortalUser_(email) {
  const d = readSheet('Portal_Users');
  const want = String(email || '').toLowerCase().trim();
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase().trim();
    if (em !== want) continue;

    return {
      rowNum: i + 2,
      email: em,
      role: normalizeRole_(getRowValue(row, d, 'role', 'STUDENT')),
      status: normalizeUserStatus_(getRowValue(row, d, 'status', 'ACTIVE')),
      firebaseUid: String(getRowValue(row, d, 'firebase_uid', '')),
      invitedAt: getRowValue(row, d, 'invited_at', ''),
      activatedAt: getRowValue(row, d, 'activated_at', ''),
      lastLoginAt: getRowValue(row, d, 'last_login_at', '')
    };
  }
  return null;
}

function upsertPortalUser_(payload) {
  const email = String(payload.email || '').toLowerCase().trim();
  if (!email) throw new Error('MISSING_PORTAL_USER_EMAIL');

  const d = readSheet('Portal_Users');
  let rowNum = -1;

  for (let i = 0; i < d.rows.length; i++) {
    const em = String(getRowValue(d.rows[i], d, 'email', '')).toLowerCase().trim();
    if (em === email) {
      rowNum = i + 2;
      break;
    }
  }

  if (rowNum > 0) {
    if (payload.role !== undefined) setCellByKey(d, rowNum, 'role', payload.role);
    if (payload.status !== undefined) setCellByKey(d, rowNum, 'status', payload.status);
    if (payload.firebaseUid !== undefined) setCellByKey(d, rowNum, 'firebase_uid', payload.firebaseUid);
    if (payload.invitedAt !== undefined) setCellByKey(d, rowNum, 'invited_at', payload.invitedAt);
    if (payload.activatedAt !== undefined) setCellByKey(d, rowNum, 'activated_at', payload.activatedAt);
    if (payload.lastLoginAt !== undefined) setCellByKey(d, rowNum, 'last_login_at', payload.lastLoginAt);
    return rowNum;
  }

  appendObjectRow('Portal_Users', {
    email: email,
    role: payload.role || 'STUDENT',
    status: payload.status || 'ACTIVE',
    firebase_uid: payload.firebaseUid || '',
    invited_at: payload.invitedAt || '',
    activated_at: payload.activatedAt || '',
    last_login_at: payload.lastLoginAt || ''
  });

  return readSheet('Portal_Users').sh.getLastRow();
}

function ensureActorAuthorized_(payload) {
  const actorEmail = assertActorEmail_(payload);
  const actorRole = normalizeRole_(payload.actorRole || '');

  const pu = getPortalUser_(actorEmail);
  if (!pu) {
    // Auto-create active student row for existing users to reduce onboarding friction.
    upsertPortalUser_({
      email: actorEmail,
      role: actorRole || 'STUDENT',
      status: 'ACTIVE',
      lastLoginAt: _now()
    });
    return;
  }

  if (pu.status === 'SUSPENDED') {
    throw new Error('ACCOUNT_SUSPENDED');
  }

  setCellByKey(readSheet('Portal_Users'), pu.rowNum, 'last_login_at', _now());
}

function parseJsonSafe_(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function digestBase64_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function getRequestDedupeRecord_(requestId, action, actorEmail) {
  const rid = String(requestId || '').trim();
  const act = String(action || '').trim();
  const email = String(actorEmail || '').toLowerCase().trim();
  if (!rid || !act) return null;

  const d = readSheet('Request_Dedupe');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const rowRequestId = String(getRowValue(row, d, 'request_id', '')).trim();
    const rowAction = String(getRowValue(row, d, 'action', '')).trim();
    const rowEmail = String(getRowValue(row, d, 'actor_email', '')).toLowerCase().trim();
    if (rowRequestId !== rid) continue;
    if (rowAction !== act) continue;
    if (email && rowEmail && rowEmail !== email) continue;
    return {
      rowNum: i + 2,
      request_id: rowRequestId,
      action: rowAction,
      actor_email: rowEmail,
      status: upper(getRowValue(row, d, 'status', '')),
      created_at: getRowValue(row, d, 'created_at', ''),
      response_hash: String(getRowValue(row, d, 'response_hash', ''))
    };
  }
  return null;
}

function markRequestDedupeInProgress_(requestId, action, actorEmail) {
  appendObjectRow('Request_Dedupe', {
    request_id: String(requestId || '').trim(),
    action: String(action || '').trim(),
    actor_email: String(actorEmail || '').toLowerCase().trim(),
    status: 'IN_PROGRESS',
    created_at: _now(),
    response_hash: ''
  });
}

function finalizeRequestDedupe_(requestId, action, actorEmail, status, responseObj) {
  const record = getRequestDedupeRecord_(requestId, action, actorEmail);
  const statusValue = upper(status || 'FAILED') || 'FAILED';
  const hash = digestBase64_(safeStringify(responseObj || {}));

  if (record) {
    const d = readSheet('Request_Dedupe');
    setCellByKey(d, record.rowNum, 'status', statusValue);
    setCellByKey(d, record.rowNum, 'response_hash', hash);
    return;
  }

  appendObjectRow('Request_Dedupe', {
    request_id: String(requestId || '').trim(),
    action: String(action || '').trim(),
    actor_email: String(actorEmail || '').toLowerCase().trim(),
    status: statusValue,
    created_at: _now(),
    response_hash: hash
  });
}

function buildRateLimitWindowKey_(windowMinutes) {
  const mins = Math.max(1, Number(windowMinutes || 1));
  const now = new Date();
  const bucket = Math.floor(now.getTime() / (mins * 60 * 1000));
  return Utilities.formatDate(now, TZ, 'yyyyMMdd') + '-' + String(bucket);
}

function rateLimitAllowed_(email, actionKey, windowMinutes, maxCount) {
  const actorEmail = String(email || '').toLowerCase().trim();
  const act = String(actionKey || '').trim().toUpperCase();
  const limit = Math.max(1, Number(maxCount || 1));
  const key = buildRateLimitWindowKey_(windowMinutes);
  const d = readSheet('Rate_Limits');

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase().trim();
    const a = upper(getRowValue(row, d, 'action', ''));
    const wk = String(getRowValue(row, d, 'window_key', '')).trim();
    if (em !== actorEmail || a !== act || wk !== key) continue;

    const cur = Number(getRowValue(row, d, 'count', 0)) || 0;
    if (cur >= limit) return false;
    setCellByKey(d, i + 2, 'count', cur + 1);
    setCellByKey(d, i + 2, 'updated_at', _now());
    return true;
  }

  appendObjectRow('Rate_Limits', {
    email: actorEmail,
    action: act,
    window_key: key,
    count: 1,
    updated_at: _now()
  });
  return true;
}

function rateLimitErr_(actionKey, windowMinutes, maxCount, message) {
  return portalErr_('RATE_LIMITED', String(message || 'Too many requests. Please wait and retry.'), {
    action: String(actionKey || ''),
    window_minutes: Number(windowMinutes || 1),
    max_count: Number(maxCount || 1)
  });
}

function inferSupportPriority_(category, subject, message) {
  const c = upper(category || '');
  const text = upper(String(subject || '') + ' ' + String(message || ''));
  if (c === 'CLAIM' || c === 'RAFFLE' || c === 'AUTH') return 'HIGH';
  if (text.indexOf('BLOCKED') >= 0 || text.indexOf('CAN\'T LOGIN') >= 0 || text.indexOf('CANNOT LOGIN') >= 0) {
    return 'HIGH';
  }
  if (c === 'BUG' || c === 'TECH') return 'MEDIUM';
  return 'LOW';
}

function addNotification_(email, title, body, kind) {
  appendObjectRow('Notifications', {
    notification_id: generateId_('NTF'),
    email: String(email || '').toLowerCase(),
    title: String(title || ''),
    body: String(body || ''),
    kind: String(kind || 'INFO'),
    status: 'UNREAD',
    created_at: _now(),
    read_at: ''
  });
}

function getUserRowByEmail_(email) {
  const d = readSheet('Users');
  const want = String(email || '').toLowerCase();
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em === want) {
      return {
        rowNum: i + 2,
        email: em,
        displayName: String(getRowValue(row, d, 'display_name', '') || displayFromEmail(email)),
        xp: Number(getRowValue(row, d, 'xp', 0)) || 0,
        level: Number(getRowValue(row, d, 'level', 1)) || 1,
        streak: Number(getRowValue(row, d, 'streak_days', 0)) || 0,
        levelTitle: String(getRowValue(row, d, 'level_title', '') || getLevelTitle(getRowValue(row, d, 'level', 1)))
      };
    }
  }
  return null;
}

function aggregateTrackXP_(email) {
  const d = readSheet('XP_Ledger');
  const want = String(email || '').toLowerCase();
  const out = { '101': 0, '201': 0, '301': 0 };

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== want) continue;

    const tr = String(getRowValue(row, d, 'track', '')).trim();
    const pts = Number(getRowValue(row, d, 'points', 0)) || 0;
    if (out[tr] !== undefined) out[tr] += pts;
  }

  return out;
}

function getCompletedLessonSet_(email) {
  const d = readSheet('XP_Ledger');
  const want = String(email || '').toLowerCase();
  const set = new Set();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'email', '')).toLowerCase() !== want) continue;

    const track = String(getRowValue(row, d, 'track', '')).trim();
    const moduleKey = normalizeModuleKey(getRowValue(row, d, 'module', ''));
    const lessonId = Number(getRowValue(row, d, 'lesson', 0)) || 0;
    if (!track || !moduleKey || !lessonId) continue;

    set.add(track + '|' + moduleKey + '|' + lessonId);
  }

  return set;
}

function getActivities_(track, moduleFilter) {
  const d = readSheet('Activities_Published');
  const out = [];
  const trackWant = String(track || '').trim();
  const moduleWant = moduleFilter ? normalizeModuleKey(moduleFilter) : '';

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const status = String(getRowValue(row, d, 'status', 'ACTIVE')).toUpperCase();
    if (status === 'ARCHIVED' || status === 'DISABLED') continue;

    const tr = String(getRowValue(row, d, 'track', '')).trim();
    const moduleKey = normalizeModuleKey(getRowValue(row, d, 'module_id', getRowValue(row, d, 'module', '')));
    const lessonId = Number(getRowValue(row, d, 'lesson_id', getRowValue(row, d, 'lesson', 0))) || 0;

    if (trackWant && tr !== trackWant) continue;
    if (moduleWant && moduleKey !== moduleWant) continue;
    if (!tr || !moduleKey || !lessonId) continue;

    out.push({
      track: tr,
      module_id: moduleKey,
      lesson_id: lessonId,
      lesson_title: String(getRowValue(row, d, 'lesson_title', getRowValue(row, d, 'activity_title', ''))),
      activity_url: String(getRowValue(row, d, 'activity_url', getRowValue(row, d, 'sim_url', ''))),
      xp_value: Number(getRowValue(row, d, 'xp_value', 0)) || 0,
      next_lesson_id: Number(getRowValue(row, d, 'next_lesson_id', 0)) || 0,
      status: status || 'ACTIVE',
      recommended_order: Number(getRowValue(row, d, 'sort_order', i + 1)) || (i + 1)
    });
  }

  out.sort(function(a, b) {
    if (a.track !== b.track) return String(a.track).localeCompare(String(b.track));
    if (a.module_id !== b.module_id) return String(a.module_id).localeCompare(String(b.module_id));
    return Number(a.lesson_id) - Number(b.lesson_id);
  });

  return out;
}

function getModules_(track) {
  const items = getActivities_(track, '');
  const map = {};
  items.forEach(function(item) {
    const key = item.track + '|' + item.module_id;
    if (!map[key]) {
      map[key] = {
        track: item.track,
        module_id: item.module_id,
        lesson_count: 0,
        total_xp: 0
      };
    }
    map[key].lesson_count += 1;
    map[key].total_xp += Number(item.xp_value || 0);
  });

  return Object.keys(map).map(function(k) { return map[k]; });
}

function rowToObject_(row, d) {
  const obj = {};
  d.header.forEach(function(h, idx) {
    obj[normalizeHeaderKey(h)] = row[idx];
  });
  return obj;
}

function listSheetObjects_(sheetName, includeRowNum) {
  const d = readSheet(sheetName);
  return d.rows.map(function(row, idx) {
    const obj = rowToObject_(row, d);
    if (includeRowNum) obj._row_num = idx + 2;
    return obj;
  });
}

function asNumber_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback || 0);
}

function safeJsonParse_(raw, fallback) {
  try {
    return JSON.parse(String(raw || ''));
  } catch (err) {
    return fallback;
  }
}

function curriculumEntityMeta_(entityKey) {
  const map = {
    programs: { draft: 'Programs_Draft', published: 'Programs_Published', id: 'program_id', prefix: 'PRG' },
    modules: { draft: 'Modules_Draft', published: 'Modules_Published', id: 'module_id', prefix: 'MOD' },
    lessons: { draft: 'Lessons_Draft', published: 'Lessons_Published', id: 'lesson_key', prefix: 'LES' },
    activities: { draft: 'Activities_Draft', published: 'Activities_Published', id: 'activity_id', prefix: 'ACT' },
    outcomes: { draft: 'Outcomes_Draft', published: 'Outcomes_Published', id: 'outcome_id', prefix: 'OUT' }
  };
  const meta = map[String(entityKey || '').toLowerCase()];
  if (!meta) throw new Error('UNSUPPORTED_CURRICULUM_ENTITY:' + entityKey);
  return meta;
}

function getDraftEntityRows_(entityKey) {
  const meta = curriculumEntityMeta_(entityKey);
  return listSheetObjects_(meta.draft, true);
}

function findDraftEntityById_(entityKey, idValue) {
  const meta = curriculumEntityMeta_(entityKey);
  const want = String(idValue || '').trim();
  if (!want) return null;
  const rows = getDraftEntityRows_(entityKey);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][meta.id] || '').trim() === want) return rows[i];
  }
  return null;
}

function filterByParent_(rows, data) {
  const out = rows.filter(function(row) {
    const programId = String(data.program_id || '').trim();
    const moduleId = String(data.module_id || '').trim();
    const lessonKey = String(data.lesson_key || '').trim();
    if (programId && String(row.program_id || '').trim() !== programId) return false;
    if (moduleId && String(row.module_id || '').trim() !== moduleId) return false;
    if (lessonKey && String(row.lesson_key || '').trim() !== lessonKey) return false;
    return true;
  });
  out.sort(function(a, b) {
    const as = asNumber_(a.sort_order, 999999);
    const bs = asNumber_(b.sort_order, 999999);
    if (as !== bs) return as - bs;
    return String(a.name || a.module_title || a.lesson_title || a.activity_title || a.skill_name || '').localeCompare(
      String(b.name || b.module_title || b.lesson_title || b.activity_title || b.skill_name || '')
    );
  });
  return out;
}

function assertCurriculumRelationship_(entityKey, data) {
  const key = String(entityKey || '').toLowerCase();
  if (key === 'modules') {
    if (!String(data.program_id || '').trim()) throw new Error('MODULE_REQUIRES_PROGRAM_ID');
    if (!findDraftEntityById_('programs', data.program_id)) throw new Error('PROGRAM_NOT_FOUND_FOR_MODULE');
  }
  if (key === 'lessons') {
    if (!String(data.program_id || '').trim()) throw new Error('LESSON_REQUIRES_PROGRAM_ID');
    if (!String(data.module_id || '').trim()) throw new Error('LESSON_REQUIRES_MODULE_ID');
    if (!findDraftEntityById_('programs', data.program_id)) throw new Error('PROGRAM_NOT_FOUND_FOR_LESSON');
    if (!findDraftEntityById_('modules', data.module_id)) throw new Error('MODULE_NOT_FOUND_FOR_LESSON');
  }
  if (key === 'activities' || key === 'outcomes') {
    if (!String(data.lesson_key || '').trim()) throw new Error(String(key).toUpperCase() + '_REQUIRES_LESSON_KEY');
    if (!findDraftEntityById_('lessons', data.lesson_key)) throw new Error('LESSON_NOT_FOUND_FOR_' + String(key).toUpperCase());
  }
}

function normalizeInputData_(data) {
  const raw = data || {};
  const out = {};
  Object.keys(raw).forEach(function(k) {
    out[normalizeHeaderKey(k)] = raw[k];
  });
  return out;
}

function buildRowObjectFromSheet_(sheetName, inputNorm) {
  const d = readSheet(sheetName);
  const obj = {};
  d.header.forEach(function(h) {
    const key = normalizeHeaderKey(h);
    obj[key] = Object.prototype.hasOwnProperty.call(inputNorm, key) ? inputNorm[key] : '';
  });
  return obj;
}

function createDraftEntity_(entityKey, payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const meta = curriculumEntityMeta_(entityKey);
  const inputNorm = normalizeInputData_(payload.data || {});
  const obj = buildRowObjectFromSheet_(meta.draft, inputNorm);

  const requestedId = String(inputNorm[meta.id] || '').trim();
  const id = requestedId || generateId_(meta.prefix);
  if (findDraftEntityById_(entityKey, id)) {
    return portalErr_('DUPLICATE_ID', meta.id + ' already exists.', { entity: entityKey, id: id });
  }

  obj[meta.id] = id;
  obj.status = String(inputNorm.status || obj.status || 'DRAFT').toUpperCase();
  obj.sort_order = asNumber_(inputNorm.sort_order, asNumber_(obj.sort_order, 0) || (getDraftEntityRows_(entityKey).length + 1));
  obj.updated_at = _now();
  obj.updated_by = String(payload.actorEmail || '').toLowerCase();

  assertCurriculumRelationship_(entityKey, obj);
  appendObjectRow(meta.draft, obj);

  return portalOk_('CURRICULUM_ENTITY_CREATED', String(entityKey) + ' created.', {
    entity: entityKey,
    id: id
  });
}

function updateDraftEntity_(entityKey, idValue, payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const meta = curriculumEntityMeta_(entityKey);
  const id = String(idValue || '').trim();
  if (!id) return portalErr_('MISSING_ENTITY_ID', meta.id + ' is required.', null);

  const d = readSheet(meta.draft);
  const rows = listSheetObjects_(meta.draft, true);
  let row = null;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][meta.id] || '').trim() === id) {
      row = rows[i];
      break;
    }
  }
  if (!row) return portalErr_('ENTITY_NOT_FOUND', String(entityKey) + ' not found.', { entity: entityKey, id: id });

  const inputNorm = normalizeInputData_(payload.data || {});
  const candidate = Object.assign({}, row, inputNorm);
  assertCurriculumRelationship_(entityKey, candidate);

  Object.keys(inputNorm).forEach(function(key) {
    if (key === meta.id) return;
    if (!d.idx.has(key)) return;
    setCellByKey(d, row._row_num, key, inputNorm[key]);
  });

  if (d.idx.has('updated_at')) setCellByKey(d, row._row_num, 'updated_at', _now());
  if (d.idx.has('updated_by')) setCellByKey(d, row._row_num, 'updated_by', String(payload.actorEmail || '').toLowerCase());

  return portalOk_('CURRICULUM_ENTITY_UPDATED', String(entityKey) + ' updated.', {
    entity: entityKey,
    id: id
  });
}

function actionAdminGetDraftPrograms_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  return portalOk_('DRAFT_PROGRAMS_OK', 'Draft programs loaded.', filterByParent_(getDraftEntityRows_('programs'), payload.data || {}));
}

function actionAdminCreateDraftProgram_(payload) {
  return createDraftEntity_('programs', payload);
}

function actionAdminUpdateDraftProgram_(payload) {
  return updateDraftEntity_('programs', payload.data && payload.data.program_id, payload);
}

function actionAdminGetDraftModules_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  return portalOk_('DRAFT_MODULES_OK', 'Draft modules loaded.', filterByParent_(getDraftEntityRows_('modules'), payload.data || {}));
}

function actionAdminCreateDraftModule_(payload) {
  return createDraftEntity_('modules', payload);
}

function actionAdminUpdateDraftModule_(payload) {
  return updateDraftEntity_('modules', payload.data && payload.data.module_id, payload);
}

function actionAdminGetDraftLessons_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  return portalOk_('DRAFT_LESSONS_OK', 'Draft lessons loaded.', filterByParent_(getDraftEntityRows_('lessons'), payload.data || {}));
}

function actionAdminCreateDraftLesson_(payload) {
  return createDraftEntity_('lessons', payload);
}

function actionAdminUpdateDraftLesson_(payload) {
  return updateDraftEntity_('lessons', payload.data && payload.data.lesson_key, payload);
}

function actionAdminGetDraftActivities_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  return portalOk_('DRAFT_ACTIVITIES_OK', 'Draft activities loaded.', filterByParent_(getDraftEntityRows_('activities'), payload.data || {}));
}

function actionAdminCreateDraftActivity_(payload) {
  return createDraftEntity_('activities', payload);
}

function actionAdminUpdateDraftActivity_(payload) {
  return updateDraftEntity_('activities', payload.data && payload.data.activity_id, payload);
}

function actionAdminGetDraftOutcomes_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  return portalOk_('DRAFT_OUTCOMES_OK', 'Draft outcomes loaded.', filterByParent_(getDraftEntityRows_('outcomes'), payload.data || {}));
}

function actionAdminCreateDraftOutcome_(payload) {
  return createDraftEntity_('outcomes', payload);
}

function actionAdminUpdateDraftOutcome_(payload) {
  return updateDraftEntity_('outcomes', payload.data && payload.data.outcome_id, payload);
}

function actionAdminReorderDraftEntities_(payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const data = payload.data || {};
  const entity = String(data.entity || '').toLowerCase();
  const orderedIds = Array.isArray(data.ordered_ids) ? data.ordered_ids.map(String) : [];
  if (!entity || !orderedIds.length) {
    return portalErr_('INVALID_REORDER_PAYLOAD', 'entity and ordered_ids are required.', null);
  }

  const meta = curriculumEntityMeta_(entity);
  const d = readSheet(meta.draft);
  const rows = getDraftEntityRows_(entity);
  let changed = 0;

  orderedIds.forEach(function(id, idx) {
    const row = rows.find(function(r) { return String(r[meta.id] || '') === String(id); });
    if (!row) return;
    setCellByKey(d, row._row_num, 'sort_order', idx + 1);
    if (d.idx.has('updated_at')) setCellByKey(d, row._row_num, 'updated_at', _now());
    if (d.idx.has('updated_by')) setCellByKey(d, row._row_num, 'updated_by', String(payload.actorEmail || '').toLowerCase());
    changed += 1;
  });

  return portalOk_('DRAFT_REORDER_OK', 'Draft order updated.', {
    entity: entity,
    changed: changed
  });
}

function getDraftCurriculumSnapshot_() {
  return {
    programs: getDraftEntityRows_('programs').map(function(r) { return Object.assign({}, r); }),
    modules: getDraftEntityRows_('modules').map(function(r) { return Object.assign({}, r); }),
    lessons: getDraftEntityRows_('lessons').map(function(r) { return Object.assign({}, r); }),
    activities: getDraftEntityRows_('activities').map(function(r) { return Object.assign({}, r); }),
    outcomes: getDraftEntityRows_('outcomes').map(function(r) { return Object.assign({}, r); })
  };
}

function stripRuntimeKeys_(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(function(k) {
    if (k.indexOf('_') === 0) return;
    out[k] = obj[k];
  });
  return out;
}

function assertPublishRules_(snapshot) {
  const outcomesByLesson = new Map();
  (snapshot.outcomes || []).forEach(function(row) {
    const lk = String(row.lesson_key || '').trim();
    if (!lk) return;
    outcomesByLesson.set(lk, (outcomesByLesson.get(lk) || 0) + 1);
  });

  for (let i = 0; i < (snapshot.lessons || []).length; i++) {
    const lesson = snapshot.lessons[i];
    const lk = String(lesson.lesson_key || '').trim();
    if (!lk) throw new Error('PUBLISH_BLOCKED_LESSON_KEY_MISSING');
    if ((outcomesByLesson.get(lk) || 0) < 1) {
      throw new Error('PUBLISH_BLOCKED_LESSON_WITHOUT_OUTCOME:' + lk);
    }
  }

  for (let i = 0; i < (snapshot.activities || []).length; i++) {
    const act = snapshot.activities[i];
    if (!String(act.sim_url || '').trim()) {
      throw new Error('PUBLISH_BLOCKED_ACTIVITY_WITHOUT_SIM_URL:' + String(act.activity_id || ''));
    }
    if (!String(act.claim_code_pattern || '').trim()) {
      throw new Error('PUBLISH_BLOCKED_ACTIVITY_WITHOUT_CLAIM_PATTERN:' + String(act.activity_id || ''));
    }
  }
}

function rewriteSheetFromObjects_(sheetName, objects) {
  const d = readSheet(sheetName);
  const header = d.header.length ? d.header : (SHEET_SCHEMAS[sheetName] || []);
  if (!header.length) throw new Error('MISSING_HEADER_FOR_' + sheetName);

  d.sh.clearContents();
  d.sh.getRange(1, 1, 1, header.length).setValues([header]);

  if (!objects || !objects.length) return;
  const rows = objects.map(function(obj) {
    return header.map(function(h) {
      const k = normalizeHeaderKey(h);
      return Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : '';
    });
  });
  d.sh.getRange(2, 1, rows.length, header.length).setValues(rows);
}

function applyPublishMetadata_(rows, batchId, actorEmail) {
  const ts = _now();
  return (rows || []).map(function(row) {
    const clean = stripRuntimeKeys_(row);
    clean.publish_batch_id = batchId;
    clean.published_at = ts;
    clean.published_by = String(actorEmail || '').toLowerCase();
    return clean;
  });
}

function actionAdminPublishCurriculum_(payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const data = payload.data || {};
  const notes = String(data.notes || '').trim();
  const actorEmail = String(payload.actorEmail || '').toLowerCase();

  const snapshot = getDraftCurriculumSnapshot_();
  assertPublishRules_(snapshot);

  const batchId = generateId_('PUB');
  const published = {
    programs: applyPublishMetadata_(snapshot.programs, batchId, actorEmail),
    modules: applyPublishMetadata_(snapshot.modules, batchId, actorEmail),
    lessons: applyPublishMetadata_(snapshot.lessons, batchId, actorEmail),
    activities: applyPublishMetadata_(snapshot.activities, batchId, actorEmail),
    outcomes: applyPublishMetadata_(snapshot.outcomes, batchId, actorEmail)
  };

  rewriteSheetFromObjects_('Programs_Published', published.programs);
  rewriteSheetFromObjects_('Modules_Published', published.modules);
  rewriteSheetFromObjects_('Lessons_Published', published.lessons);
  rewriteSheetFromObjects_('Activities_Published', published.activities);
  rewriteSheetFromObjects_('Outcomes_Published', published.outcomes);

  appendObjectRow('Curriculum_Publish_Log', {
    publish_batch_id: batchId,
    program_id: String(data.program_id || (published.programs[0] && published.programs[0].program_id) || ''),
    published_at: _now(),
    published_by: actorEmail,
    notes: notes || 'Publish from draft',
    rollback_of_batch_id: '',
    snapshot_json: safeStringify(published)
  });

  logOps('portal_curriculum_publish_ok', {
    publish_batch_id: batchId,
    published_by: actorEmail,
    programs: published.programs.length,
    modules: published.modules.length,
    lessons: published.lessons.length,
    activities: published.activities.length,
    outcomes: published.outcomes.length
  });

  return portalOk_('CURRICULUM_PUBLISHED', 'Curriculum published.', {
    publish_batch_id: batchId,
    counts: {
      programs: published.programs.length,
      modules: published.modules.length,
      lessons: published.lessons.length,
      activities: published.activities.length,
      outcomes: published.outcomes.length
    }
  });
}

function getLatestPublishLogRows_() {
  const rows = listSheetObjects_('Curriculum_Publish_Log', false);
  rows.sort(function(a, b) {
    return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
  });
  return rows;
}

function actionAdminRollbackCurriculum_(payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const data = payload.data || {};
  const requestedBatchId = String(data.publish_batch_id || '').trim();
  const logs = getLatestPublishLogRows_().filter(function(row) {
    return String(row.snapshot_json || '').trim() !== '';
  });
  if (!logs.length) return portalErr_('NO_PUBLISH_HISTORY', 'No publish history to roll back.', null);

  const currentBatch = String(listSheetObjects_('Programs_Published', false)[0] && listSheetObjects_('Programs_Published', false)[0].publish_batch_id || '');

  let target = null;
  if (requestedBatchId) {
    target = logs.find(function(row) { return String(row.publish_batch_id || '') === requestedBatchId; }) || null;
  } else {
    target = logs.find(function(row) { return String(row.publish_batch_id || '') !== currentBatch; }) || null;
  }
  if (!target) {
    return portalErr_('ROLLBACK_TARGET_NOT_FOUND', 'Unable to find rollback target batch.', {
      requested_batch_id: requestedBatchId,
      current_batch_id: currentBatch
    });
  }

  const snapshot = safeJsonParse_(target.snapshot_json, null);
  if (!snapshot) return portalErr_('ROLLBACK_SNAPSHOT_INVALID', 'Rollback snapshot is invalid.', null);

  rewriteSheetFromObjects_('Programs_Published', snapshot.programs || []);
  rewriteSheetFromObjects_('Modules_Published', snapshot.modules || []);
  rewriteSheetFromObjects_('Lessons_Published', snapshot.lessons || []);
  rewriteSheetFromObjects_('Activities_Published', snapshot.activities || []);
  rewriteSheetFromObjects_('Outcomes_Published', snapshot.outcomes || []);

  appendObjectRow('Curriculum_Publish_Log', {
    publish_batch_id: String(target.publish_batch_id || ''),
    program_id: String(target.program_id || ''),
    published_at: _now(),
    published_by: String(payload.actorEmail || '').toLowerCase(),
    notes: 'Rollback applied',
    rollback_of_batch_id: currentBatch,
    snapshot_json: target.snapshot_json
  });

  logOps('portal_curriculum_rollback_ok', {
    rollback_to_batch: String(target.publish_batch_id || ''),
    rollback_of_batch: currentBatch,
    rollback_by: String(payload.actorEmail || '').toLowerCase()
  });

  return portalOk_('CURRICULUM_ROLLBACK_OK', 'Curriculum rollback applied.', {
    rollback_to_batch: String(target.publish_batch_id || ''),
    rollback_of_batch: currentBatch
  });
}

function actionGetPublishedCurriculum_(payload) {
  const data = payload.data || {};
  const trackFilter = String(data.track || '').trim();

  const programs = listSheetObjects_('Programs_Published', false);
  const modules = listSheetObjects_('Modules_Published', false);
  const lessons = listSheetObjects_('Lessons_Published', false);
  const activities = listSheetObjects_('Activities_Published', false).filter(function(row) {
    if (!trackFilter) return true;
    return String(row.track || '').trim() === trackFilter;
  });
  const outcomes = listSheetObjects_('Outcomes_Published', false);

  return portalOk_('PUBLISHED_CURRICULUM_OK', 'Published curriculum loaded.', {
    programs: programs,
    modules: modules,
    lessons: lessons,
    activities: activities,
    outcomes: outcomes
  });
}

function findClaimContextByCodeForEmail_(email, claimCode) {
  const d = readSheet('XP_Ledger');
  const wantEmail = String(email || '').toLowerCase().trim();
  const wantCode = normCode(claimCode);
  let best = null;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase().trim();
    const rc = normCode(getRowValue(row, d, 'ref_code', ''));
    if (em !== wantEmail || rc !== wantCode) continue;

    const hit = {
      track: String(getRowValue(row, d, 'track', '')).trim(),
      module_id: normalizeModuleKey(getRowValue(row, d, 'module', '')),
      lesson_id: Number(getRowValue(row, d, 'lesson', 0)) || 0,
      ts: getRowValue(row, d, 'ts', '')
    };
    if (!best) {
      best = hit;
    } else {
      const bestTs = new Date(best.ts || 0).getTime();
      const hitTs = new Date(hit.ts || 0).getTime();
      if (hitTs >= bestTs) best = hit;
    }
  }

  return best;
}

function findLessonKeyByTrackModuleLesson_(track, moduleId, lessonId) {
  const acts = listSheetObjects_('Activities_Published', false);
  for (let i = 0; i < acts.length; i++) {
    const row = acts[i];
    if (String(row.track || '') !== String(track || '')) continue;
    if (normalizeModuleKey(row.module_id) !== normalizeModuleKey(moduleId)) continue;
    if (Number(row.lesson_id || 0) !== Number(lessonId || 0)) continue;
    return String(row.lesson_key || '');
  }
  return '';
}

function getJournalRows_(emailFilter, includeScoredOnly) {
  const rows = listSheetObjects_('Decision_Journal', true);
  return rows.filter(function(row) {
    if (emailFilter && String(row.email || '').toLowerCase() !== String(emailFilter).toLowerCase()) return false;
    if (includeScoredOnly && String(row.status || '').toUpperCase() !== 'SCORED') return false;
    return true;
  });
}

function actionGetMyJournalEntries_(payload) {
  const email = assertActorEmail_(payload);
  const rows = getJournalRows_(email, false).sort(function(a, b) {
    return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime();
  });
  return portalOk_('JOURNAL_OK', 'Journal entries loaded.', rows.map(stripRuntimeKeys_));
}

function actionCreateJournalEntry_(payload) {
  const email = assertActorEmail_(payload);
  if (!rateLimitAllowed_(email, 'JOURNAL_SUBMIT', 1, 1)) {
    return rateLimitErr_('JOURNAL_SUBMIT', 1, 1, 'Journal submit limit reached. Please wait one minute.');
  }
  const data = payload.data || {};
  const claimCode = normCode(data.claim_code || '');
  const role = String(data.role || '').trim();
  const decisionText = String(data.decision_text || '').trim();
  const rationaleText = String(data.rationale_text || '').trim();
  const outcomeText = String(data.outcome_text || '').trim();

  if (!claimCode || !role || !decisionText || !rationaleText || !outcomeText) {
    return portalErr_('MISSING_JOURNAL_FIELDS', 'claim_code, role, decision_text, rationale_text, and outcome_text are required.', null);
  }

  const claimContext = findClaimContextByCodeForEmail_(email, claimCode);
  if (!claimContext) {
    return portalErr_('CLAIM_NOT_FOUND_FOR_JOURNAL', 'A valid claimed code is required before journaling.', { claim_code: claimCode });
  }

  const d = readSheet('Decision_Journal');
  const existing = getJournalRows_(email, false).find(function(row) {
    return normCode(row.claim_code) === claimCode;
  });

  const lessonKey = findLessonKeyByTrackModuleLesson_(claimContext.track, claimContext.module_id, claimContext.lesson_id) ||
    (String(claimContext.track) + '_' + String(claimContext.module_id) + '_' + String(claimContext.lesson_id));

  if (existing) {
    if (String(existing.status || '').toUpperCase() === 'SCORED') {
      return portalErr_('JOURNAL_LOCKED', 'Scored journal entries are locked.', { entry_id: existing.entry_id });
    }
    setCellByKey(d, existing._row_num, 'role', role);
    setCellByKey(d, existing._row_num, 'decision_text', decisionText);
    setCellByKey(d, existing._row_num, 'rationale_text', rationaleText);
    setCellByKey(d, existing._row_num, 'outcome_text', outcomeText);
    setCellByKey(d, existing._row_num, 'status', 'SUBMITTED');
    setCellByKey(d, existing._row_num, 'submitted_at', _now());

    awardLeaguePointsForEmail_(
      email,
      LEAGUE_POINTS.JOURNAL_SUBMITTED,
      'JOURNAL_SUBMITTED',
      'JOURNAL:' + String(existing.entry_id || ''),
      ''
    );
    incrementDailyEngagementMetric_('journals_submitted', 1);
    touchStudentEngagement_(email, { favorite_role: role });

    return portalOk_('JOURNAL_UPDATED', 'Journal entry updated.', { entry_id: existing.entry_id, claim_code: claimCode });
  }

  const lessons = listSheetObjects_('Lessons_Published', false);
  const lessonRow = lessons.find(function(row) { return String(row.lesson_key || '') === lessonKey; }) || {};

  const entryId = generateId_('JRN');
  appendObjectRow('Decision_Journal', {
    entry_id: entryId,
    email: email,
    claim_code: claimCode,
    program_id: String(lessonRow.program_id || ''),
    module_id: String(claimContext.module_id || ''),
    lesson_id: Number(claimContext.lesson_id || 0),
    lesson_key: lessonKey,
    role: role,
    decision_text: decisionText,
    rationale_text: rationaleText,
    outcome_text: outcomeText,
    status: 'SUBMITTED',
    submitted_at: _now(),
    scored_at: '',
    scored_by: '',
    score_decision_quality: '',
    score_financial_logic: '',
    score_risk_management: '',
    score_communication: '',
    coach_note: ''
  });

  awardLeaguePointsForEmail_(
    email,
    LEAGUE_POINTS.JOURNAL_SUBMITTED,
    'JOURNAL_SUBMITTED',
    'JOURNAL:' + entryId,
    ''
  );
  incrementDailyEngagementMetric_('journals_submitted', 1);
  touchStudentEngagement_(email, { favorite_role: role });

  addNotification_(email, 'Journal entry submitted', 'Your decision journal entry for ' + claimCode + ' is awaiting instructor review.', 'JOURNAL');
  return portalOk_('JOURNAL_CREATED', 'Journal entry submitted.', { claim_code: claimCode, entry_id: entryId });
}

function actionAdminGetJournalReviewQueue_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const rows = getJournalRows_('', false).filter(function(row) {
    return String(row.status || '').toUpperCase() !== 'SCORED';
  }).sort(function(a, b) {
    return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
  });
  return portalOk_('JOURNAL_REVIEW_QUEUE_OK', 'Journal review queue loaded.', rows.map(stripRuntimeKeys_));
}

function actionAdminScoreJournalEntry_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const entryId = String(data.entry_id || '').trim();
  if (!entryId) return portalErr_('MISSING_ENTRY_ID', 'entry_id is required.', null);

  const s1 = asNumber_(data.score_decision_quality, NaN);
  const s2 = asNumber_(data.score_financial_logic, NaN);
  const s3 = asNumber_(data.score_risk_management, NaN);
  const s4 = asNumber_(data.score_communication, NaN);
  const coachNote = String(data.coach_note || '').trim();

  const scores = [s1, s2, s3, s4];
  for (let i = 0; i < scores.length; i++) {
    if (!Number.isFinite(scores[i]) || scores[i] < 1 || scores[i] > 5) {
      return portalErr_('INVALID_SCORE', 'All rubric scores must be numbers between 1 and 5.', null);
    }
  }

  const d = readSheet('Decision_Journal');
  const rows = getJournalRows_('', false);
  const row = rows.find(function(r) { return String(r.entry_id || '') === entryId; });
  if (!row) return portalErr_('JOURNAL_ENTRY_NOT_FOUND', 'Journal entry not found.', { entry_id: entryId });

  setCellByKey(d, row._row_num, 'score_decision_quality', s1);
  setCellByKey(d, row._row_num, 'score_financial_logic', s2);
  setCellByKey(d, row._row_num, 'score_risk_management', s3);
  setCellByKey(d, row._row_num, 'score_communication', s4);
  setCellByKey(d, row._row_num, 'coach_note', coachNote);
  setCellByKey(d, row._row_num, 'status', 'SCORED');
  setCellByKey(d, row._row_num, 'scored_at', _now());
  setCellByKey(d, row._row_num, 'scored_by', String(payload.actorEmail || '').toLowerCase());

  const avgScore = Number(((s1 + s2 + s3 + s4) / 4).toFixed(2));
  if (avgScore >= 4.0) {
    awardLeaguePointsForEmail_(
      String(row.email || '').toLowerCase(),
      LEAGUE_POINTS.JOURNAL_HIGH_SCORE,
      'JOURNAL_HIGH_SCORE',
      'JOURNAL_HIGH:' + entryId,
      ''
    );
  }

  addNotification_(
    String(row.email || '').toLowerCase(),
    'Journal debrief scored',
    'Your journal entry ' + entryId + ' has new instructor feedback.',
    'JOURNAL'
  );

  return portalOk_('JOURNAL_SCORED', 'Journal entry scored.', { entry_id: entryId });
}

function getModuleMetaMap_() {
  const modules = listSheetObjects_('Modules_Published', false);
  const map = new Map();
  modules.forEach(function(row) {
    map.set(String(row.module_id || ''), {
      module_title: String(row.module_title || ''),
      core_competency: String(row.core_competency || '')
    });
  });
  return map;
}

function actionAdminGetMasteryHeatmap_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const emailFilter = String(data.email || '').toLowerCase().trim();
  const rows = getJournalRows_('', true).filter(function(row) {
    if (!emailFilter) return true;
    return String(row.email || '').toLowerCase() === emailFilter;
  });
  const moduleMeta = getModuleMetaMap_();
  const agg = new Map();

  rows.forEach(function(row) {
    const moduleId = String(row.module_id || '');
    if (!moduleId) return;
    if (!agg.has(moduleId)) {
      agg.set(moduleId, {
        module_id: moduleId,
        count: 0,
        sum_decision_quality: 0,
        sum_financial_logic: 0,
        sum_risk_management: 0,
        sum_communication: 0
      });
    }
    const a = agg.get(moduleId);
    a.count += 1;
    a.sum_decision_quality += asNumber_(row.score_decision_quality, 0);
    a.sum_financial_logic += asNumber_(row.score_financial_logic, 0);
    a.sum_risk_management += asNumber_(row.score_risk_management, 0);
    a.sum_communication += asNumber_(row.score_communication, 0);
  });

  const out = Array.from(agg.values()).map(function(a) {
    const c = Math.max(1, a.count);
    const meta = moduleMeta.get(a.module_id) || { module_title: '', core_competency: '' };
    const avgDecision = Number((a.sum_decision_quality / c).toFixed(2));
    const avgFinancial = Number((a.sum_financial_logic / c).toFixed(2));
    const avgRisk = Number((a.sum_risk_management / c).toFixed(2));
    const avgComm = Number((a.sum_communication / c).toFixed(2));
    return {
      module_id: a.module_id,
      module_title: meta.module_title,
      core_competency: meta.core_competency,
      count: a.count,
      avg_decision_quality: avgDecision,
      avg_financial_logic: avgFinancial,
      avg_risk_management: avgRisk,
      avg_communication: avgComm,
      overall_avg: Number(((avgDecision + avgFinancial + avgRisk + avgComm) / 4).toFixed(2))
    };
  }).sort(function(a, b) {
    return String(a.module_id).localeCompare(String(b.module_id));
  });

  return portalOk_('MASTERY_HEATMAP_OK', 'Mastery heatmap loaded.', out);
}

function weekBucketNY_(dateValue) {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, TZ, 'yyyy-ww');
}

function actionAdminGetDecisionTrends_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const emailFilter = String(data.email || '').toLowerCase().trim();
  const rows = getJournalRows_('', true).filter(function(row) {
    if (!emailFilter) return true;
    return String(row.email || '').toLowerCase() === emailFilter;
  });

  const buckets = new Map();
  rows.forEach(function(row) {
    const key = weekBucketNY_(row.scored_at || row.submitted_at);
    if (!key) return;
    if (!buckets.has(key)) {
      buckets.set(key, {
        week: key,
        count: 0,
        sum_decision_quality: 0,
        sum_financial_logic: 0,
        sum_risk_management: 0,
        sum_communication: 0
      });
    }
    const b = buckets.get(key);
    b.count += 1;
    b.sum_decision_quality += asNumber_(row.score_decision_quality, 0);
    b.sum_financial_logic += asNumber_(row.score_financial_logic, 0);
    b.sum_risk_management += asNumber_(row.score_risk_management, 0);
    b.sum_communication += asNumber_(row.score_communication, 0);
  });

  const out = Array.from(buckets.values()).map(function(b) {
    const c = Math.max(1, b.count);
    const avgDecision = Number((b.sum_decision_quality / c).toFixed(2));
    const avgFinancial = Number((b.sum_financial_logic / c).toFixed(2));
    const avgRisk = Number((b.sum_risk_management / c).toFixed(2));
    const avgComm = Number((b.sum_communication / c).toFixed(2));
    return {
      week: b.week,
      count: b.count,
      avg_decision_quality: avgDecision,
      avg_financial_logic: avgFinancial,
      avg_risk_management: avgRisk,
      avg_communication: avgComm,
      overall_avg: Number(((avgDecision + avgFinancial + avgRisk + avgComm) / 4).toFixed(2))
    };
  }).sort(function(a, b) {
    return String(a.week).localeCompare(String(b.week));
  });

  return portalOk_('DECISION_TRENDS_OK', 'Decision trends loaded.', out);
}

function ensureInterventionTemplateSeeds_() {
  const d = readSheet('Intervention_Templates');
  if (d.rows.length) return;
  const seeds = [
    ['TMP_DQ_1', 'DECISION_QUALITY', 'Improve option framing', 'Before deciding, list 2 alternatives and explain tradeoffs.', 'Use decision matrix with pros/cons.', 'TRUE', 1],
    ['TMP_FL_1', 'FINANCIAL_LOGIC', 'Strengthen financial logic', 'Show expected value, cap impact, and downside in one paragraph.', 'Run cap and ROI check before final answer.', 'TRUE', 2],
    ['TMP_RM_1', 'RISK_MANAGEMENT', 'Address hidden risk', 'Name the top risk and add one mitigation step.', 'Add fallback path if primary plan fails.', 'TRUE', 3],
    ['TMP_COM_1', 'COMMUNICATION', 'Tighten communication', 'State recommendation first, then evidence.', 'Use claim-evidence-impact structure.', 'TRUE', 4]
  ];
  d.sh.getRange(2, 1, seeds.length, seeds[0].length).setValues(seeds);
}

function actionAdminGetInterventionTemplates_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  ensureInterventionTemplateSeeds_();
  const rows = listSheetObjects_('Intervention_Templates', false).filter(function(row) {
    return String(row.enabled || 'TRUE').toLowerCase() !== 'false';
  }).sort(function(a, b) {
    return asNumber_(a.sort_order, 9999) - asNumber_(b.sort_order, 9999);
  });
  return portalOk_('INTERVENTION_TEMPLATES_OK', 'Intervention templates loaded.', rows);
}

function getStudentDimensionAverages_(email) {
  const rows = getJournalRows_(email, true);
  if (!rows.length) {
    return {
      decision_quality: 0,
      financial_logic: 0,
      risk_management: 0,
      communication: 0
    };
  }
  const sums = {
    decision_quality: 0,
    financial_logic: 0,
    risk_management: 0,
    communication: 0
  };
  rows.forEach(function(row) {
    sums.decision_quality += asNumber_(row.score_decision_quality, 0);
    sums.financial_logic += asNumber_(row.score_financial_logic, 0);
    sums.risk_management += asNumber_(row.score_risk_management, 0);
    sums.communication += asNumber_(row.score_communication, 0);
  });
  const c = rows.length;
  return {
    decision_quality: Number((sums.decision_quality / c).toFixed(2)),
    financial_logic: Number((sums.financial_logic / c).toFixed(2)),
    risk_management: Number((sums.risk_management / c).toFixed(2)),
    communication: Number((sums.communication / c).toFixed(2))
  };
}

function weakestDimensionLabel_(avg) {
  const pairs = [
    ['Decision Quality', asNumber_(avg.decision_quality, 0)],
    ['Financial Logic', asNumber_(avg.financial_logic, 0)],
    ['Risk Management', asNumber_(avg.risk_management, 0)],
    ['Communication', asNumber_(avg.communication, 0)]
  ].sort(function(a, b) { return a[1] - b[1]; });
  return pairs[0][0];
}

function actionGetNextBestLessons_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};
  const limit = Math.max(1, Math.min(20, asNumber_(data.limit, 5)));
  const trackFilter = String(data.track || '').trim();

  const completed = getCompletedLessonSet_(email);
  const activities = getActivities_(trackFilter, '');
  const avg = getStudentDimensionAverages_(email);
  const weakest = weakestDimensionLabel_(avg);

  const recommendations = [];
  for (let i = 0; i < activities.length; i++) {
    const item = activities[i];
    const key = item.track + '|' + item.module_id + '|' + item.lesson_id;
    if (completed.has(key)) continue;
    recommendations.push({
      track: item.track,
      module_id: item.module_id,
      lesson_id: item.lesson_id,
      lesson_title: item.lesson_title,
      activity_url: item.activity_url,
      reason: 'Recommended to improve ' + weakest + '.',
      priority: recommendations.length + 1
    });
    if (recommendations.length >= limit) break;
  }

  return portalOk_('NEXT_BEST_LESSONS_OK', 'Recommendations loaded.', {
    weakest_dimension: weakest,
    averages: avg,
    recommendations: recommendations
  });
}

function actionAdminGetNegotiationScorecards_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const lessons = listSheetObjects_('Lessons_Published', false);
  const lessonByKey = new Map();
  lessons.forEach(function(row) {
    lessonByKey.set(String(row.lesson_key || ''), row);
  });

  const rows = getJournalRows_('', true).filter(function(row) {
    const role = upper(row.role || '');
    if (role.indexOf('AGENT') >= 0 || role.indexOf('NEGOT') >= 0) return true;
    const lesson = lessonByKey.get(String(row.lesson_key || '')) || {};
    const text = upper(String(lesson.lesson_title || '') + ' ' + String(lesson.case_context || ''));
    return text.indexOf('NEGOTIAT') >= 0 || text.indexOf('CONTRACT') >= 0;
  }).map(function(row) {
    const lesson = lessonByKey.get(String(row.lesson_key || '')) || {};
    return {
      entry_id: String(row.entry_id || ''),
      email: String(row.email || '').toLowerCase(),
      role: String(row.role || ''),
      module_id: String(row.module_id || ''),
      lesson_key: String(row.lesson_key || ''),
      lesson_title: String(lesson.lesson_title || ''),
      score_decision_quality: asNumber_(row.score_decision_quality, 0),
      score_financial_logic: asNumber_(row.score_financial_logic, 0),
      score_risk_management: asNumber_(row.score_risk_management, 0),
      score_communication: asNumber_(row.score_communication, 0),
      coach_note: String(row.coach_note || ''),
      scored_at: row.scored_at || row.submitted_at || ''
    };
  }).sort(function(a, b) {
    return new Date(b.scored_at || 0).getTime() - new Date(a.scored_at || 0).getTime();
  });

  return portalOk_('NEGOTIATION_SCORECARDS_OK', 'Negotiation scorecards loaded.', rows);
}

function getCredentialsSummaryByEmail_(email) {
  const d = readSheet('Credentials');
  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'email', '')).toLowerCase() !== String(email).toLowerCase()) continue;
    out.push({
      track: String(getRowValue(row, d, 'track', '')),
      level: String(getRowValue(row, d, 'level', '')),
      issued_at: getRowValue(row, d, 'issued_at', '')
    });
  }
  return out;
}

function buildStrategicTranscriptSummary_(email, programId) {
  const xp = readSheet('XP_Ledger');
  let xpTotal = 0;
  let claimCount = 0;
  const modules = new Set();
  for (let i = 0; i < xp.rows.length; i++) {
    const row = xp.rows[i];
    if (String(getRowValue(row, xp, 'email', '')).toLowerCase() !== String(email).toLowerCase()) continue;
    xpTotal += asNumber_(getRowValue(row, xp, 'points', 0), 0);
    claimCount += 1;
    modules.add(String(getRowValue(row, xp, 'module', '')));
  }

  const avg = getStudentDimensionAverages_(email);
  const creds = getCredentialsSummaryByEmail_(email);
  return {
    email: String(email).toLowerCase(),
    program_id: String(programId || ''),
    total_claims: claimCount,
    xp_total: xpTotal,
    modules_touched: Array.from(modules.values()),
    avg_decision_quality: avg.decision_quality,
    avg_financial_logic: avg.financial_logic,
    avg_risk_management: avg.risk_management,
    avg_communication: avg.communication,
    credentials: creds
  };
}

function createStrategicTranscriptPdf_(transcriptId, summary) {
  const content = [
    'BOW Strategic Decision Transcript',
    'Transcript ID: ' + transcriptId,
    'Generated: ' + nowIso_(),
    '',
    'Email: ' + summary.email,
    'Program: ' + summary.program_id,
    'Total Claims: ' + summary.total_claims,
    'Total XP: ' + summary.xp_total,
    '',
    'Rubric Averages',
    '- Decision Quality: ' + summary.avg_decision_quality,
    '- Financial Logic: ' + summary.avg_financial_logic,
    '- Risk Management: ' + summary.avg_risk_management,
    '- Communication: ' + summary.avg_communication,
    '',
    'Modules Touched: ' + summary.modules_touched.join(', '),
    '',
    'Credentials',
    summary.credentials.map(function(c) {
      return '- Track ' + c.track + ' ' + c.level + ' (' + c.issued_at + ')';
    }).join('\n')
  ].join('\n');

  const blob = Utilities.newBlob(content, MimeType.PLAIN_TEXT, transcriptId + '.txt')
    .getAs(MimeType.PDF)
    .setName(transcriptId + '.pdf');
  const file = DriveApp.createFile(blob);
  return file.getId();
}

function computeTranscriptHash_(transcriptId, email, issuedAt) {
  const payload = [transcriptId, String(email || '').toLowerCase(), String(issuedAt || '')].join('|');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '').substring(0, 32);
}

function actionGetMyStrategicTranscript_(payload) {
  const email = assertActorEmail_(payload);
  const rows = listSheetObjects_('Strategic_Transcripts', false)
    .filter(function(row) { return String(row.email || '').toLowerCase() === String(email).toLowerCase(); })
    .sort(function(a, b) { return new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime(); });
  return portalOk_('TRANSCRIPTS_OK', 'Strategic transcripts loaded.', rows);
}

function actionGenerateStrategicTranscript_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};
  const programId = String(data.program_id || '').trim();

  const prior = listSheetObjects_('Strategic_Transcripts', false).filter(function(row) {
    return String(row.email || '').toLowerCase() === String(email).toLowerCase();
  });
  const version = prior.length + 1;
  const transcriptId = generateId_('STR');
  const summary = buildStrategicTranscriptSummary_(email, programId);
  const pdfFileId = createStrategicTranscriptPdf_(transcriptId, summary);

  appendObjectRow('Strategic_Transcripts', {
    transcript_id: transcriptId,
    email: email,
    program_id: programId,
    generated_at: _now(),
    summary_json: safeStringify(summary),
    pdf_file_id: pdfFileId,
    verify_status: 'ACTIVE',
    version: version
  });

  const issuedAt = _now();
  appendObjectRow('Transcript_Verify_Index', {
    transcript_id: transcriptId,
    email: email,
    issued_at: issuedAt,
    status: 'ACTIVE',
    hash: computeTranscriptHash_(transcriptId, email, issuedAt),
    expires_at: ''
  });

  return portalOk_('TRANSCRIPT_GENERATED', 'Strategic transcript generated.', {
    transcript_id: transcriptId,
    version: version,
    pdf_file_id: pdfFileId
  });
}

function actionVerifyStrategicTranscript_(payload) {
  const data = payload.data || {};
  const transcriptId = String(data.transcript_id || data.id || '').trim();
  if (!transcriptId) return portalErr_('MISSING_TRANSCRIPT_ID', 'transcript_id is required.', null);

  const verifyRows = listSheetObjects_('Transcript_Verify_Index', false);
  const verify = verifyRows.find(function(row) { return String(row.transcript_id || '') === transcriptId; });
  if (!verify) return portalErr_('TRANSCRIPT_NOT_FOUND', 'Transcript not found.', null);
  if (upper(verify.status || 'ACTIVE') !== 'ACTIVE') {
    return portalErr_('TRANSCRIPT_INACTIVE', 'Transcript is not active.', {
      transcript_id: transcriptId,
      status: String(verify.status || '')
    });
  }

  const trRows = listSheetObjects_('Strategic_Transcripts', false);
  const tr = trRows.find(function(row) { return String(row.transcript_id || '') === transcriptId; });
  if (!tr) return portalErr_('TRANSCRIPT_NOT_FOUND', 'Transcript record not found.', null);

  return portalOk_('TRANSCRIPT_VERIFIED', 'Transcript verified.', {
    transcript_id: transcriptId,
    email: String(tr.email || '').toLowerCase(),
    generated_at: tr.generated_at,
    verify_status: tr.verify_status,
    summary: safeJsonParse_(tr.summary_json, {})
  });
}

function appendRaffleTicketLedger_(email, delta, reason, sourceRef) {
  const bal = getRaffleBalanceByEmail_(email);
  const nextBalance = bal.available + Number(delta || 0);

  appendObjectRow('Raffle_Ticket_Ledger', {
    ts: _now(),
    email: String(email || '').toLowerCase(),
    delta_tickets: Number(delta || 0),
    reason: String(reason || ''),
    source_ref: String(sourceRef || ''),
    balance_after: nextBalance
  });

  return nextBalance;
}

function getEarnedTicketsFromXP_(email) {
  const d = readSheet('XP_Ledger');
  const want = String(email || '').toLowerCase();
  let total = 0;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'email', '')).toLowerCase() !== want) continue;
    total += Number(getRowValue(row, d, 'points', 0)) || 0;
  }

  return Math.floor(total / TICKETS_PER_XP);
}

function getTicketAdjustments_(email) {
  const d = readSheet('Raffle_Ticket_Ledger');
  const want = String(email || '').toLowerCase();
  let delta = 0;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'email', '')).toLowerCase() !== want) continue;
    delta += Number(getRowValue(row, d, 'delta_tickets', 0)) || 0;
  }

  return delta;
}

function getRaffleBalanceByEmail_(email) {
  const earned = getEarnedTicketsFromXP_(email);
  const adjustments = getTicketAdjustments_(email);
  const available = Math.max(0, earned + adjustments);

  return {
    email: String(email || '').toLowerCase(),
    earned: earned,
    adjustments: adjustments,
    available: available,
    formula: 'floor(total_net_xp_earned / 100) + ticket_ledger_adjustments'
  };
}

function getActiveRaffle_() {
  const d = readSheet('Raffles');

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const status = upper(getRowValue(row, d, 'status', ''));
    if (status !== 'ACTIVE') continue;

    return {
      rowNum: i + 2,
      raffle_id: String(getRowValue(row, d, 'raffle_id', '')),
      title: String(getRowValue(row, d, 'title', '')),
      prize: String(getRowValue(row, d, 'prize', '')),
      opens_at: getRowValue(row, d, 'opens_at', ''),
      closes_at: getRowValue(row, d, 'closes_at', ''),
      status: status,
      winner_email: String(getRowValue(row, d, 'winner_email', '')),
      winner_drawn_at: getRowValue(row, d, 'winner_drawn_at', ''),
      created_by: String(getRowValue(row, d, 'created_by', '')),
      created_at: getRowValue(row, d, 'created_at', '')
    };
  }

  return null;
}

function getRaffleById_(raffleId) {
  const d = readSheet('Raffles');
  const want = String(raffleId || '').trim();
  if (!want) return null;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const id = String(getRowValue(row, d, 'raffle_id', '')).trim();
    if (id !== want) continue;

    return {
      sheet: d,
      rowNum: i + 2,
      raffle_id: id,
      title: String(getRowValue(row, d, 'title', '')),
      prize: String(getRowValue(row, d, 'prize', '')),
      opens_at: getRowValue(row, d, 'opens_at', ''),
      closes_at: getRowValue(row, d, 'closes_at', ''),
      status: upper(getRowValue(row, d, 'status', '')),
      winner_email: String(getRowValue(row, d, 'winner_email', '')),
      winner_drawn_at: getRowValue(row, d, 'winner_drawn_at', ''),
      created_by: String(getRowValue(row, d, 'created_by', '')),
      created_at: getRowValue(row, d, 'created_at', '')
    };
  }

  return null;
}

function getRaffleEntries_(raffleId, email) {
  const d = readSheet('Raffle_Entries');
  const wantRaffle = String(raffleId || '').trim();
  const wantEmail = String(email || '').toLowerCase().trim();

  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const rid = String(getRowValue(row, d, 'raffle_id', '')).trim();
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase().trim();

    if (wantRaffle && rid !== wantRaffle) continue;
    if (wantEmail && em !== wantEmail) continue;

    out.push({
      entry_id: String(getRowValue(row, d, 'entry_id', '')),
      raffle_id: rid,
      email: em,
      tickets_spent: Number(getRowValue(row, d, 'tickets_spent', 0)) || 0,
      created_at: getRowValue(row, d, 'created_at', '')
    });
  }

  out.sort(function(a, b) {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return out;
}

function todayKeyNY_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function weekKeyNY_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-ww');
}

function dateMs_(value) {
  const d = new Date(value || 0);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function listSeasons_() {
  return listSheetObjects_('Seasons', true).sort(function(a, b) {
    return dateMs_(b.created_at) - dateMs_(a.created_at);
  });
}

function getSeasonById_(seasonId) {
  const want = String(seasonId || '').trim();
  if (!want) return null;
  const rows = listSeasons_();
  return rows.find(function(row) {
    return String(row.season_id || '').trim() === want;
  }) || null;
}

function getActiveSeason_() {
  const now = Date.now();
  const rows = listSeasons_().filter(function(row) {
    return upper(row.status || '') === 'ACTIVE';
  });
  if (!rows.length) return null;

  for (let i = 0; i < rows.length; i++) {
    const startsAt = dateMs_(rows[i].starts_at);
    const endsAt = dateMs_(rows[i].ends_at);
    const inWindow = (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    if (inWindow) return rows[i];
  }
  return rows[0];
}

function clearOtherActiveSeasons_(keepSeasonId) {
  const keepId = String(keepSeasonId || '').trim();
  const d = readSheet('Seasons');
  const rows = listSheetObjects_('Seasons', true);
  rows.forEach(function(row) {
    if (String(row.season_id || '') === keepId) return;
    if (upper(row.status || '') !== 'ACTIVE') return;
    setCellByKey(d, row._row_num, 'status', 'COMPLETED');
  });
}

function getDisplayNameByEmail_(email) {
  const user = getUserRowByEmail_(email);
  return user ? user.displayName : displayFromEmail(email);
}

function getLeagueBalanceForEntity_(seasonId, scope, email, podId) {
  const d = readSheet('League_Points_Ledger');
  const sid = String(seasonId || '').trim();
  const sc = upper(scope || 'INDIVIDUAL');
  const em = String(email || '').toLowerCase().trim();
  const pid = String(podId || '').trim();
  let total = 0;

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'season_id', '')).trim() !== sid) continue;
    if (upper(getRowValue(row, d, 'scope', 'INDIVIDUAL')) !== sc) continue;
    if (sc === 'POD') {
      if (String(getRowValue(row, d, 'pod_id', '')).trim() !== pid) continue;
    } else {
      if (String(getRowValue(row, d, 'email', '')).toLowerCase().trim() !== em) continue;
    }
    total += asNumber_(getRowValue(row, d, 'delta_points', 0), 0);
  }

  return total;
}

function hasLeaguePointSource_(seasonId, scope, email, podId, sourceRef, reason) {
  const sid = String(seasonId || '').trim();
  const sc = upper(scope || 'INDIVIDUAL');
  const em = String(email || '').toLowerCase().trim();
  const pid = String(podId || '').trim();
  const src = String(sourceRef || '').trim();
  const rs = upper(reason || '');
  if (!sid || !src) return false;

  const d = readSheet('League_Points_Ledger');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'season_id', '')).trim() !== sid) continue;
    if (upper(getRowValue(row, d, 'scope', 'INDIVIDUAL')) !== sc) continue;
    if (String(getRowValue(row, d, 'source_ref', '')).trim() !== src) continue;
    if (rs && upper(getRowValue(row, d, 'reason', '')) !== rs) continue;
    if (sc === 'POD') {
      if (String(getRowValue(row, d, 'pod_id', '')).trim() !== pid) continue;
    } else {
      if (String(getRowValue(row, d, 'email', '')).toLowerCase().trim() !== em) continue;
    }
    return true;
  }
  return false;
}

function appendLeaguePoint_(params) {
  const sid = String(params.season_id || '').trim();
  const scope = upper(params.scope || 'INDIVIDUAL');
  const email = String(params.email || '').toLowerCase().trim();
  const podId = String(params.pod_id || '').trim();
  const deltaPoints = asNumber_(params.delta_points, 0);
  const reason = upper(params.reason || '');
  const sourceRef = String(params.source_ref || '').trim();

  if (!sid || !deltaPoints || !reason) return null;
  if (scope === 'POD' && !podId) return null;
  if (scope !== 'POD' && !email) return null;

  if (hasLeaguePointSource_(sid, scope, email, podId, sourceRef, reason)) {
    return {
      duplicate: true,
      season_id: sid,
      scope: scope,
      email: email,
      pod_id: podId,
      delta_points: deltaPoints,
      reason: reason
    };
  }

  const prior = getLeagueBalanceForEntity_(sid, scope, email, podId);
  const balanceAfter = prior + deltaPoints;

  appendObjectRow('League_Points_Ledger', {
    ts: _now(),
    season_id: sid,
    scope: scope,
    email: email,
    pod_id: podId,
    delta_points: deltaPoints,
    reason: reason,
    source_ref: sourceRef,
    balance_after: balanceAfter
  });

  return {
    duplicate: false,
    season_id: sid,
    scope: scope,
    email: email,
    pod_id: podId,
    delta_points: deltaPoints,
    reason: reason,
    source_ref: sourceRef,
    balance_after: balanceAfter
  };
}

function getActivePodMembership_(email, seasonId) {
  const em = String(email || '').toLowerCase().trim();
  const sid = String(seasonId || '').trim();
  if (!em || !sid) return null;

  const pods = listSheetObjects_('Pods', false)
    .filter(function(row) {
      return String(row.season_id || '').trim() === sid && upper(row.status || 'ACTIVE') === 'ACTIVE';
    });
  const podIds = new Set(pods.map(function(p) { return String(p.pod_id || '').trim(); }));
  if (!podIds.size) return null;

  const members = listSheetObjects_('Pod_Members', true);
  for (let i = 0; i < members.length; i++) {
    const row = members[i];
    if (String(row.email || '').toLowerCase().trim() !== em) continue;
    if (upper(row.status || 'ACTIVE') !== 'ACTIVE') continue;
    const podId = String(row.pod_id || '').trim();
    if (!podIds.has(podId)) continue;
    const pod = pods.find(function(p) { return String(p.pod_id || '') === podId; }) || null;
    return {
      pod_id: podId,
      pod_name: pod ? String(pod.name || '') : '',
      season_id: sid
    };
  }

  return null;
}

function awardLeaguePointsForEmail_(email, deltaPoints, reason, sourceRef, seasonId) {
  const sid = String(seasonId || '').trim() || String((getActiveSeason_() || {}).season_id || '').trim();
  const em = String(email || '').toLowerCase().trim();
  const pts = asNumber_(deltaPoints, 0);
  if (!sid || !em || !pts) return { awarded: false, season_id: sid };

  const individual = appendLeaguePoint_({
    season_id: sid,
    scope: 'INDIVIDUAL',
    email: em,
    delta_points: pts,
    reason: reason,
    source_ref: sourceRef
  });

  const membership = getActivePodMembership_(em, sid);
  let pod = null;
  if (membership && membership.pod_id) {
    pod = appendLeaguePoint_({
      season_id: sid,
      scope: 'POD',
      email: em,
      pod_id: membership.pod_id,
      delta_points: pts,
      reason: reason,
      source_ref: sourceRef
    });
  }

  return {
    awarded: !!(individual && !individual.duplicate),
    season_id: sid,
    individual: individual,
    pod: pod
  };
}

function getLeagueStandings_(scope, seasonId) {
  const sid = String(seasonId || '').trim() || String((getActiveSeason_() || {}).season_id || '').trim();
  const sc = upper(scope || 'INDIVIDUAL');
  if (!sid) return [];

  const d = readSheet('League_Points_Ledger');
  const totals = new Map();

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'season_id', '')).trim() !== sid) continue;
    if (upper(getRowValue(row, d, 'scope', 'INDIVIDUAL')) !== sc) continue;
    const delta = asNumber_(getRowValue(row, d, 'delta_points', 0), 0);
    const key = sc === 'POD'
      ? String(getRowValue(row, d, 'pod_id', '')).trim()
      : String(getRowValue(row, d, 'email', '')).toLowerCase().trim();
    if (!key) continue;
    totals.set(key, (totals.get(key) || 0) + delta);
  }

  let rows = Array.from(totals.entries()).map(function(entry) {
    const key = entry[0];
    const points = entry[1];
    if (sc === 'POD') {
      const pod = listSheetObjects_('Pods', false).find(function(p) { return String(p.pod_id || '').trim() === key; }) || {};
      return {
        key: key,
        pod_id: key,
        label: String(pod.name || key),
        points: points
      };
    }
    return {
      key: key,
      email: key,
      label: getDisplayNameByEmail_(key),
      points: points
    };
  });

  rows.sort(function(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return String(a.label || a.key).localeCompare(String(b.label || b.key));
  });

  rows = rows.map(function(row, idx) {
    return Object.assign({}, row, {
      rank: idx + 1,
      rank_delta: 0
    });
  });

  return rows;
}

function incrementDailyEngagementMetric_(field, delta) {
  const metricField = normalizeHeaderKey(field);
  const allowed = new Set([
    'active_students',
    'claims_submitted',
    'journals_submitted',
    'events_participated',
    'quests_completed',
    'kudos_sent'
  ]);
  if (!allowed.has(metricField)) return;

  const amount = asNumber_(delta, 0);
  if (!amount) return;

  const key = todayKeyNY_();
  const d = readSheet('Engagement_Metrics_Daily');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'date_key', '')).trim() !== key) continue;
    const cur = asNumber_(getRowValue(row, d, metricField, 0), 0);
    setCellByKey(d, i + 2, metricField, cur + amount);
    return;
  }

  appendObjectRow('Engagement_Metrics_Daily', {
    date_key: key,
    active_students: metricField === 'active_students' ? amount : 0,
    claims_submitted: metricField === 'claims_submitted' ? amount : 0,
    journals_submitted: metricField === 'journals_submitted' ? amount : 0,
    events_participated: metricField === 'events_participated' ? amount : 0,
    quests_completed: metricField === 'quests_completed' ? amount : 0,
    kudos_sent: metricField === 'kudos_sent' ? amount : 0
  });
}

function touchStudentEngagement_(email, patch) {
  const em = String(email || '').toLowerCase().trim();
  if (!em) return;

  const row = getUserRowByEmail_(em);
  const userStreak = row ? asNumber_(row.streak, 0) : 0;
  const data = patch || {};
  const d = readSheet('Student_Engagement_State');
  const today = todayKeyNY_();

  for (let i = 0; i < d.rows.length; i++) {
    const curEmail = String(getRowValue(d.rows[i], d, 'email', '')).toLowerCase().trim();
    if (curEmail !== em) continue;
    const lastSeen = getRowValue(d.rows[i], d, 'last_seen_at', '');
    const wasToday = lastSeen ? Utilities.formatDate(new Date(lastSeen), TZ, 'yyyy-MM-dd') === today : false;
    if (!wasToday) incrementDailyEngagementMetric_('active_students', 1);

    setCellByKey(d, i + 2, 'last_seen_at', _now());
    setCellByKey(d, i + 2, 'streak_days', asNumber_(data.streak_days, userStreak));
    if (data.favorite_role !== undefined) setCellByKey(d, i + 2, 'favorite_role', String(data.favorite_role || ''));
    if (data.weekly_goal_json !== undefined) setCellByKey(d, i + 2, 'weekly_goal_json', String(data.weekly_goal_json || ''));
    return;
  }

  incrementDailyEngagementMetric_('active_students', 1);
  appendObjectRow('Student_Engagement_State', {
    email: em,
    streak_days: asNumber_(data.streak_days, userStreak),
    streak_shield_uses_week: 0,
    last_seen_at: _now(),
    favorite_role: String(data.favorite_role || ''),
    weekly_goal_json: String(data.weekly_goal_json || '')
  });
}

function getPodMembers_(podId) {
  const wantPodId = String(podId || '').trim();
  if (!wantPodId) return [];
  return listSheetObjects_('Pod_Members', false)
    .filter(function(row) {
      return String(row.pod_id || '').trim() === wantPodId && upper(row.status || 'ACTIVE') === 'ACTIVE';
    })
    .map(function(row) {
      const email = String(row.email || '').toLowerCase().trim();
      return {
        email: email,
        display_name: getDisplayNameByEmail_(email),
        joined_at: row.joined_at || ''
      };
    })
    .sort(function(a, b) {
      return String(a.display_name || a.email).localeCompare(String(b.display_name || b.email));
    });
}

function listLiveEvents_() {
  return listSheetObjects_('Live_Events', true).sort(function(a, b) {
    return dateMs_(a.open_at) - dateMs_(b.open_at);
  });
}

function getLiveEventById_(eventId) {
  const want = String(eventId || '').trim();
  if (!want) return null;
  return listLiveEvents_().find(function(row) {
    return String(row.event_id || '').trim() === want;
  }) || null;
}

function isLiveEventActiveNow_(eventRow) {
  if (!eventRow) return false;
  if (upper(eventRow.status || '') !== 'ACTIVE') return false;
  const now = Date.now();
  const openAt = dateMs_(eventRow.open_at);
  const closeAt = dateMs_(eventRow.close_at);
  if (openAt && openAt > now) return false;
  if (closeAt && closeAt < now) return false;
  return true;
}

function getEventSubmissionRows_(eventId, email) {
  const wantEvent = String(eventId || '').trim();
  const wantEmail = String(email || '').toLowerCase().trim();
  return listSheetObjects_('Event_Submissions', true)
    .filter(function(row) {
      if (wantEvent && String(row.event_id || '').trim() !== wantEvent) return false;
      if (wantEmail && String(row.email || '').toLowerCase().trim() !== wantEmail) return false;
      return true;
    });
}

function getClaimPointsByCodeForEmail_(email, claimCode) {
  const em = String(email || '').toLowerCase().trim();
  const ref = normCode(claimCode);
  if (!em || !ref) return 0;
  const d = readSheet('XP_Ledger');
  for (let i = d.rows.length - 1; i >= 0; i--) {
    const row = d.rows[i];
    if (String(getRowValue(row, d, 'email', '')).toLowerCase().trim() !== em) continue;
    if (normCode(getRowValue(row, d, 'ref_code', '')) !== ref) continue;
    return asNumber_(getRowValue(row, d, 'points', 0), 0);
  }
  return 0;
}

function awardEventTopBonusesIfNeeded_(eventId) {
  const event = getLiveEventById_(eventId);
  if (!event) return;

  const submissions = getEventSubmissionRows_(eventId, '')
    .filter(function(row) { return upper(row.status || 'SUBMITTED') !== 'REJECTED'; })
    .sort(function(a, b) {
      const scoreDiff = asNumber_(b.score, 0) - asNumber_(a.score, 0);
      if (scoreDiff !== 0) return scoreDiff;
      return dateMs_(a.submitted_at) - dateMs_(b.submitted_at);
    })
    .slice(0, 3);

  const bonuses = [LEAGUE_POINTS.EVENT_TOP_1, LEAGUE_POINTS.EVENT_TOP_2, LEAGUE_POINTS.EVENT_TOP_3];
  for (let i = 0; i < submissions.length; i++) {
    const s = submissions[i];
    const email = String(s.email || '').toLowerCase().trim();
    if (!email) continue;
    const reason = i === 0 ? 'EVENT_TOP_1' : (i === 1 ? 'EVENT_TOP_2' : 'EVENT_TOP_3');
    const sourceRef = String(eventId) + ':' + email + ':' + reason;
    awardLeaguePointsForEmail_(email, bonuses[i], reason, sourceRef, String(event.season_id || ''));
    addNotification_(email, 'Live event bonus', 'You earned a top event bonus (' + bonuses[i] + ' points).', 'EVENT');
  }
}

function getQuestById_(questId) {
  const want = String(questId || '').trim();
  if (!want) return null;
  return listSheetObjects_('Quest_Catalog', true).find(function(row) {
    return String(row.quest_id || '').trim() === want;
  }) || null;
}

function getQuestCompletion_(questId, email) {
  const qid = String(questId || '').trim();
  const em = String(email || '').toLowerCase().trim();
  if (!qid || !em) return null;
  return listSheetObjects_('Quest_Completions', true).find(function(row) {
    return String(row.quest_id || '').trim() === qid &&
      String(row.email || '').toLowerCase().trim() === em &&
      upper(row.status || 'CLAIMED') === 'CLAIMED';
  }) || null;
}

function getStudentQuestProgress_(questRow, email) {
  const em = String(email || '').toLowerCase().trim();
  const targetType = upper(questRow.target_type || '');
  const target = safeJsonParse_(questRow.target_json, {}) || {};
  const requiredCount = Math.max(1, asNumber_(target.count !== undefined ? target.count : target.value, 1));
  let current = 0;

  if (targetType === 'CLAIM_COUNT') {
    const d = readSheet('XP_Ledger');
    for (let i = 0; i < d.rows.length; i++) {
      if (String(getRowValue(d.rows[i], d, 'email', '')).toLowerCase().trim() !== em) continue;
      current += 1;
    }
  } else if (targetType === 'JOURNAL_COUNT') {
    current = getJournalRows_(em, false).length;
  } else if (targetType === 'EVENT_PARTICIPATION') {
    current = getEventSubmissionRows_('', em).length;
  } else if (targetType === 'STREAK_MILESTONE') {
    const user = getUserRowByEmail_(em);
    current = user ? asNumber_(user.streak, 0) : 0;
  }

  return {
    target_type: targetType,
    required: requiredCount,
    current: current,
    met: current >= requiredCount
  };
}

function actionGetActiveSeason_(payload) {
  const season = getActiveSeason_();
  if (!season) return portalOk_('ACTIVE_SEASON_OK', 'No active season.', null);

  const now = Date.now();
  const endsAt = dateMs_(season.ends_at);
  const msRemaining = endsAt ? Math.max(0, endsAt - now) : 0;
  return portalOk_('ACTIVE_SEASON_OK', 'Active season loaded.', {
    season_id: String(season.season_id || ''),
    title: String(season.title || ''),
    starts_at: season.starts_at || '',
    ends_at: season.ends_at || '',
    status: String(season.status || 'ACTIVE'),
    ms_remaining: msRemaining
  });
}

function actionGetLeagueStandings_(payload) {
  const data = payload.data || {};
  const scope = upper(data.scope || 'INDIVIDUAL');
  const seasonId = String(data.season_id || '').trim();
  const rows = getLeagueStandings_(scope, seasonId);
  return portalOk_('LEAGUE_STANDINGS_OK', 'League standings loaded.', {
    scope: scope,
    season_id: seasonId || String((getActiveSeason_() || {}).season_id || ''),
    rows: rows,
    recent_points: rows.slice(0, 10)
  });
}

function actionGetMyPod_(payload) {
  const email = assertActorEmail_(payload);
  const season = getActiveSeason_();
  if (!season) return portalOk_('MY_POD_OK', 'No active season.', null);

  const membership = getActivePodMembership_(email, season.season_id);
  if (!membership) return portalOk_('MY_POD_OK', 'No pod assigned.', null);

  const pod = listSheetObjects_('Pods', false).find(function(row) {
    return String(row.pod_id || '').trim() === String(membership.pod_id || '').trim();
  }) || {};
  const members = getPodMembers_(membership.pod_id);
  const podStandings = getLeagueStandings_('POD', season.season_id);
  const podRankRow = podStandings.find(function(row) { return String(row.pod_id || '') === String(membership.pod_id || ''); }) || {};

  const kudos = listSheetObjects_('Pod_Kudos', false)
    .filter(function(row) { return String(row.pod_id || '') === String(membership.pod_id || ''); })
    .sort(function(a, b) { return dateMs_(b.created_at) - dateMs_(a.created_at); })
    .slice(0, 25)
    .map(function(row) {
      return {
        kudos_id: String(row.kudos_id || ''),
        from_email: String(row.from_email || '').toLowerCase(),
        to_email: String(row.to_email || '').toLowerCase(),
        from_display: getDisplayNameByEmail_(row.from_email || ''),
        to_display: getDisplayNameByEmail_(row.to_email || ''),
        message: String(row.message || ''),
        created_at: row.created_at || ''
      };
    });

  return portalOk_('MY_POD_OK', 'Pod details loaded.', {
    season_id: String(season.season_id || ''),
    pod_id: String(membership.pod_id || ''),
    pod_name: String(pod.name || membership.pod_name || ''),
    rank: asNumber_(podRankRow.rank, 0),
    points: asNumber_(podRankRow.points, 0),
    members: members,
    recent_kudos: kudos
  });
}

function actionSendPodKudos_(payload) {
  const email = assertActorEmail_(payload);
  if (!rateLimitAllowed_(email, 'POD_KUDOS', 1, 3)) {
    return rateLimitErr_('POD_KUDOS', 1, 3, 'Too many kudos requests. Please wait a minute.');
  }
  const data = payload.data || {};
  const podId = String(data.pod_id || '').trim();
  const targetEmail = String(data.target_email || '').toLowerCase().trim();
  const message = String(data.message || '').trim();
  if (!podId || !targetEmail || !message) {
    return portalErr_('MISSING_KUDOS_FIELDS', 'pod_id, target_email, and message are required.', null);
  }

  const season = getActiveSeason_();
  if (!season) return portalErr_('NO_ACTIVE_SEASON', 'No active season.', null);

  const senderMembership = getActivePodMembership_(email, season.season_id);
  const targetMembership = getActivePodMembership_(targetEmail, season.season_id);
  if (!senderMembership || !targetMembership) {
    return portalErr_('POD_MEMBERSHIP_REQUIRED', 'Both users must be in active pods.', null);
  }
  if (String(senderMembership.pod_id) !== String(targetMembership.pod_id) || String(senderMembership.pod_id) !== podId) {
    return portalErr_('POD_MISMATCH', 'Kudos can only be sent within your pod.', null);
  }

  const today = todayKeyNY_();
  const sentToday = listSheetObjects_('Pod_Kudos', false).filter(function(row) {
    if (String(row.from_email || '').toLowerCase().trim() !== email) return false;
    const ts = row.created_at ? Utilities.formatDate(new Date(row.created_at), TZ, 'yyyy-MM-dd') : '';
    return ts === today;
  }).length;
  if (sentToday >= 3) {
    return portalErr_('KUDOS_DAILY_CAP_REACHED', 'Daily kudos cap reached (3).', { daily_cap: 3 });
  }

  const kudosId = generateId_('KDS');
  appendObjectRow('Pod_Kudos', {
    kudos_id: kudosId,
    pod_id: podId,
    from_email: email,
    to_email: targetEmail,
    message: message,
    created_at: _now()
  });

  awardLeaguePointsForEmail_(email, LEAGUE_POINTS.POD_KUDOS, 'POD_KUDOS', kudosId, season.season_id);
  incrementDailyEngagementMetric_('kudos_sent', 1);
  touchStudentEngagement_(email);

  addNotification_(targetEmail, 'Pod kudos', getDisplayNameByEmail_(email) + ': ' + message, 'POD');
  return portalOk_('KUDOS_SENT', 'Kudos sent.', { kudos_id: kudosId, awarded_points: LEAGUE_POINTS.POD_KUDOS });
}

function actionGetActiveEvents_(payload) {
  const email = assertActorEmail_(payload);
  const season = getActiveSeason_();
  const seasonId = String((season || {}).season_id || '');
  const rows = listLiveEvents_()
    .filter(function(row) {
      if (!seasonId) return false;
      if (String(row.season_id || '') !== seasonId) return false;
      return isLiveEventActiveNow_(row);
    })
    .map(function(row) {
      const already = getEventSubmissionRows_(String(row.event_id || ''), email).length > 0;
      return {
        event_id: String(row.event_id || ''),
        season_id: String(row.season_id || ''),
        title: String(row.title || ''),
        description: String(row.description || ''),
        track: String(row.track || ''),
        module: String(row.module || ''),
        open_at: row.open_at || '',
        close_at: row.close_at || '',
        rules_json: String(row.rules_json || ''),
        status: String(row.status || ''),
        already_submitted: already
      };
    });
  return portalOk_('ACTIVE_EVENTS_OK', 'Active events loaded.', rows);
}

function actionSubmitEventEntry_(payload) {
  const email = assertActorEmail_(payload);
  if (!rateLimitAllowed_(email, 'EVENT_SUBMIT', 1, 2)) {
    return rateLimitErr_('EVENT_SUBMIT', 1, 2, 'Too many event submissions. Please wait a minute.');
  }
  const data = payload.data || {};
  const eventId = String(data.event_id || '').trim();
  const claimCode = normCode(data.claim_code || '');
  const reflection = String(data.reflection_note || '').trim();
  if (!eventId || !claimCode) {
    return portalErr_('MISSING_EVENT_SUBMISSION_FIELDS', 'event_id and claim_code are required.', null);
  }

  const eventRow = getLiveEventById_(eventId);
  if (!eventRow) return portalErr_('EVENT_NOT_FOUND', 'Event not found.', null);
  if (!isLiveEventActiveNow_(eventRow)) return portalErr_('EVENT_NOT_ACTIVE', 'Event is not active.', null);

  const existing = getEventSubmissionRows_(eventId, email);
  if (existing.length) return portalErr_('EVENT_ALREADY_SUBMITTED', 'You already submitted this event.', null);

  const claimContext = findClaimContextByCodeForEmail_(email, claimCode);
  if (!claimContext) return portalErr_('CLAIM_NOT_FOUND_FOR_EVENT', 'You must submit a valid claimed code.', null);

  if (String(eventRow.track || '').trim() && String(claimContext.track || '').trim() !== String(eventRow.track || '').trim()) {
    return portalErr_('EVENT_TRACK_MISMATCH', 'Claim code track does not match event track.', null);
  }
  if (String(eventRow.module || '').trim() &&
      normalizeModuleKey(claimContext.module_id) !== normalizeModuleKey(eventRow.module)) {
    return portalErr_('EVENT_MODULE_MISMATCH', 'Claim code module does not match event module.', null);
  }

  const score = getClaimPointsByCodeForEmail_(email, claimCode);
  const submissionId = generateId_('EVS');
  appendObjectRow('Event_Submissions', {
    submission_id: submissionId,
    event_id: eventId,
    email: email,
    claim_code: claimCode,
    score: score,
    status: 'SUBMITTED',
    submitted_at: _now(),
    reviewed_at: '',
    reviewed_by: '',
    notes: reflection
  });

  awardLeaguePointsForEmail_(email, LEAGUE_POINTS.EVENT_PARTICIPATION, 'EVENT_PARTICIPATION', submissionId, String(eventRow.season_id || ''));
  incrementDailyEngagementMetric_('events_participated', 1);
  touchStudentEngagement_(email);

  addNotification_(email, 'Live event submitted', 'You earned participation points for event ' + eventId + '.', 'EVENT');
  return portalOk_('EVENT_SUBMITTED', 'Event submission accepted.', {
    submission_id: submissionId,
    event_id: eventId,
    score: score,
    awarded_points: LEAGUE_POINTS.EVENT_PARTICIPATION
  });
}

function actionGetMyQuests_(payload) {
  const email = assertActorEmail_(payload);
  const quests = listSheetObjects_('Quest_Catalog', false)
    .filter(function(row) { return String(row.enabled || 'TRUE').toLowerCase() !== 'false'; })
    .sort(function(a, b) { return asNumber_(a.sort_order, 9999) - asNumber_(b.sort_order, 9999); });

  const rows = quests.map(function(row) {
    const questId = String(row.quest_id || '');
    const progress = getStudentQuestProgress_(row, email);
    const completion = getQuestCompletion_(questId, email);
    return {
      quest_id: questId,
      title: String(row.title || ''),
      description: String(row.description || ''),
      difficulty: String(row.difficulty || ''),
      reward_points: asNumber_(row.reward_points, 0),
      reward_badge: String(row.reward_badge || ''),
      target_type: progress.target_type,
      progress: progress.current,
      required: progress.required,
      met: progress.met,
      claimed: !!completion
    };
  });

  return portalOk_('MY_QUESTS_OK', 'Quests loaded.', rows);
}

function actionClaimQuestReward_(payload) {
  const email = assertActorEmail_(payload);
  if (!rateLimitAllowed_(email, 'QUEST_CLAIM', 1, 3)) {
    return rateLimitErr_('QUEST_CLAIM', 1, 3, 'Too many quest claims. Please wait a minute.');
  }
  const data = payload.data || {};
  const questId = String(data.quest_id || '').trim();
  if (!questId) return portalErr_('MISSING_QUEST_ID', 'quest_id is required.', null);

  const quest = getQuestById_(questId);
  if (!quest) return portalErr_('QUEST_NOT_FOUND', 'Quest not found.', null);
  if (String(quest.enabled || 'TRUE').toLowerCase() === 'false') {
    return portalErr_('QUEST_DISABLED', 'Quest is not enabled.', null);
  }

  const existing = getQuestCompletion_(questId, email);
  if (existing) return portalErr_('QUEST_ALREADY_CLAIMED', 'Quest reward already claimed.', null);

  const progress = getStudentQuestProgress_(quest, email);
  if (!progress.met) {
    return portalErr_('QUEST_NOT_COMPLETE', 'Quest target not completed yet.', {
      current: progress.current,
      required: progress.required
    });
  }

  const completionId = generateId_('QCM');
  const rewardPoints = asNumber_(quest.reward_points, 0);
  appendObjectRow('Quest_Completions', {
    completion_id: completionId,
    quest_id: questId,
    email: email,
    status: 'CLAIMED',
    awarded_points: rewardPoints,
    awarded_at: _now(),
    source_ref: questId
  });

  if (rewardPoints > 0) {
    awardLeaguePointsForEmail_(email, rewardPoints, 'QUEST_REWARD', completionId, '');
  }
  if (String(quest.reward_badge || '').trim()) {
    grantBadge(email, String(quest.reward_badge || '').trim());
  }

  incrementDailyEngagementMetric_('quests_completed', 1);
  touchStudentEngagement_(email);
  addNotification_(email, 'Quest reward claimed', 'Quest "' + String(quest.title || questId) + '" reward claimed.', 'QUEST');

  return portalOk_('QUEST_REWARD_CLAIMED', 'Quest reward claimed.', {
    completion_id: completionId,
    quest_id: questId,
    awarded_points: rewardPoints,
    awarded_badge: String(quest.reward_badge || '')
  });
}

function actionGetMyRewards_(payload) {
  const email = assertActorEmail_(payload);
  const state = listSheetObjects_('Student_Engagement_State', false).find(function(row) {
    return String(row.email || '').toLowerCase().trim() === email;
  }) || {};

  const individualRows = listSheetObjects_('League_Points_Ledger', false)
    .filter(function(row) {
      return upper(row.scope || 'INDIVIDUAL') === 'INDIVIDUAL' &&
        String(row.email || '').toLowerCase().trim() === email;
    })
    .sort(function(a, b) { return dateMs_(b.ts) - dateMs_(a.ts); })
    .slice(0, 25)
    .map(function(row) {
      return {
        ts: row.ts || '',
        delta_points: asNumber_(row.delta_points, 0),
        reason: String(row.reason || ''),
        source_ref: String(row.source_ref || '')
      };
    });

  const rewards = {
    streak_days: asNumber_(state.streak_days, asNumber_((getUserRowByEmail_(email) || {}).streak, 0)),
    streak_shield_uses_week: asNumber_(state.streak_shield_uses_week, 0),
    weekly_goal_json: String(state.weekly_goal_json || ''),
    favorite_role: String(state.favorite_role || ''),
    recent_points: individualRows,
    quest_claims: listSheetObjects_('Quest_Completions', false)
      .filter(function(row) {
        return String(row.email || '').toLowerCase().trim() === email && upper(row.status || '') === 'CLAIMED';
      })
      .sort(function(a, b) { return dateMs_(b.awarded_at) - dateMs_(a.awarded_at); })
      .slice(0, 25)
  };

  return portalOk_('MY_REWARDS_OK', 'Rewards loaded.', rewards);
}

function actionAdminCreateSeason_(payload) {
  requirePortalRole_(payload, ['ADMIN']);
  const data = payload.data || {};
  const title = String(data.title || '').trim();
  const startsAt = data.starts_at ? new Date(data.starts_at) : _now();
  const endsAt = data.ends_at ? new Date(data.ends_at) : '';
  const status = upper(data.status || 'ACTIVE') || 'ACTIVE';
  if (!title) return portalErr_('MISSING_SEASON_TITLE', 'title is required.', null);

  const seasonId = generateId_('SEA');
  appendObjectRow('Seasons', {
    season_id: seasonId,
    title: title,
    starts_at: startsAt,
    ends_at: endsAt,
    status: status,
    created_by: String(payload.actorEmail || '').toLowerCase(),
    created_at: _now()
  });

  if (status === 'ACTIVE') clearOtherActiveSeasons_(seasonId);
  return portalOk_('SEASON_CREATED', 'Season created.', {
    season_id: seasonId,
    title: title,
    status: status
  });
}

function actionAdminListSeasons_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const rows = listSeasons_().map(function(row) {
    const seasonId = String(row.season_id || '');
    const participantSet = new Set(
      listSheetObjects_('League_Points_Ledger', false)
        .filter(function(lp) {
          return String(lp.season_id || '') === seasonId && upper(lp.scope || '') === 'INDIVIDUAL';
        })
        .map(function(lp) { return String(lp.email || '').toLowerCase().trim(); })
    );
    const eventCount = listSheetObjects_('Live_Events', false).filter(function(ev) {
      return String(ev.season_id || '') === seasonId;
    }).length;
    return Object.assign({}, stripRuntimeKeys_(row), {
      participant_count: participantSet.size,
      event_count: eventCount
    });
  });
  return portalOk_('SEASONS_OK', 'Seasons loaded.', rows);
}

function actionAdminUpsertEvent_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const eventId = String(data.event_id || '').trim() || generateId_('EVT');
  const seasonId = String(data.season_id || (getActiveSeason_() || {}).season_id || '').trim();
  const title = String(data.title || '').trim();
  if (!seasonId || !title) return portalErr_('MISSING_EVENT_FIELDS', 'season_id and title are required.', null);

  const d = readSheet('Live_Events');
  const rows = listSheetObjects_('Live_Events', true);
  const openAt = data.open_at ? new Date(data.open_at) : _now();
  const closeAt = data.close_at ? new Date(data.close_at) : '';
  const status = upper(data.status || 'ACTIVE') || 'ACTIVE';

  let found = null;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].event_id || '') === eventId) {
      found = rows[i];
      break;
    }
  }

  if (found) {
    setCellByKey(d, found._row_num, 'season_id', seasonId);
    setCellByKey(d, found._row_num, 'title', title);
    setCellByKey(d, found._row_num, 'description', String(data.description || found.description || ''));
    setCellByKey(d, found._row_num, 'track', String(data.track || found.track || ''));
    setCellByKey(d, found._row_num, 'module', String(data.module || found.module || ''));
    setCellByKey(d, found._row_num, 'open_at', openAt);
    setCellByKey(d, found._row_num, 'close_at', closeAt);
    setCellByKey(d, found._row_num, 'rules_json', String(data.rules_json || found.rules_json || '{}'));
    setCellByKey(d, found._row_num, 'status', status);
  } else {
    appendObjectRow('Live_Events', {
      event_id: eventId,
      season_id: seasonId,
      title: title,
      description: String(data.description || ''),
      track: String(data.track || ''),
      module: String(data.module || ''),
      open_at: openAt,
      close_at: closeAt,
      rules_json: String(data.rules_json || '{}'),
      status: status,
      created_by: String(payload.actorEmail || '').toLowerCase(),
      created_at: _now()
    });
  }

  if (status === 'ACTIVE') {
    const updated = readSheet('Live_Events');
    const all = listSheetObjects_('Live_Events', true);
    all.forEach(function(row) {
      if (String(row.event_id || '') === eventId) return;
      if (String(row.season_id || '') !== seasonId) return;
      if (String(row.track || '') !== String(data.track || row.track || '')) return;
      if (upper(row.status || '') === 'ACTIVE') {
        setCellByKey(updated, row._row_num, 'status', 'SCHEDULED');
      }
    });
  }

  if (status === 'CLOSED') {
    awardEventTopBonusesIfNeeded_(eventId);
  }

  return portalOk_('EVENT_UPSERT_OK', 'Event saved.', {
    event_id: eventId,
    season_id: seasonId,
    status: status
  });
}

function actionAdminListEvents_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const seasonId = String(data.season_id || '').trim();

  const rows = listLiveEvents_().filter(function(row) {
    if (!seasonId) return true;
    return String(row.season_id || '') === seasonId;
  }).map(function(row) {
    const eventId = String(row.event_id || '');
    const submissions = getEventSubmissionRows_(eventId, '');
    const participants = new Set(submissions.map(function(s) { return String(s.email || '').toLowerCase(); }));
    const completed = submissions.filter(function(s) { return upper(s.status || '') === 'SCORED'; }).length;
    return Object.assign({}, stripRuntimeKeys_(row), {
      submission_count: submissions.length,
      participant_count: participants.size,
      completed_count: completed
    });
  });

  return portalOk_('EVENTS_OK', 'Events loaded.', rows);
}

function actionAdminAssignPods_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const seasonId = String(data.season_id || (getActiveSeason_() || {}).season_id || '').trim();
  if (!seasonId) return portalErr_('MISSING_SEASON_ID', 'season_id is required.', null);
  const podSize = Math.max(2, Math.min(8, asNumber_(data.pod_size, DEFAULT_POD_SIZE)));

  const users = listSheetObjects_('Portal_Users', false)
    .filter(function(row) {
      return upper(row.status || 'ACTIVE') === 'ACTIVE' && upper(row.role || 'STUDENT') === 'STUDENT';
    })
    .map(function(row) { return String(row.email || '').toLowerCase().trim(); })
    .filter(function(em) { return !!em; })
    .sort();

  if (!users.length) return portalErr_('NO_STUDENTS', 'No active students available for assignment.', null);

  const now = _now();
  const podsSheet = readSheet('Pods');
  const memberSheet = readSheet('Pod_Members');

  const existingPods = listSheetObjects_('Pods', true).filter(function(row) {
    return String(row.season_id || '') === seasonId && upper(row.status || 'ACTIVE') === 'ACTIVE';
  });
  existingPods.forEach(function(row) {
    setCellByKey(podsSheet, row._row_num, 'status', 'ARCHIVED');
  });

  const existingPodIds = new Set(existingPods.map(function(row) { return String(row.pod_id || ''); }));
  const members = listSheetObjects_('Pod_Members', true);
  members.forEach(function(row) {
    if (!existingPodIds.has(String(row.pod_id || ''))) return;
    if (upper(row.status || 'ACTIVE') !== 'ACTIVE') return;
    setCellByKey(memberSheet, row._row_num, 'status', 'INACTIVE');
    setCellByKey(memberSheet, row._row_num, 'left_at', now);
  });

  const podCount = Math.max(1, Math.ceil(users.length / podSize));
  const podIds = [];
  for (let i = 0; i < podCount; i++) {
    const podId = generateId_('POD');
    const name = 'Pod ' + String.fromCharCode(65 + i);
    appendObjectRow('Pods', {
      pod_id: podId,
      name: name,
      season_id: seasonId,
      status: 'ACTIVE',
      created_at: now,
      created_by: String(payload.actorEmail || '').toLowerCase()
    });
    podIds.push({ pod_id: podId, name: name });
  }

  for (let i = 0; i < users.length; i++) {
    const bucket = i % podCount;
    appendObjectRow('Pod_Members', {
      pod_id: podIds[bucket].pod_id,
      email: users[i],
      joined_at: now,
      left_at: '',
      status: 'ACTIVE'
    });
  }

  return portalOk_('PODS_ASSIGNED', 'Pods assigned.', {
    season_id: seasonId,
    pod_size: podSize,
    pod_count: podCount,
    student_count: users.length
  });
}

function actionAdminListPods_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const seasonId = String(data.season_id || (getActiveSeason_() || {}).season_id || '').trim();
  if (!seasonId) return portalOk_('PODS_OK', 'No active season.', []);

  const standings = getLeagueStandings_('POD', seasonId);
  const pointsByPod = new Map(standings.map(function(row) {
    return [String(row.pod_id || ''), asNumber_(row.points, 0)];
  }));

  const pods = listSheetObjects_('Pods', false).filter(function(row) {
    return String(row.season_id || '') === seasonId;
  }).map(function(row) {
    const podId = String(row.pod_id || '');
    const members = getPodMembers_(podId);
    return {
      pod_id: podId,
      name: String(row.name || ''),
      season_id: seasonId,
      status: String(row.status || ''),
      member_count: members.length,
      points: asNumber_(pointsByPod.get(podId), 0),
      members: members
    };
  }).sort(function(a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return String(a.name).localeCompare(String(b.name));
  });

  return portalOk_('PODS_OK', 'Pods loaded.', pods);
}

function actionAdminUpsertQuest_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const questId = String(data.quest_id || '').trim() || generateId_('QST');
  const title = String(data.title || '').trim();
  const targetType = upper(data.target_type || '');
  if (!title || !targetType) {
    return portalErr_('MISSING_QUEST_FIELDS', 'title and target_type are required.', null);
  }

  const d = readSheet('Quest_Catalog');
  const rows = listSheetObjects_('Quest_Catalog', true);
  const targetJson = typeof data.target_json === 'string'
    ? data.target_json
    : safeStringify(data.target_json || { count: 1 });
  const rewardPoints = asNumber_(data.reward_points, 0);
  const enabled = data.enabled === false ? 'FALSE' : 'TRUE';
  const sortOrder = asNumber_(data.sort_order, rows.length + 1);

  const existing = rows.find(function(row) { return String(row.quest_id || '') === questId; }) || null;
  if (existing) {
    setCellByKey(d, existing._row_num, 'title', title);
    setCellByKey(d, existing._row_num, 'description', String(data.description || existing.description || ''));
    setCellByKey(d, existing._row_num, 'target_type', targetType);
    setCellByKey(d, existing._row_num, 'target_json', targetJson);
    setCellByKey(d, existing._row_num, 'reward_points', rewardPoints);
    setCellByKey(d, existing._row_num, 'reward_badge', String(data.reward_badge || existing.reward_badge || ''));
    setCellByKey(d, existing._row_num, 'difficulty', String(data.difficulty || existing.difficulty || ''));
    setCellByKey(d, existing._row_num, 'enabled', enabled);
    setCellByKey(d, existing._row_num, 'sort_order', sortOrder);
  } else {
    appendObjectRow('Quest_Catalog', {
      quest_id: questId,
      title: title,
      description: String(data.description || ''),
      target_type: targetType,
      target_json: targetJson,
      reward_points: rewardPoints,
      reward_badge: String(data.reward_badge || ''),
      difficulty: String(data.difficulty || ''),
      enabled: enabled,
      sort_order: sortOrder
    });
  }

  return portalOk_('QUEST_UPSERT_OK', 'Quest saved.', { quest_id: questId });
}

function actionAdminListQuests_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const rows = listSheetObjects_('Quest_Catalog', false).sort(function(a, b) {
    return asNumber_(a.sort_order, 9999) - asNumber_(b.sort_order, 9999);
  });
  return portalOk_('QUESTS_OK', 'Quests loaded.', rows);
}

function getEngagementMetricRows_(daysBack) {
  const rows = listSheetObjects_('Engagement_Metrics_Daily', false);
  const days = Math.max(1, asNumber_(daysBack, 7));
  const since = Date.now() - (days * 24 * 60 * 60 * 1000);
  return rows.filter(function(row) {
    return dateMs_(row.date_key) >= since;
  });
}

function actionAdminGetEngagementOverview_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const days = Math.max(1, asNumber_(data.days, 7));

  const metricRows = getEngagementMetricRows_(days);
  const sums = {
    active_students: 0,
    claims_submitted: 0,
    journals_submitted: 0,
    events_participated: 0,
    quests_completed: 0,
    kudos_sent: 0
  };
  metricRows.forEach(function(row) {
    sums.active_students += asNumber_(row.active_students, 0);
    sums.claims_submitted += asNumber_(row.claims_submitted, 0);
    sums.journals_submitted += asNumber_(row.journals_submitted, 0);
    sums.events_participated += asNumber_(row.events_participated, 0);
    sums.quests_completed += asNumber_(row.quests_completed, 0);
    sums.kudos_sent += asNumber_(row.kudos_sent, 0);
  });

  const activeEvents = actionGetActiveEvents_(payload).data || [];
  const activeSeason = getActiveSeason_();
  const standings = getLeagueStandings_('INDIVIDUAL', String((activeSeason || {}).season_id || '')).slice(0, 10);

  return portalOk_('ENGAGEMENT_OVERVIEW_OK', 'Engagement overview loaded.', {
    window_days: days,
    totals: sums,
    active_season: activeSeason,
    active_events: activeEvents,
    top_individuals: standings
  });
}

function actionAdminGetEngagementDropoff_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const now = Date.now();
  const since7d = now - (7 * 24 * 60 * 60 * 1000);

  const users = readSheet('Users');
  const xp = readSheet('XP_Ledger');
  const journal = readSheet('Decision_Journal');
  const events = readSheet('Event_Submissions');

  const out = [];
  for (let i = 0; i < users.rows.length; i++) {
    const row = users.rows[i];
    const email = String(getRowValue(row, users, 'email', '')).toLowerCase().trim();
    if (!email) continue;

    const lastActiveMs = dateMs_(getRowValue(row, users, 'last_active', ''));
    const inactivityDays = lastActiveMs ? Math.floor((now - lastActiveMs) / (24 * 60 * 60 * 1000)) : 999;

    let actions7d = 0;
    for (let j = 0; j < xp.rows.length; j++) {
      if (String(getRowValue(xp.rows[j], xp, 'email', '')).toLowerCase().trim() !== email) continue;
      if (dateMs_(getRowValue(xp.rows[j], xp, 'ts', '')) >= since7d) actions7d += 1;
    }
    for (let j = 0; j < journal.rows.length; j++) {
      if (String(getRowValue(journal.rows[j], journal, 'email', '')).toLowerCase().trim() !== email) continue;
      if (dateMs_(getRowValue(journal.rows[j], journal, 'submitted_at', '')) >= since7d) actions7d += 1;
    }
    for (let j = 0; j < events.rows.length; j++) {
      if (String(getRowValue(events.rows[j], events, 'email', '')).toLowerCase().trim() !== email) continue;
      if (dateMs_(getRowValue(events.rows[j], events, 'submitted_at', '')) >= since7d) actions7d += 1;
    }

    if (inactivityDays < 4 && actions7d >= 3) continue;

    out.push({
      email: email,
      display_name: String(getRowValue(row, users, 'display_name', '') || displayFromEmail(email)),
      level: asNumber_(getRowValue(row, users, 'level', 1), 1),
      xp: asNumber_(getRowValue(row, users, 'xp', 0), 0),
      inactivity_days: inactivityDays,
      actions_7d: actions7d,
      reason: inactivityDays >= 7 ? 'INACTIVE_7D' : 'LOW_ACTIVITY_7D'
    });
  }

  out.sort(function(a, b) {
    if (b.inactivity_days !== a.inactivity_days) return b.inactivity_days - a.inactivity_days;
    if (a.actions_7d !== b.actions_7d) return a.actions_7d - b.actions_7d;
    return String(a.email).localeCompare(String(b.email));
  });

  return portalOk_('ENGAGEMENT_DROPOFF_OK', 'Dropoff list loaded.', out);
}

function actionGetHomeFeed_(payload) {
  const email = assertActorEmail_(payload);
  touchStudentEngagement_(email);

  const activeSeason = getActiveSeason_();
  const activeEvents = actionGetActiveEvents_(payload).data || [];
  const myPod = actionGetMyPod_(payload).data || null;
  const rewards = actionGetMyRewards_(payload).data || {};
  const standings = getLeagueStandings_('INDIVIDUAL', String((activeSeason || {}).season_id || '')).slice(0, 10);
  const myStanding = standings.find(function(row) { return String(row.email || '').toLowerCase() === email; }) || null;

  const assignments = actionGetAssignments_(payload).data || [];
  const now = Date.now();
  const overdue = assignments.find(function(a) {
    const status = upper(a.status || '');
    const dueAt = dateMs_(a.due_at);
    return status !== 'COMPLETED' && dueAt && dueAt < now;
  }) || null;

  const rec = actionGetNextBestLessons_({
    actorEmail: email,
    actorRole: payload.actorRole,
    data: { limit: 1 }
  }).data || { recommendations: [] };
  const bestRec = (rec.recommendations || [])[0] || null;

  const quickActions = [];
  if (overdue) {
    quickActions.push({
      kind: 'ASSIGNMENT',
      title: 'Finish overdue assignment',
      subtitle: String(overdue.title || ''),
      href: '/assignments',
      priority: 1
    });
  } else {
    quickActions.push({
      kind: 'CLAIM',
      title: 'Submit today\'s claim code',
      subtitle: 'Keep your streak and earn XP.',
      href: '/claim',
      priority: 1
    });
  }

  if (activeEvents.length) {
    quickActions.push({
      kind: 'EVENT',
      title: 'Join live event',
      subtitle: String(activeEvents[0].title || ''),
      href: '/events',
      priority: 2
    });
  } else {
    quickActions.push({
      kind: 'LEAGUE',
      title: 'Check league standings',
      subtitle: 'See where you rank this season.',
      href: '/leaderboard',
      priority: 2
    });
  }

  if (bestRec) {
    quickActions.push({
      kind: 'LEARNING',
      title: 'Next best lesson',
      subtitle: String(bestRec.lesson_title || ('Module ' + bestRec.module_id + ' · Lesson ' + bestRec.lesson_id)),
      href: '/recommended',
      priority: 3
    });
  } else {
    quickActions.push({
      kind: 'JOURNAL',
      title: 'Reflect in your journal',
      subtitle: 'Lock in your decision-making growth.',
      href: '/journal',
      priority: 3
    });
  }

  return portalOk_('HOME_FEED_OK', 'Home feed loaded.', {
    season: activeSeason,
    quick_actions: quickActions.slice(0, 3),
    active_events: activeEvents.slice(0, 5),
    pod: myPod,
    my_standing: myStanding,
    rewards: rewards
  });
}

function submitClaimFromPortal_(payload) {
  const actorEmail = assertActorEmail_(payload);
  if (!rateLimitAllowed_(actorEmail, 'CLAIM_SUBMIT', 1, 1)) {
    return rateLimitErr_('CLAIM_SUBMIT', 1, 1, 'Claim submit limit reached. Please wait one minute.');
  }
  const data = payload.data || {};

  const code = String(data.code || '').trim();
  const trackInput = String(data.track || '').trim();
  const rawName = String(data.name || '').trim();
  const moduleInput = String(data.module || '').trim();
  const lessonInput = data.lesson;

  if (!code) return portalErr_('MISSING_CODE', 'Claim code is required.', null);

  const claim = findClaimRow(code);
  if (!claim) return portalErr_('CODE_UNKNOWN', 'Claim code not found.', null);

  const eligibility = validateClaimEligibility(claim, actorEmail);
  if (!eligibility.ok) {
    return portalErr_('CODE_NOT_ELIGIBLE', 'Code is not eligible for this account.', {
      reason: eligibility.reason
    });
  }

  const track = trackInput || claim.track;
  if (String(track) !== String(claim.track)) {
    return portalErr_('CODE_MISMATCH', 'Code belongs to a different track.', {
      submitted_track: track,
      claim_track: claim.track
    });
  }

  const moduleKey = claim.moduleKey || normalizeModuleKey(moduleInput) || '1';
  const lessonId = claim.lesson || toNum(lessonInput, 1);

  if (hasUserUsedRefCode(actorEmail, code)) {
    return portalErr_('ALREADY_CLAIMED', 'You already used this claim code.', null);
  }

  const cat = findCatalog(track, moduleKey, lessonId);
  const fallbackXP = String(track) === '101' ? 100 : (String(track) === '201' ? 150 : (String(track) === '301' ? 200 : 150));
  const baseXP = Number(claim.xp) || (cat ? Number(cat.xp_value || 0) : 0) || fallbackXP;

  let awardedXP = baseXP;
  let tier = '';
  let deltaReason = '';

  if (moduleKey === 'GAUNTLET') {
    tier = normalizeTier(claim.tier || data.tier);
    if (!tier) {
      return portalErr_('INVALID_GAUNTLET_TIER', 'Gauntlet tier is missing or invalid.', null);
    }

    const delta = evaluateGauntletDeltaClaim(actorEmail, track, lessonId, tier);
    if (!delta.ok) {
      return portalErr_('TIER_NOT_HIGHER', 'Gauntlet tier must be higher than your previous best.', {
        previousTier: delta.previousTier || ''
      });
    }

    awardedXP = delta.deltaXP;
    deltaReason = delta.deltaReason;
  } else {
    if (alreadyClaimedStandardLesson(actorEmail, track, moduleKey, lessonId)) {
      return portalErr_('ALREADY_CLAIMED', 'You already claimed this lesson.', null);
    }
  }

  const cleanName = (rawName || displayFromEmail(actorEmail)).replace(/[^A-Za-z0-9 _.-]/g, '').trim() || displayFromEmail(actorEmail);

  appendObjectRow('XP_Ledger', {
    ts: _now(),
    email: actorEmail,
    name: cleanName,
    track: track,
    outcome: 'OK',
    action: 'CLAIM_CODE',
    module: moduleKey,
    lesson: lessonId,
    points: awardedXP,
    note: 'T' + track,
    key: track + '-' + moduleKey + '-' + lessonId,
    ref_code: normCode(code),
    tier: tier,
    delta_reason: deltaReason,
    source: 'PORTAL'
  });

  if (claim.issuedEligible === 'YES' && claim.hasIsUsedColumn) {
    const cc = readSheet('Claim_Codes');
    setCellByKey(cc, claim.rowNum, 'is_used', 'YES');
  }

  const user = upsertUser(actorEmail, awardedXP);
  updateLevelTitleIfNeeded(user.rowNum, user.level);

  awardAutomaticBadges(actorEmail, user, {
    track: track,
    moduleId: moduleKey,
    lessonId: lessonId,
    theme: claim.theme
  });

  recomputeCompletionAndPasses();
  rebuildLeaderboards();

  try {
    const next = cat ? findCatalogByNext(track, moduleKey, cat.next_lesson_id) : null;
    sendTemplate(actorEmail, 'FINISH_OK', {
      name: user.display,
      track: track,
      module: moduleKey,
      lesson: lessonId,
      earnedXP: awardedXP,
      totalXP: user.totalXP,
      level: user.level,
      levelTitle: getLevelTitle(user.level),
      streak: user.streak,
      nextUrl: next ? next.activity_url : '',
      nextLabel: next ? ('Module ' + moduleKey + ' · Lesson ' + cat.next_lesson_id) : ''
    });

    if (user.level > user.oldLevel) {
      sendTemplate(actorEmail, 'LEVEL_UP', {
        name: user.display,
        level: user.level,
        levelTitle: getLevelTitle(user.level),
        totalXP: user.totalXP
      });
    }
  } catch (err) {
    logOps('portal_claim_email_error', {
      email: actorEmail,
      code: code,
      error: String(err && err.message || err)
    });
  }

  addNotification_(
    actorEmail,
    'Claim accepted',
    'You earned ' + awardedXP + ' XP from claim code ' + normCode(code) + '.',
    'CLAIM'
  );

  awardLeaguePointsForEmail_(
    actorEmail,
    LEAGUE_POINTS.CLAIM_ACCEPTED,
    'CLAIM_ACCEPTED',
    'CLAIM:' + normCode(code),
    ''
  );
  incrementDailyEngagementMetric_('claims_submitted', 1);
  touchStudentEngagement_(actorEmail);

  logOps('portal_submit_claim_ok', {
    email: actorEmail,
    code: normCode(code),
    track: track,
    module: moduleKey,
    lesson: lessonId,
    awardedXP: awardedXP
  });

  return portalOk_('CLAIM_ACCEPTED', 'Claim submitted successfully.', {
    earnedXP: awardedXP,
    totalXP: user.totalXP,
    level: user.level,
    levelTitle: getLevelTitle(user.level),
    streak: user.streak,
    track: track,
    module: moduleKey,
    lesson: lessonId,
    tier: tier,
    deltaReason: deltaReason
  });
}

function getDashboardData_(email) {
  const user = getUserRowByEmail_(email) || {
    email: email,
    displayName: displayFromEmail(email),
    xp: 0,
    level: 1,
    streak: 0,
    levelTitle: getLevelTitle(1)
  };

  const activeRaffle = getActiveRaffle_();
  const activeSeason = getActiveSeason_();
  const ticketBalance = getRaffleBalanceByEmail_(email);
  const perTrack = aggregateTrackXP_(email);
  const standings = getLeagueStandings_('INDIVIDUAL', String((activeSeason || {}).season_id || ''));
  const myRank = standings.find(function(row) { return String(row.email || '').toLowerCase().trim() === String(email).toLowerCase().trim(); }) || null;

  const notificationsSheet = readSheet('Notifications');
  const notifications = notificationsSheet.rows
    .map(function(row) {
      return {
        notification_id: String(getRowValue(row, notificationsSheet, 'notification_id', '')),
        email: String(getRowValue(row, notificationsSheet, 'email', '')).toLowerCase(),
        title: String(getRowValue(row, notificationsSheet, 'title', '')),
        body: String(getRowValue(row, notificationsSheet, 'body', '')),
        kind: String(getRowValue(row, notificationsSheet, 'kind', 'INFO')),
        status: String(getRowValue(row, notificationsSheet, 'status', 'UNREAD')),
        created_at: getRowValue(row, notificationsSheet, 'created_at', '')
      };
    })
    .filter(function(n) { return n.email === String(email).toLowerCase(); })
    .sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 10);

  return {
    user: {
      email: user.email,
      display_name: user.displayName,
      xp: user.xp,
      level: user.level,
      streak_days: user.streak,
      level_title: user.levelTitle
    },
    xp_by_track: perTrack,
    season: activeSeason ? {
      season_id: String(activeSeason.season_id || ''),
      title: String(activeSeason.title || ''),
      starts_at: activeSeason.starts_at || '',
      ends_at: activeSeason.ends_at || '',
      status: String(activeSeason.status || '')
    } : null,
    league: {
      individual_rank: myRank ? asNumber_(myRank.rank, 0) : 0,
      individual_points: myRank ? asNumber_(myRank.points, 0) : 0,
      leaderboard_top: standings.slice(0, 5)
    },
    quick_actions: [
      { title: 'Open Home Feed', href: '/home' },
      { title: 'Join Live Events', href: '/events' },
      { title: 'Check Quests', href: '/quests' }
    ],
    raffle: activeRaffle,
    raffle_tickets: ticketBalance,
    notifications: notifications
  };
}

function getProgressData_(email) {
  const activities = getActivities_('', '');
  const completed = getCompletedLessonSet_(email);

  const byTrack = {};
  activities.forEach(function(item) {
    if (!byTrack[item.track]) {
      byTrack[item.track] = {
        track: item.track,
        total_lessons: 0,
        completed_lessons: 0,
        modules: {}
      };
    }
    byTrack[item.track].total_lessons += 1;

    const moduleKey = item.module_id;
    if (!byTrack[item.track].modules[moduleKey]) {
      byTrack[item.track].modules[moduleKey] = {
        module_id: moduleKey,
        total_lessons: 0,
        completed_lessons: 0
      };
    }

    byTrack[item.track].modules[moduleKey].total_lessons += 1;

    const key = item.track + '|' + moduleKey + '|' + item.lesson_id;
    if (completed.has(key)) {
      byTrack[item.track].completed_lessons += 1;
      byTrack[item.track].modules[moduleKey].completed_lessons += 1;
    }
  });

  const assignments = actionGetAssignments_({
    actorEmail: email,
    data: {}
  }).data || [];

  return {
    tracks: Object.keys(byTrack).map(function(k) {
      const t = byTrack[k];
      t.modules = Object.keys(t.modules).map(function(m) { return t.modules[m]; });
      return t;
    }),
    assignments: assignments
  };
}

function actionGetActivities_(payload) {
  const data = payload.data || {};
  const track = String(data.track || '').trim();
  const moduleFilter = String(data.module || '').trim();
  return portalOk_('ACTIVITIES_OK', 'Activities fetched.', getActivities_(track, moduleFilter));
}

function actionGetModules_(payload) {
  const data = payload.data || {};
  const track = String(data.track || '').trim();
  return portalOk_('MODULES_OK', 'Modules fetched.', getModules_(track));
}

function actionGetDashboard_(payload) {
  const email = assertActorEmail_(payload);
  return portalOk_('DASHBOARD_OK', 'Dashboard loaded.', getDashboardData_(email));
}

function actionGetProgress_(payload) {
  const email = assertActorEmail_(payload);
  return portalOk_('PROGRESS_OK', 'Progress loaded.', getProgressData_(email));
}

function actionGetSession_(payload) {
  const email = assertActorEmail_(payload);
  const portalUser = getPortalUser_(email);
  return portalOk_('SESSION_OK', 'Session loaded.', {
    email: email,
    role: normalizeRole_(payload.actorRole || (portalUser && portalUser.role) || 'STUDENT'),
    status: portalUser ? portalUser.status : 'ACTIVE'
  });
}

function actionGetCredentials_(payload) {
  const email = assertActorEmail_(payload);
  const d = readSheet('Credentials');
  const out = [];

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== String(email).toLowerCase()) continue;

    out.push({
      pass_id: String(getRowValue(row, d, 'pass_id', '')),
      display_name: String(getRowValue(row, d, 'display_name', '')),
      track: String(getRowValue(row, d, 'track', '')),
      level: String(getRowValue(row, d, 'level', '')),
      issued_at: getRowValue(row, d, 'issued_at', ''),
      status: String(getRowValue(row, d, 'status', 'ACTIVE')),
      source: String(getRowValue(row, d, 'source', ''))
    });
  }

  out.sort(function(a, b) {
    return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
  });

  return portalOk_('CREDENTIALS_OK', 'Credentials loaded.', out);
}

function actionGetLeaderboard_(payload) {
  const data = payload.data || {};
  const track = String(data.track || 'all').toLowerCase();
  const map = {
    all: 'Leaderboard_All',
    '101': 'Leaderboard_101',
    '201': 'Leaderboard_201',
    '301': 'Leaderboard_301'
  };
  const tab = map[track] || 'Leaderboard_All';

  const d = readSheet(tab);
  const rows = d.rows.map(function(row) {
    return {
      rank: Number(getRowValue(row, d, 'rank', 0)) || 0,
      display_name: String(getRowValue(row, d, 'display_name', '')),
      total_xp: Number(getRowValue(row, d, 'total_xp', 0)) || 0,
      level: Number(getRowValue(row, d, 'level', 0)) || 0,
      streak: Number(getRowValue(row, d, 'streak', 0)) || 0
    };
  }).filter(function(r) { return r.rank > 0; });

  return portalOk_('LEADERBOARD_OK', 'Leaderboard loaded.', rows);
}

function actionGetAssignments_(payload) {
  const email = assertActorEmail_(payload);
  const d = readSheet('Assignments');
  const s = readSheet('Assignment_Submissions');

  const subMap = new Map();
  for (let i = 0; i < s.rows.length; i++) {
    const row = s.rows[i];
    const em = String(getRowValue(row, s, 'email', '')).toLowerCase();
    if (em !== String(email).toLowerCase()) continue;

    const aid = String(getRowValue(row, s, 'assignment_id', '')).trim();
    subMap.set(aid, {
      status: String(getRowValue(row, s, 'status', 'NOT_STARTED')),
      completed_at: getRowValue(row, s, 'completed_at', ''),
      notes: String(getRowValue(row, s, 'notes', ''))
    });
  }

  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const enabled = String(getRowValue(row, d, 'enabled', 'TRUE')).toLowerCase() !== 'false';
    if (!enabled) continue;

    const aid = String(getRowValue(row, d, 'assignment_id', '')).trim();
    const sub = subMap.get(aid) || { status: 'NOT_STARTED', completed_at: '', notes: '' };

    out.push({
      assignment_id: aid,
      track: String(getRowValue(row, d, 'track', '')),
      module: String(getRowValue(row, d, 'module', '')),
      title: String(getRowValue(row, d, 'title', '')),
      description: String(getRowValue(row, d, 'description', '')),
      due_at: getRowValue(row, d, 'due_at', ''),
      resource_url: String(getRowValue(row, d, 'resource_url', '')),
      status: sub.status,
      completed_at: sub.completed_at,
      notes: sub.notes
    });
  }

  out.sort(function(a, b) {
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return portalOk_('ASSIGNMENTS_OK', 'Assignments loaded.', out);
}

function actionMarkAssignmentComplete_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};
  const assignmentId = String(data.assignment_id || '').trim();
  const notes = String(data.notes || '').trim();

  if (!assignmentId) {
    return portalErr_('MISSING_ASSIGNMENT_ID', 'assignment_id is required.', null);
  }

  const d = readSheet('Assignment_Submissions');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const aid = String(getRowValue(row, d, 'assignment_id', '')).trim();
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();

    if (aid === assignmentId && em === String(email).toLowerCase()) {
      const rowNum = i + 2;
      setCellByKey(d, rowNum, 'status', 'COMPLETED');
      setCellByKey(d, rowNum, 'completed_at', _now());
      setCellByKey(d, rowNum, 'notes', notes);

      addNotification_(email, 'Assignment completed', 'Marked assignment ' + assignmentId + ' as completed.', 'ASSIGNMENT');
      return portalOk_('ASSIGNMENT_UPDATED', 'Assignment marked complete.', {
        assignment_id: assignmentId,
        status: 'COMPLETED'
      });
    }
  }

  appendObjectRow('Assignment_Submissions', {
    assignment_id: assignmentId,
    email: email,
    status: 'COMPLETED',
    completed_at: _now(),
    notes: notes
  });

  addNotification_(email, 'Assignment completed', 'Marked assignment ' + assignmentId + ' as completed.', 'ASSIGNMENT');
  return portalOk_('ASSIGNMENT_UPDATED', 'Assignment marked complete.', {
    assignment_id: assignmentId,
    status: 'COMPLETED'
  });
}

function actionGetCalendar_(payload) {
  const d = readSheet('Calendar_Events');
  const out = [];

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const enabled = String(getRowValue(row, d, 'enabled', 'TRUE')).toLowerCase() !== 'false';
    if (!enabled) continue;

    out.push({
      event_id: String(getRowValue(row, d, 'event_id', '')),
      title: String(getRowValue(row, d, 'title', '')),
      starts_at: getRowValue(row, d, 'starts_at', ''),
      ends_at: getRowValue(row, d, 'ends_at', ''),
      location: String(getRowValue(row, d, 'location', '')),
      meeting_url: String(getRowValue(row, d, 'meeting_url', '')),
      notes: String(getRowValue(row, d, 'notes', ''))
    });
  }

  out.sort(function(a, b) {
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });

  return portalOk_('CALENDAR_OK', 'Calendar events loaded.', out);
}

function actionGetRaffleBalance_(payload) {
  const email = assertActorEmail_(payload);
  return portalOk_('RAFFLE_BALANCE_OK', 'Raffle balance loaded.', getRaffleBalanceByEmail_(email));
}

function actionGetActiveRaffle_(payload) {
  const email = assertActorEmail_(payload);
  return portalOk_('ACTIVE_RAFFLE_OK', 'Active raffle fetched.', {
    raffle: getActiveRaffle_(),
    balance: getRaffleBalanceByEmail_(email)
  });
}

function actionGetMyRaffleEntries_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};
  const raffleId = String(data.raffle_id || '').trim();
  return portalOk_('RAFFLE_ENTRIES_OK', 'Raffle entries fetched.', getRaffleEntries_(raffleId, email));
}

function actionEnterRaffle_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};

  const raffleId = String(data.raffle_id || '').trim();
  const tickets = Number(data.tickets_spent || 0);

  if (!raffleId) return portalErr_('MISSING_RAFFLE_ID', 'raffle_id is required.', null);
  if (!Number.isFinite(tickets) || tickets <= 0 || Math.floor(tickets) !== tickets) {
    return portalErr_('INVALID_TICKET_COUNT', 'tickets_spent must be a positive integer.', null);
  }

  const active = getActiveRaffle_();
  if (!active || String(active.raffle_id) !== raffleId) {
    return portalErr_('RAFFLE_NOT_ACTIVE', 'Raffle is not active.', null);
  }

  const bal = getRaffleBalanceByEmail_(email);
  if (bal.available < tickets) {
    return portalErr_('INSUFFICIENT_TICKETS', 'Not enough raffle tickets available.', {
      available: bal.available,
      requested: tickets
    });
  }

  appendObjectRow('Raffle_Entries', {
    entry_id: generateId_('RFE'),
    raffle_id: raffleId,
    email: email,
    tickets_spent: tickets,
    created_at: _now()
  });

  const nextBal = appendRaffleTicketLedger_(email, -tickets, 'RAFFLE_ENTRY_SPEND', raffleId);
  addNotification_(email, 'Raffle entry submitted', 'You entered raffle ' + raffleId + ' with ' + tickets + ' tickets.', 'RAFFLE');

  logOps('portal_enter_raffle_ok', {
    email: email,
    raffle_id: raffleId,
    tickets_spent: tickets,
    balance_after: nextBal
  });

  return portalOk_('RAFFLE_ENTRY_OK', 'Raffle entry submitted.', {
    raffle_id: raffleId,
    tickets_spent: tickets,
    balance_after: nextBal
  });
}

function drawWeightedWinner_(entries) {
  if (!entries || !entries.length) return '';

  let total = 0;
  entries.forEach(function(e) {
    total += Number(e.tickets_spent || 0);
  });
  if (total <= 0) return '';

  let pick = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    pick -= Number(entries[i].tickets_spent || 0);
    if (pick <= 0) return String(entries[i].email || '');
  }

  return String(entries[entries.length - 1].email || '');
}

function expireAllRaffleTickets_(sourceRaffleId) {
  const usersSheet = readSheet('Users');
  const seen = new Set();
  const expired = [];

  for (let i = 0; i < usersSheet.rows.length; i++) {
    const email = String(getRowValue(usersSheet.rows[i], usersSheet, 'email', '')).toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const bal = getRaffleBalanceByEmail_(email);
    if (bal.available <= 0) continue;

    const after = appendRaffleTicketLedger_(email, -bal.available, 'RAFFLE_CLOSE_EXPIRY', sourceRaffleId);
    expired.push({ email: email, expired: bal.available, balance_after: after });

    addNotification_(
      email,
      'Raffle closed',
      'Unused raffle tickets expired after raffle ' + sourceRaffleId + ' closed.',
      'RAFFLE'
    );
  }

  return expired;
}

function actionAdminCreateRaffle_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const title = String(data.title || '').trim();
  const prize = String(data.prize || '').trim();

  if (!title || !prize) {
    return portalErr_('MISSING_FIELDS', 'title and prize are required.', null);
  }

  const active = getActiveRaffle_();
  if (active) {
    return portalErr_('ACTIVE_RAFFLE_EXISTS', 'Close the current active raffle before creating a new one.', {
      active_raffle_id: active.raffle_id
    });
  }

  const raffleId = generateId_('RFL');
  appendObjectRow('Raffles', {
    raffle_id: raffleId,
    title: title,
    prize: prize,
    opens_at: data.opens_at ? new Date(data.opens_at) : _now(),
    closes_at: data.closes_at ? new Date(data.closes_at) : '',
    status: 'ACTIVE',
    winner_email: '',
    winner_drawn_at: '',
    created_by: String(payload.actorEmail || '').toLowerCase(),
    created_at: _now()
  });

  logOps('portal_admin_create_raffle_ok', {
    raffle_id: raffleId,
    title: title,
    created_by: String(payload.actorEmail || '').toLowerCase()
  });

  return portalOk_('RAFFLE_CREATED', 'Raffle created and set active.', {
    raffle_id: raffleId,
    title: title,
    prize: prize,
    status: 'ACTIVE'
  });
}

function actionAdminCloseDrawRaffle_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const raffleId = String(data.raffle_id || '').trim();
  if (!raffleId) {
    return portalErr_('MISSING_RAFFLE_ID', 'raffle_id is required.', null);
  }

  const raffle = getRaffleById_(raffleId);
  if (!raffle) {
    return portalErr_('RAFFLE_NOT_FOUND', 'Raffle not found.', null);
  }

  if (raffle.status !== 'ACTIVE') {
    return portalErr_('RAFFLE_NOT_ACTIVE', 'Raffle is not active.', {
      status: raffle.status
    });
  }

  const entries = getRaffleEntries_(raffleId, '');
  const winner = drawWeightedWinner_(entries);

  setCellByKey(raffle.sheet, raffle.rowNum, 'status', 'CLOSED');
  setCellByKey(raffle.sheet, raffle.rowNum, 'winner_email', winner || '');
  setCellByKey(raffle.sheet, raffle.rowNum, 'winner_drawn_at', _now());

  const expired = expireAllRaffleTickets_(raffleId);

  if (winner) {
    addNotification_(winner, 'You won the raffle', 'You were selected as the winner for raffle ' + raffleId + '.', 'RAFFLE');
  }

  logOps('portal_admin_close_draw_raffle_ok', {
    raffle_id: raffleId,
    winner_email: winner || '',
    entry_count: entries.length,
    expired_ticket_rows: expired.length
  });

  return portalOk_('RAFFLE_CLOSED', 'Raffle closed and winner drawn.', {
    raffle_id: raffleId,
    winner_email: winner || '',
    entries: entries.length,
    expired_ticket_rows: expired.length,
    expired_tickets: expired
  });
}

function actionAdminOverview_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const portalUsers = readSheet('Portal_Users');
  const users = readSheet('Users');
  const xp = readSheet('XP_Ledger');
  const ops = readSheet('Ops_Log');
  const support = readSheet('Support_Tickets');

  let activeUsers = 0;
  let invitedUsers = 0;
  let suspendedUsers = 0;

  for (let i = 0; i < portalUsers.rows.length; i++) {
    const st = normalizeUserStatus_(getRowValue(portalUsers.rows[i], portalUsers, 'status', 'ACTIVE'));
    if (st === 'ACTIVE') activeUsers += 1;
    if (st === 'INVITED') invitedUsers += 1;
    if (st === 'SUSPENDED') suspendedUsers += 1;
  }

  let claimsToday = 0;
  const today = dayKeyNY(new Date());
  for (let i = 0; i < xp.rows.length; i++) {
    const ts = getRowValue(xp.rows[i], xp, 'ts', '');
    if (!ts) continue;
    if (dayKeyNY(new Date(ts)) === today) claimsToday += 1;
  }

  const activeRaffle = getActiveRaffle_();
  const raffleEntries = activeRaffle ? getRaffleEntries_(activeRaffle.raffle_id, '').length : 0;

  const openSupportTickets = support.rows.filter(function(row) {
    return upper(getRowValue(row, support, 'status', 'OPEN')) !== 'RESOLVED';
  }).length;

  const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
  const launchHealth = {
    window_hours: 24,
    claims_errors: 0,
    auth_errors: 0,
    action_failures: 0,
    support_open: openSupportTickets
  };

  const recentErrors = [];
  for (let i = ops.rows.length - 1; i >= 0; i--) {
    const row = ops.rows[i];
    const eventName = String(getRowValue(row, ops, 'event', ''));
    const ts = getRowValue(row, ops, 'ts', '');
    const details = parseJsonSafe_(String(getRowValue(row, ops, 'details_json', '{}'))) || {};

    const eventTs = ts ? new Date(ts).getTime() : 0;
    if (eventTs && eventTs >= sinceMs) {
      if (eventName === 'portal_action_auth_failed' || eventName.indexOf('auth') >= 0) {
        launchHealth.auth_errors += 1;
      }
      if (eventName === 'portal_action_error') {
        launchHealth.action_failures += 1;
      }
      if (eventName.indexOf('claim') >= 0 && eventName.indexOf('error') >= 0) {
        launchHealth.claims_errors += 1;
      } else if (eventName === 'portal_action_error' && String(details.action || '') === 'portal.submitClaim') {
        launchHealth.claims_errors += 1;
      }
    }

    if (eventName.toLowerCase().indexOf('error') === -1) continue;

    if (recentErrors.length < 20) {
      recentErrors.push({
        ts: ts,
        event: eventName,
        details_json: String(getRowValue(row, ops, 'details_json', ''))
      });
    }
  }

  return portalOk_('ADMIN_OVERVIEW_OK', 'Overview loaded.', {
    student_count: users.rows.length,
    portal_active_users: activeUsers,
    portal_invited_users: invitedUsers,
    portal_suspended_users: suspendedUsers,
    claims_today: claimsToday,
    active_raffle: activeRaffle,
    active_raffle_entries: raffleEntries,
    launch_health: launchHealth,
    recent_errors: recentErrors
  });
}

function actionAdminStudents_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const users = readSheet('Users');
  const portalUsers = readSheet('Portal_Users');
  const roleByEmail = new Map();

  for (let i = 0; i < portalUsers.rows.length; i++) {
    const row = portalUsers.rows[i];
    const em = String(getRowValue(row, portalUsers, 'email', '')).toLowerCase();
    roleByEmail.set(em, {
      role: normalizeRole_(getRowValue(row, portalUsers, 'role', 'STUDENT')),
      status: normalizeUserStatus_(getRowValue(row, portalUsers, 'status', 'ACTIVE'))
    });
  }

  const out = [];
  for (let i = 0; i < users.rows.length; i++) {
    const row = users.rows[i];
    const email = String(getRowValue(row, users, 'email', '')).toLowerCase();
    const ru = roleByEmail.get(email) || { role: 'STUDENT', status: 'ACTIVE' };

    out.push({
      email: email,
      display_name: String(getRowValue(row, users, 'display_name', '')),
      xp: Number(getRowValue(row, users, 'xp', 0)) || 0,
      level: Number(getRowValue(row, users, 'level', 1)) || 1,
      streak_days: Number(getRowValue(row, users, 'streak_days', 0)) || 0,
      role: ru.role,
      status: ru.status,
      raffle_tickets: getRaffleBalanceByEmail_(email).available
    });
  }

  out.sort(function(a, b) {
    return b.xp - a.xp;
  });

  return portalOk_('ADMIN_STUDENTS_OK', 'Students loaded.', out);
}

function actionAdminCreateInvite_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const email = String(data.email || '').toLowerCase().trim();
  const role = normalizeRole_(data.role || 'STUDENT');
  const activationUrlBase = String(data.activation_url_base || '').trim();

  if (!email) {
    return portalErr_('MISSING_EMAIL', 'Invite email is required.', null);
  }

  const inviteId = generateId_('INV');
  const issuedAt = _now();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  appendObjectRow('Portal_Invites', {
    invite_id: inviteId,
    email: email,
    role: role,
    issued_by: String(payload.actorEmail || '').toLowerCase(),
    issued_at: issuedAt,
    expires_at: expiresAt,
    status: 'ISSUED'
  });

  upsertPortalUser_({
    email: email,
    role: role,
    status: 'INVITED',
    invitedAt: issuedAt
  });

  if (activationUrlBase) {
    const activationLink = activationUrlBase + (activationUrlBase.indexOf('?') >= 0 ? '&' : '?') + 'invite=' + encodeURIComponent(inviteId);
    try {
      safeSendEmail(
        email,
        SUBJECT_PREFIX + ' — Portal invite',
        '<div style="font:15px system-ui"><p>You were invited to the BOW class portal.</p><p><a href="' + activationLink + '">Activate your account</a></p><p>Invite ID: ' + inviteId + '</p></div>'
      );
    } catch (err) {
      logOps('portal_invite_email_error', {
        invite_id: inviteId,
        email: email,
        error: String(err && err.message || err)
      });
    }
  }

  return portalOk_('INVITE_CREATED', 'Invite created.', {
    invite_id: inviteId,
    email: email,
    role: role,
    expires_at: expiresAt
  });
}

function actionAdminActionQueue_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const d = readSheet('Action_Queue');

  const out = d.rows.map(function(row) {
    return {
      action_id: String(getRowValue(row, d, 'action_id', '')),
      type: String(getRowValue(row, d, 'type', '')),
      target_email: String(getRowValue(row, d, 'target_email', '')).toLowerCase(),
      payload_json: String(getRowValue(row, d, 'payload_json', '{}')),
      status: String(getRowValue(row, d, 'status', 'PENDING')),
      created_at: getRowValue(row, d, 'created_at', ''),
      completed_at: getRowValue(row, d, 'completed_at', ''),
      created_by: String(getRowValue(row, d, 'created_by', ''))
    };
  });

  out.sort(function(a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return portalOk_('ACTION_QUEUE_OK', 'Action queue loaded.', out);
}

function actionAdminUpsertAssignment_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};

  const assignmentId = String(data.assignment_id || '').trim() || generateId_('ASM');
  const d = readSheet('Assignments');

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const aid = String(getRowValue(row, d, 'assignment_id', '')).trim();
    if (aid !== assignmentId) continue;

    setCellByKey(d, i + 2, 'track', String(data.track || getRowValue(row, d, 'track', '')));
    setCellByKey(d, i + 2, 'module', String(data.module || getRowValue(row, d, 'module', '')));
    setCellByKey(d, i + 2, 'title', String(data.title || getRowValue(row, d, 'title', '')));
    setCellByKey(d, i + 2, 'description', String(data.description || getRowValue(row, d, 'description', '')));
    setCellByKey(d, i + 2, 'due_at', data.due_at ? new Date(data.due_at) : getRowValue(row, d, 'due_at', ''));
    setCellByKey(d, i + 2, 'resource_url', String(data.resource_url || getRowValue(row, d, 'resource_url', '')));
    setCellByKey(d, i + 2, 'enabled', data.enabled === false ? 'FALSE' : 'TRUE');

    return portalOk_('ASSIGNMENT_UPDATED', 'Assignment updated.', { assignment_id: assignmentId });
  }

  appendObjectRow('Assignments', {
    assignment_id: assignmentId,
    track: String(data.track || ''),
    module: String(data.module || ''),
    title: String(data.title || ''),
    description: String(data.description || ''),
    due_at: data.due_at ? new Date(data.due_at) : '',
    resource_url: String(data.resource_url || ''),
    enabled: data.enabled === false ? 'FALSE' : 'TRUE'
  });

  return portalOk_('ASSIGNMENT_CREATED', 'Assignment created.', { assignment_id: assignmentId });
}

function actionAdminUpsertCalendarEvent_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};

  const eventId = String(data.event_id || '').trim() || generateId_('EVT');
  const d = readSheet('Calendar_Events');

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const eid = String(getRowValue(row, d, 'event_id', '')).trim();
    if (eid !== eventId) continue;

    setCellByKey(d, i + 2, 'title', String(data.title || getRowValue(row, d, 'title', '')));
    setCellByKey(d, i + 2, 'starts_at', data.starts_at ? new Date(data.starts_at) : getRowValue(row, d, 'starts_at', ''));
    setCellByKey(d, i + 2, 'ends_at', data.ends_at ? new Date(data.ends_at) : getRowValue(row, d, 'ends_at', ''));
    setCellByKey(d, i + 2, 'location', String(data.location || getRowValue(row, d, 'location', '')));
    setCellByKey(d, i + 2, 'meeting_url', String(data.meeting_url || getRowValue(row, d, 'meeting_url', '')));
    setCellByKey(d, i + 2, 'notes', String(data.notes || getRowValue(row, d, 'notes', '')));
    setCellByKey(d, i + 2, 'enabled', data.enabled === false ? 'FALSE' : 'TRUE');

    return portalOk_('CALENDAR_EVENT_UPDATED', 'Calendar event updated.', { event_id: eventId });
  }

  appendObjectRow('Calendar_Events', {
    event_id: eventId,
    title: String(data.title || ''),
    starts_at: data.starts_at ? new Date(data.starts_at) : '',
    ends_at: data.ends_at ? new Date(data.ends_at) : '',
    location: String(data.location || ''),
    meeting_url: String(data.meeting_url || ''),
    notes: String(data.notes || ''),
    enabled: data.enabled === false ? 'FALSE' : 'TRUE'
  });

  return portalOk_('CALENDAR_EVENT_CREATED', 'Calendar event created.', { event_id: eventId });
}

function runActionQueueItem_(item) {
  const type = upper(item.type || '');
  const targetEmail = String(item.target_email || '').toLowerCase();
  const payload = parseJsonSafe_(item.payload_json || '{}') || {};

  if (type === 'ADJUST_TICKETS') {
    const delta = Number(payload.delta_tickets || 0);
    if (!Number.isFinite(delta) || !targetEmail) throw new Error('INVALID_ADJUST_TICKETS_PAYLOAD');
    const after = appendRaffleTicketLedger_(targetEmail, delta, 'ADMIN_ADJUSTMENT', item.action_id || '');
    addNotification_(targetEmail, 'Ticket balance updated', 'An admin adjusted your raffle tickets by ' + delta + '.', 'RAFFLE');
    return { type: type, target_email: targetEmail, balance_after: after };
  }

  if (type === 'SEND_NOTIFICATION') {
    addNotification_(
      targetEmail,
      String(payload.title || 'Message from staff'),
      String(payload.body || ''),
      String(payload.kind || 'INFO')
    );
    return { type: type, target_email: targetEmail };
  }

  if (type === 'GRANT_BADGE') {
    const badgeId = String(payload.badge_id || '').trim();
    if (!badgeId || !targetEmail) throw new Error('INVALID_GRANT_BADGE_PAYLOAD');
    const granted = grantBadge(targetEmail, badgeId);
    return { type: type, target_email: targetEmail, badge_id: badgeId, granted: granted };
  }

  throw new Error('UNSUPPORTED_ACTION_TYPE:' + type);
}

function actionAdminRunActionQueue_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const actionId = String(data.action_id || '').trim();
  if (!actionId) return portalErr_('MISSING_ACTION_ID', 'action_id is required.', null);

  const d = readSheet('Action_Queue');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const id = String(getRowValue(row, d, 'action_id', '')).trim();
    if (id !== actionId) continue;

    const rowNum = i + 2;
    const item = {
      action_id: id,
      type: String(getRowValue(row, d, 'type', '')),
      target_email: String(getRowValue(row, d, 'target_email', '')),
      payload_json: String(getRowValue(row, d, 'payload_json', '{}')),
      status: String(getRowValue(row, d, 'status', 'PENDING'))
    };

    if (upper(item.status) === 'DONE') {
      return portalOk_('ACTION_ALREADY_DONE', 'Action already completed.', { action_id: actionId });
    }

    const result = runActionQueueItem_(item);
    setCellByKey(d, rowNum, 'status', 'DONE');
    setCellByKey(d, rowNum, 'completed_at', _now());

    logOps('portal_admin_action_queue_run_ok', {
      action_id: actionId,
      type: item.type,
      run_by: String(payload.actorEmail || '').toLowerCase()
    });

    return portalOk_('ACTION_RUN_OK', 'Action executed.', {
      action_id: actionId,
      result: result
    });
  }

  return portalErr_('ACTION_NOT_FOUND', 'Action queue item not found.', { action_id: actionId });
}

function actionGetNotifications_(payload) {
  const email = assertActorEmail_(payload);
  const data = payload.data || {};
  const limit = Math.max(1, Math.min(100, Number(data.limit || 50)));

  const d = readSheet('Notifications');
  const out = [];
  for (let i = d.rows.length - 1; i >= 0 && out.length < limit; i--) {
    const row = d.rows[i];
    const em = String(getRowValue(row, d, 'email', '')).toLowerCase();
    if (em !== String(email).toLowerCase()) continue;

    out.push({
      notification_id: String(getRowValue(row, d, 'notification_id', '')),
      title: String(getRowValue(row, d, 'title', '')),
      body: String(getRowValue(row, d, 'body', '')),
      kind: String(getRowValue(row, d, 'kind', 'INFO')),
      status: String(getRowValue(row, d, 'status', 'UNREAD')),
      created_at: getRowValue(row, d, 'created_at', ''),
      read_at: getRowValue(row, d, 'read_at', '')
    });
  }

  return portalOk_('NOTIFICATIONS_OK', 'Notifications loaded.', out);
}

function actionGetHelpFaq_(payload) {
  const role = normalizeRole_(payload.actorRole || 'STUDENT');
  const d = readSheet('Help_FAQ');
  const out = [];

  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const enabled = String(getRowValue(row, d, 'enabled', 'TRUE')).toLowerCase() !== 'false';
    if (!enabled) continue;

    const audience = upper(getRowValue(row, d, 'audience', 'ALL'));
    if (!(audience === 'ALL' || audience === role)) continue;

    out.push({
      faq_id: String(getRowValue(row, d, 'faq_id', '')),
      question: String(getRowValue(row, d, 'question', '')),
      answer: String(getRowValue(row, d, 'answer', '')),
      audience: audience,
      sort_order: Number(getRowValue(row, d, 'sort_order', 9999)) || 9999
    });
  }

  out.sort(function(a, b) { return a.sort_order - b.sort_order; });
  return portalOk_('HELP_FAQ_OK', 'FAQ loaded.', out);
}

function actionCreateSupportTicket_(payload) {
  const email = assertActorEmail_(payload);
  if (!rateLimitAllowed_(email, 'SUPPORT_TICKET', 10, 3)) {
    return rateLimitErr_('SUPPORT_TICKET', 10, 3, 'Support ticket rate limit reached. Please wait a few minutes.');
  }
  const data = payload.data || {};

  const category = String(data.category || 'GENERAL').trim().toUpperCase();
  const subject = String(data.subject || '').trim();
  const message = String(data.message || '').trim();
  const pageContext = String(data.page_context || '').trim();

  if (!subject || !message) {
    return portalErr_('MISSING_FIELDS', 'subject and message are required.', null);
  }

  const ticketId = generateId_('SUP');
  const priority = inferSupportPriority_(category, subject, message);

  appendObjectRow('Support_Tickets', {
    ticket_id: ticketId,
    email: email,
    category: category,
    subject: subject,
    message: message,
    page_context: pageContext,
    status: 'OPEN',
    priority: priority,
    created_at: _now(),
    resolved_at: '',
    resolved_by: '',
    resolution_note: ''
  });

  addNotification_(email, 'Support ticket created', 'Ticket ' + ticketId + ' is now open. Staff will follow up soon.', 'SUPPORT');
  logOps('portal_support_ticket_created', {
    ticket_id: ticketId,
    email: email,
    category: category,
    priority: priority
  });

  return portalOk_('SUPPORT_TICKET_CREATED', 'Support ticket submitted.', {
    ticket_id: ticketId,
    status: 'OPEN',
    priority: priority
  });
}

function actionAdminGetSupportTickets_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const d = readSheet('Support_Tickets');
  const out = d.rows.map(function(row) {
    return {
      ticket_id: String(getRowValue(row, d, 'ticket_id', '')),
      email: String(getRowValue(row, d, 'email', '')).toLowerCase(),
      category: String(getRowValue(row, d, 'category', 'GENERAL')),
      subject: String(getRowValue(row, d, 'subject', '')),
      message: String(getRowValue(row, d, 'message', '')),
      page_context: String(getRowValue(row, d, 'page_context', '')),
      status: upper(getRowValue(row, d, 'status', 'OPEN')),
      priority: upper(getRowValue(row, d, 'priority', 'LOW')),
      created_at: getRowValue(row, d, 'created_at', ''),
      resolved_at: getRowValue(row, d, 'resolved_at', ''),
      resolved_by: String(getRowValue(row, d, 'resolved_by', '')),
      resolution_note: String(getRowValue(row, d, 'resolution_note', ''))
    };
  });

  out.sort(function(a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return portalOk_('SUPPORT_TICKETS_OK', 'Support tickets loaded.', out);
}

function actionAdminResolveSupportTicket_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const ticketId = String(data.ticket_id || '').trim();
  const resolutionNote = String(data.resolution_note || '').trim();
  const notifyStudent = data.notify_student !== false;
  const resolverEmail = String(payload.actorEmail || '').toLowerCase();

  if (!ticketId) return portalErr_('MISSING_TICKET_ID', 'ticket_id is required.', null);

  const d = readSheet('Support_Tickets');
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const id = String(getRowValue(row, d, 'ticket_id', '')).trim();
    if (id !== ticketId) continue;

    const rowNum = i + 2;
    const currentStatus = upper(getRowValue(row, d, 'status', 'OPEN'));
    const studentEmail = String(getRowValue(row, d, 'email', '')).toLowerCase().trim();

    if (currentStatus === 'RESOLVED') {
      return portalOk_('SUPPORT_ALREADY_RESOLVED', 'Ticket already resolved.', {
        ticket_id: ticketId,
        status: 'RESOLVED'
      });
    }

    setCellByKey(d, rowNum, 'status', 'RESOLVED');
    setCellByKey(d, rowNum, 'resolved_at', _now());
    setCellByKey(d, rowNum, 'resolved_by', resolverEmail);
    setCellByKey(d, rowNum, 'resolution_note', resolutionNote);

    if (notifyStudent && studentEmail) {
      const body = resolutionNote || ('Ticket ' + ticketId + ' has been resolved by staff.');
      addNotification_(studentEmail, 'Support ticket resolved', body, 'SUPPORT');
    }

    logOps('portal_support_ticket_resolved', {
      ticket_id: ticketId,
      resolved_by: resolverEmail,
      notify_student: notifyStudent
    });

    return portalOk_('SUPPORT_RESOLVED', 'Support ticket resolved.', {
      ticket_id: ticketId,
      status: 'RESOLVED',
      resolved_by: resolverEmail
    });
  }

  return portalErr_('SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found.', { ticket_id: ticketId });
}

function summarizeRecentOps_(hours) {
  const windowHours = Math.max(1, Number(hours || 24));
  const sinceMs = Date.now() - (windowHours * 60 * 60 * 1000);
  const d = readSheet('Ops_Log');

  const out = {
    window_hours: windowHours,
    total_events: 0,
    total_errors: 0,
    claims_errors: 0,
    auth_errors: 0,
    action_failures: 0,
    recent_errors: []
  };

  for (let i = d.rows.length - 1; i >= 0; i--) {
    const row = d.rows[i];
    const ts = new Date(getRowValue(row, d, 'ts', 0)).getTime();
    if (!Number.isFinite(ts) || ts < sinceMs) continue;
    out.total_events += 1;

    const event = String(getRowValue(row, d, 'event', ''));
    const details = parseJsonSafe_(String(getRowValue(row, d, 'details_json', '{}'))) || {};
    const action = String(details.action || '');
    const isErr = event.toLowerCase().indexOf('error') >= 0 || event.toLowerCase().indexOf('failed') >= 0;
    if (isErr) {
      out.total_errors += 1;
      if (out.recent_errors.length < 25) {
        out.recent_errors.push({
          ts: getRowValue(row, d, 'ts', ''),
          event: event,
          details_json: String(getRowValue(row, d, 'details_json', ''))
        });
      }
    }

    if (event.indexOf('portal_action_auth_failed') >= 0) out.auth_errors += 1;
    if (event.indexOf('portal_action_error') >= 0 || event.indexOf('portal_action_bad_request') >= 0) out.action_failures += 1;
    if (event.toLowerCase().indexOf('claim') >= 0 || action === 'portal.submitClaim') out.claims_errors += isErr ? 1 : 0;
  }

  return out;
}

function collectContentValidationIssues_(options) {
  const opts = options || {};
  const checkLinks = opts.checkLinks === true;
  const issues = [];

  const lessons = listSheetObjects_('Lessons_Published', false);
  const activities = listSheetObjects_('Activities_Published', false);
  const outcomes = listSheetObjects_('Outcomes_Published', false);

  const lessonByKey = new Map();
  const duplicateLessonKeys = new Set();
  lessons.forEach(function(row) {
    const lk = String(row.lesson_key || '').trim();
    if (!lk) {
      issues.push({
        severity: 'ERROR',
        entity: 'lesson',
        entity_id: '',
        issue_code: 'MISSING_LESSON_KEY',
        details_json: safeStringify(row)
      });
      return;
    }
    if (lessonByKey.has(lk)) duplicateLessonKeys.add(lk);
    lessonByKey.set(lk, row);
  });

  duplicateLessonKeys.forEach(function(lessonKey) {
    issues.push({
      severity: 'ERROR',
      entity: 'lesson',
      entity_id: lessonKey,
      issue_code: 'DUPLICATE_LESSON_KEY',
      details_json: safeStringify({ lesson_key: lessonKey })
    });
  });

  const outcomesByLesson = new Map();
  outcomes.forEach(function(row) {
    const lk = String(row.lesson_key || '').trim();
    if (!lk) {
      issues.push({
        severity: 'ERROR',
        entity: 'outcome',
        entity_id: String(row.outcome_id || ''),
        issue_code: 'OUTCOME_MISSING_LESSON_KEY',
        details_json: safeStringify(row)
      });
      return;
    }
    outcomesByLesson.set(lk, (outcomesByLesson.get(lk) || 0) + 1);
    if (!lessonByKey.has(lk)) {
      issues.push({
        severity: 'ERROR',
        entity: 'outcome',
        entity_id: String(row.outcome_id || ''),
        issue_code: 'ORPHAN_OUTCOME_LESSON',
        details_json: safeStringify({ lesson_key: lk })
      });
    }
  });

  lessons.forEach(function(row) {
    const lk = String(row.lesson_key || '').trim();
    if (!lk) return;
    if ((outcomesByLesson.get(lk) || 0) < 1) {
      issues.push({
        severity: 'ERROR',
        entity: 'lesson',
        entity_id: lk,
        issue_code: 'LESSON_WITHOUT_OUTCOME',
        details_json: safeStringify({ lesson_key: lk })
      });
    }
  });

  activities.forEach(function(row) {
    const activityId = String(row.activity_id || '');
    const lk = String(row.lesson_key || '').trim();
    const simUrl = String(row.sim_url || '').trim();
    const claimPattern = String(row.claim_code_pattern || '').trim();

    if (!lk) {
      issues.push({
        severity: 'ERROR',
        entity: 'activity',
        entity_id: activityId,
        issue_code: 'ACTIVITY_MISSING_LESSON_KEY',
        details_json: safeStringify(row)
      });
    } else if (!lessonByKey.has(lk)) {
      issues.push({
        severity: 'ERROR',
        entity: 'activity',
        entity_id: activityId,
        issue_code: 'ORPHAN_ACTIVITY_LESSON',
        details_json: safeStringify({ lesson_key: lk })
      });
    }

    if (!simUrl) {
      issues.push({
        severity: 'ERROR',
        entity: 'activity',
        entity_id: activityId,
        issue_code: 'MISSING_SIM_URL',
        details_json: safeStringify({ lesson_key: lk })
      });
    } else if (!/^https?:\/\//i.test(simUrl)) {
      issues.push({
        severity: 'ERROR',
        entity: 'activity',
        entity_id: activityId,
        issue_code: 'INVALID_SIM_URL',
        details_json: safeStringify({ sim_url: simUrl })
      });
    } else if (checkLinks) {
      try {
        const res = UrlFetchApp.fetch(simUrl, {
          muteHttpExceptions: true,
          followRedirects: true
        });
        const code = Number(res.getResponseCode() || 0);
        if (code < 200 || code >= 400) {
          issues.push({
            severity: 'WARN',
            entity: 'activity',
            entity_id: activityId,
            issue_code: 'SIM_URL_HTTP_' + code,
            details_json: safeStringify({ sim_url: simUrl, response_code: code })
          });
        }
      } catch (err) {
        issues.push({
          severity: 'WARN',
          entity: 'activity',
          entity_id: activityId,
          issue_code: 'SIM_URL_FETCH_FAILED',
          details_json: safeStringify({ sim_url: simUrl, error: String(err && err.message || err) })
        });
      }
    }

    if (!claimPattern) {
      issues.push({
        severity: 'ERROR',
        entity: 'activity',
        entity_id: activityId,
        issue_code: 'MISSING_CLAIM_CODE_PATTERN',
        details_json: safeStringify({ lesson_key: lk })
      });
    }
  });

  const summary = {
    total: issues.length,
    errors: issues.filter(function(i) { return i.severity === 'ERROR'; }).length,
    warnings: issues.filter(function(i) { return i.severity === 'WARN'; }).length
  };

  return {
    summary: summary,
    issues: issues
  };
}

function writeContentValidationLog_(issues) {
  const rows = Array.isArray(issues) ? issues : [];
  const ts = _now();
  for (let i = 0; i < rows.length; i++) {
    appendObjectRow('Content_Validation_Log', {
      ts: ts,
      severity: String(rows[i].severity || 'WARN'),
      entity: String(rows[i].entity || ''),
      entity_id: String(rows[i].entity_id || ''),
      issue_code: String(rows[i].issue_code || ''),
      details_json: String(rows[i].details_json || '{}')
    });
  }
}

function getUserMetricRows_(days) {
  const lookbackDays = Math.max(1, Number(days || 7));
  const since = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);

  const successByEmail = new Map();
  const xpByEmail = new Map();
  const failuresByEmail = new Map();
  const rubricByEmail = new Map();

  const ledger = readSheet('XP_Ledger');
  for (let i = 0; i < ledger.rows.length; i++) {
    const row = ledger.rows[i];
    const ts = new Date(getRowValue(row, ledger, 'ts', 0)).getTime();
    if (!Number.isFinite(ts) || ts < since) continue;

    const email = String(getRowValue(row, ledger, 'email', '')).toLowerCase().trim();
    const points = Number(getRowValue(row, ledger, 'points', 0)) || 0;
    if (!email) continue;

    xpByEmail.set(email, (xpByEmail.get(email) || 0) + points);
    successByEmail.set(email, (successByEmail.get(email) || 0) + 1);
  }

  const ops = readSheet('Ops_Log');
  for (let i = 0; i < ops.rows.length; i++) {
    const row = ops.rows[i];
    const ts = new Date(getRowValue(row, ops, 'ts', 0)).getTime();
    if (!Number.isFinite(ts) || ts < since) continue;
    const event = String(getRowValue(row, ops, 'event', ''));
    const details = parseJsonSafe_(String(getRowValue(row, ops, 'details_json', '{}'))) || {};
    const action = String(details.action || '');
    if (action !== 'portal.submitClaim') continue;
    if (event.indexOf('portal_action_error') < 0 && event.indexOf('portal_action_bad_request') < 0) continue;
    const email = String(details.actor_email || '').toLowerCase().trim();
    if (!email) continue;
    failuresByEmail.set(email, (failuresByEmail.get(email) || 0) + 1);
  }

  const journal = readSheet('Decision_Journal');
  for (let i = 0; i < journal.rows.length; i++) {
    const row = journal.rows[i];
    if (upper(getRowValue(row, journal, 'status', '')) !== 'SCORED') continue;
    const scoredAt = new Date(getRowValue(row, journal, 'scored_at', 0)).getTime();
    if (!Number.isFinite(scoredAt) || scoredAt < since) continue;

    const email = String(getRowValue(row, journal, 'email', '')).toLowerCase().trim();
    if (!email) continue;

    const dq = Number(getRowValue(row, journal, 'score_decision_quality', 0)) || 0;
    const fl = Number(getRowValue(row, journal, 'score_financial_logic', 0)) || 0;
    const rm = Number(getRowValue(row, journal, 'score_risk_management', 0)) || 0;
    const cm = Number(getRowValue(row, journal, 'score_communication', 0)) || 0;
    const overall = (dq + fl + rm + cm) / 4;

    if (!rubricByEmail.has(email)) {
      rubricByEmail.set(email, { count: 0, sumOverall: 0, sumDq: 0, sumFl: 0, sumRm: 0, sumCm: 0 });
    }
    const agg = rubricByEmail.get(email);
    agg.count += 1;
    agg.sumOverall += overall;
    agg.sumDq += dq;
    agg.sumFl += fl;
    agg.sumRm += rm;
    agg.sumCm += cm;
  }

  return {
    xpByEmail: xpByEmail,
    successByEmail: successByEmail,
    failuresByEmail: failuresByEmail,
    rubricByEmail: rubricByEmail
  };
}

function computeAtRiskRows_(options) {
  const opts = options || {};
  const lookbackDays = Math.max(1, Number(opts.lookback_days || 7));
  const persistSnapshots = opts.persist_snapshots !== false;
  const metrics = getUserMetricRows_(lookbackDays);
  const users = readSheet('Users');
  const now = Date.now();
  const out = [];

  for (let i = 0; i < users.rows.length; i++) {
    const row = users.rows[i];
    const email = String(getRowValue(row, users, 'email', '')).toLowerCase().trim();
    if (!email) continue;

    const xpVelocity = Number(metrics.xpByEmail.get(email) || 0);
    const claimSuccess = Number(metrics.successByEmail.get(email) || 0);
    const claimFail = Number(metrics.failuresByEmail.get(email) || 0);
    const claimTotal = claimSuccess + claimFail;
    const claimFailRate = claimTotal > 0 ? Number((claimFail / claimTotal).toFixed(4)) : 0;

    const lastActive = new Date(getRowValue(row, users, 'last_active', 0)).getTime();
    const inactivityDays = Number.isFinite(lastActive)
      ? Math.max(0, Math.floor((now - lastActive) / (24 * 60 * 60 * 1000)))
      : 999;

    const rubricAgg = metrics.rubricByEmail.get(email) || { count: 0, sumOverall: 0, sumDq: 0, sumFl: 0, sumRm: 0, sumCm: 0 };
    const rubricAvg = rubricAgg.count > 0 ? Number((rubricAgg.sumOverall / rubricAgg.count).toFixed(2)) : 0;
    const avgDq = rubricAgg.count > 0 ? Number((rubricAgg.sumDq / rubricAgg.count).toFixed(2)) : 0;
    const avgFl = rubricAgg.count > 0 ? Number((rubricAgg.sumFl / rubricAgg.count).toFixed(2)) : 0;
    const avgRm = rubricAgg.count > 0 ? Number((rubricAgg.sumRm / rubricAgg.count).toFixed(2)) : 0;
    const avgCm = rubricAgg.count > 0 ? Number((rubricAgg.sumCm / rubricAgg.count).toFixed(2)) : 0;

    let riskScore = 0;
    const drivers = [];
    if (inactivityDays >= 7) {
      riskScore += 2;
      drivers.push('Inactive 7+ days');
    }
    if (xpVelocity < 100) {
      riskScore += 2;
      drivers.push('Low XP velocity (7d)');
    }
    if (rubricAvg > 0 && rubricAvg < 3.2) {
      riskScore += 2;
      drivers.push('Low rubric average');
    }
    if (claimFailRate >= 0.25) {
      riskScore += 1;
      drivers.push('High claim fail rate');
    }

    const riskTier = riskScore >= 5 ? 'AT_RISK' : (riskScore >= 3 ? 'WATCH' : 'ENGAGED');
    const weakestDimension = weakestDimensionLabel_({
      decision_quality: avgDq,
      financial_logic: avgFl,
      risk_management: avgRm,
      communication: avgCm
    });

    out.push({
      email: email,
      display_name: String(getRowValue(row, users, 'display_name', '') || displayFromEmail(email)),
      xp_velocity_7d: xpVelocity,
      claims_success_7d: claimSuccess,
      claims_fail_7d: claimFail,
      claim_fail_rate_7d: claimFailRate,
      rubric_overall_avg: rubricAvg,
      rubric_count_7d: rubricAgg.count,
      inactivity_days: inactivityDays,
      risk_score: riskScore,
      risk_tier: riskTier,
      weakest_dimension: weakestDimension,
      drivers: drivers,
      averages: {
        decision_quality: avgDq,
        financial_logic: avgFl,
        risk_management: avgRm,
        communication: avgCm
      }
    });
  }

  out.sort(function(a, b) {
    if (a.risk_score !== b.risk_score) return b.risk_score - a.risk_score;
    if (a.inactivity_days !== b.inactivity_days) return b.inactivity_days - a.inactivity_days;
    return String(a.email).localeCompare(String(b.email));
  });

  if (persistSnapshots) {
    const ts = _now();
    out.forEach(function(row) {
      appendObjectRow('Analytics_Snapshots', {
        ts: ts,
        student_email: row.email,
        xp_velocity_7d: row.xp_velocity_7d,
        claim_fail_rate_7d: row.claim_fail_rate_7d,
        rubric_overall_avg: row.rubric_overall_avg,
        risk_tier: row.risk_tier,
        drivers_json: safeStringify(row.drivers)
      });
    });
  }

  return out;
}

function actionGetHealth_(payload) {
  const actorEmail = String(payload.actorEmail || '').toLowerCase().trim();
  const secretConfigured = !!getPortalSharedSecret_();
  let schemaOk = true;
  let schemaError = '';
  try {
    ensureSchema();
  } catch (err) {
    schemaOk = false;
    schemaError = String(err && err.message || err);
  }

  const ops = summarizeRecentOps_(24);
  const readiness = schemaOk && secretConfigured;
  return portalOk_('HEALTH_OK', 'Portal backend health snapshot.', {
    ts: nowIso_(),
    actor_email: actorEmail,
    status: readiness ? 'HEALTHY' : 'DEGRADED',
    checks: {
      shared_secret_configured: secretConfigured,
      schema_ok: schemaOk,
      schema_error: schemaError || '',
      apps_script_runtime: true
    },
    errors_24h: {
      total_errors: ops.total_errors,
      claims_errors: ops.claims_errors,
      auth_errors: ops.auth_errors,
      action_failures: ops.action_failures
    }
  });
}

function actionAdminGetLaunchReadiness_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const health = actionGetHealth_(payload).data;
  const validation = collectContentValidationIssues_({ checkLinks: false });
  const support = readSheet('Support_Tickets');
  const openSupport = support.rows.filter(function(row) {
    return upper(getRowValue(row, support, 'status', 'OPEN')) === 'OPEN';
  }).length;

  const checks = [
    {
      id: 'shared_secret',
      label: 'Apps Script shared secret configured',
      status: health.checks.shared_secret_configured ? 'PASS' : 'FAIL',
      detail: health.checks.shared_secret_configured ? 'Configured' : 'Missing PORTAL_SHARED_SECRET'
    },
    {
      id: 'schema',
      label: 'Sheet schema integrity',
      status: health.checks.schema_ok ? 'PASS' : 'FAIL',
      detail: health.checks.schema_ok ? 'All required headers present' : health.checks.schema_error
    },
    {
      id: 'error_budget',
      label: 'Error budget (last 24h)',
      status: health.errors_24h.total_errors <= 5 ? 'PASS' : 'WARN',
      detail: 'Errors: ' + health.errors_24h.total_errors
    },
    {
      id: 'content_validation',
      label: 'Published curriculum validation',
      status: validation.summary.errors === 0 ? 'PASS' : 'FAIL',
      detail: 'Errors: ' + validation.summary.errors + ', Warnings: ' + validation.summary.warnings
    },
    {
      id: 'support_load',
      label: 'Support queue pressure',
      status: openSupport <= 15 ? 'PASS' : 'WARN',
      detail: 'Open tickets: ' + openSupport
    }
  ];

  const hasFail = checks.some(function(c) { return c.status === 'FAIL'; });
  const hasWarn = checks.some(function(c) { return c.status === 'WARN'; });
  const overall = hasFail ? 'NOT_READY' : (hasWarn ? 'READY_WITH_WARNINGS' : 'READY');

  return portalOk_('LAUNCH_READINESS_OK', 'Launch readiness evaluated.', {
    overall_status: overall,
    checks: checks,
    health: health,
    validation_summary: validation.summary
  });
}

function actionAdminRunSmokeChecks_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const actorEmail = assertActorEmail_(payload);
  const checks = [];

  function pushCheck(id, label, fn) {
    try {
      const detail = fn();
      checks.push({ id: id, label: label, status: 'PASS', detail: detail || 'OK' });
    } catch (err) {
      checks.push({
        id: id,
        label: label,
        status: 'FAIL',
        detail: String(err && err.message || err)
      });
    }
  }

  pushCheck('dashboard', 'Dashboard payload generation', function() {
    const data = getDashboardData_(actorEmail);
    if (!data || !data.user) throw new Error('Dashboard user payload missing');
    return 'User payload present';
  });

  pushCheck('published_curriculum', 'Published curriculum availability', function() {
    const data = actionGetPublishedCurriculum_({ data: {} }).data;
    if (!data || !Array.isArray(data.activities)) throw new Error('Published activities not available');
    return 'Activities: ' + data.activities.length;
  });

  pushCheck('claim_codes', 'Claim code table readable', function() {
    const d = readSheet('Claim_Codes');
    return 'Claim rows: ' + d.rows.length;
  });

  pushCheck('raffle_state', 'Raffle state readable', function() {
    const active = getActiveRaffle_();
    return active ? ('Active raffle: ' + active.raffle_id) : 'No active raffle (acceptable)';
  });

  pushCheck('journal_queue', 'Journal queue readable', function() {
    const rows = actionAdminGetJournalReviewQueue_(payload).data || [];
    return 'Pending journals: ' + rows.length;
  });

  const failed = checks.filter(function(c) { return c.status === 'FAIL'; }).length;
  const overall = failed ? 'FAIL' : 'PASS';
  return portalOk_('SMOKE_RUN_OK', 'Smoke checks completed.', {
    overall: overall,
    checks: checks,
    failed: failed
  });
}

function actionAdminGetContentValidation_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const checkLinks = data.check_links === true;
  const persist = data.persist !== false;
  const result = collectContentValidationIssues_({ checkLinks: checkLinks });
  if (persist && result.issues.length) {
    writeContentValidationLog_(result.issues.slice(0, 500));
  }
  return portalOk_('CONTENT_VALIDATION_OK', 'Content validation completed.', {
    summary: result.summary,
    issues: result.issues.slice(0, 500),
    check_links: checkLinks
  });
}

function actionAdminGetAtRiskStudents_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const lookbackDays = Math.max(1, Number(data.lookback_days || 7));
  const persistSnapshots = data.persist_snapshots !== false;
  const rows = computeAtRiskRows_({
    lookback_days: lookbackDays,
    persist_snapshots: persistSnapshots
  });
  return portalOk_('AT_RISK_STUDENTS_OK', 'At-risk segmentation generated.', {
    lookback_days: lookbackDays,
    summary: {
      at_risk: rows.filter(function(r) { return r.risk_tier === 'AT_RISK'; }).length,
      watch: rows.filter(function(r) { return r.risk_tier === 'WATCH'; }).length,
      engaged: rows.filter(function(r) { return r.risk_tier === 'ENGAGED'; }).length
    },
    rows: rows
  });
}

function actionAdminGetCohortTrends_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const data = payload.data || {};
  const weeksBack = Math.max(4, Math.min(26, Number(data.weeks_back || 8)));
  const weekMap = new Map();

  for (let w = weeksBack - 1; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - (w * 7));
    const key = weekBucketNY_(d);
    weekMap.set(key, {
      week: key,
      xp_total: 0,
      claims_success: 0,
      claims_fail: 0,
      claim_fail_rate: 0,
      rubric_overall_avg: 0,
      rubric_count: 0
    });
  }

  const ledger = readSheet('XP_Ledger');
  for (let i = 0; i < ledger.rows.length; i++) {
    const row = ledger.rows[i];
    const key = weekBucketNY_(getRowValue(row, ledger, 'ts', ''));
    if (!weekMap.has(key)) continue;
    const points = Number(getRowValue(row, ledger, 'points', 0)) || 0;
    const t = weekMap.get(key);
    t.xp_total += points;
    t.claims_success += 1;
  }

  const ops = readSheet('Ops_Log');
  for (let i = 0; i < ops.rows.length; i++) {
    const row = ops.rows[i];
    const key = weekBucketNY_(getRowValue(row, ops, 'ts', ''));
    if (!weekMap.has(key)) continue;
    const event = String(getRowValue(row, ops, 'event', ''));
    const details = parseJsonSafe_(String(getRowValue(row, ops, 'details_json', '{}'))) || {};
    if (String(details.action || '') !== 'portal.submitClaim') continue;
    if (event.indexOf('portal_action_error') < 0 && event.indexOf('portal_action_bad_request') < 0) continue;
    weekMap.get(key).claims_fail += 1;
  }

  const journal = readSheet('Decision_Journal');
  for (let i = 0; i < journal.rows.length; i++) {
    const row = journal.rows[i];
    if (upper(getRowValue(row, journal, 'status', '')) !== 'SCORED') continue;
    const key = weekBucketNY_(getRowValue(row, journal, 'scored_at', ''));
    if (!weekMap.has(key)) continue;

    const dq = Number(getRowValue(row, journal, 'score_decision_quality', 0)) || 0;
    const fl = Number(getRowValue(row, journal, 'score_financial_logic', 0)) || 0;
    const rm = Number(getRowValue(row, journal, 'score_risk_management', 0)) || 0;
    const cm = Number(getRowValue(row, journal, 'score_communication', 0)) || 0;
    const overall = (dq + fl + rm + cm) / 4;

    const t = weekMap.get(key);
    t.rubric_overall_avg += overall;
    t.rubric_count += 1;
  }

  const series = Array.from(weekMap.values()).sort(function(a, b) {
    return String(a.week).localeCompare(String(b.week));
  }).map(function(t) {
    const claimTotal = t.claims_success + t.claims_fail;
    return {
      week: t.week,
      xp_total: t.xp_total,
      claims_success: t.claims_success,
      claims_fail: t.claims_fail,
      claim_fail_rate: claimTotal ? Number((t.claims_fail / claimTotal).toFixed(4)) : 0,
      rubric_overall_avg: t.rubric_count ? Number((t.rubric_overall_avg / t.rubric_count).toFixed(2)) : 0,
      rubric_count: t.rubric_count
    };
  });

  return portalOk_('COHORT_TRENDS_OK', 'Cohort trends generated.', {
    weeks_back: weeksBack,
    series: series
  });
}

function actionAdminGetInterventionQueue_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const atRisk = computeAtRiskRows_({
    lookback_days: 7,
    persist_snapshots: false
  });
  const templates = listSheetObjects_('Intervention_Templates', false).filter(function(row) {
    return String(row.enabled || 'TRUE').toLowerCase() !== 'false';
  });

  function templateForDimension(label) {
    const key = String(label || '').toUpperCase().replace(/ /g, '_');
    return templates.find(function(t) { return upper(t.dimension || '') === key; }) || null;
  }

  const queue = atRisk
    .filter(function(row) { return row.risk_tier !== 'ENGAGED'; })
    .map(function(row) {
      const template = templateForDimension(row.weakest_dimension);
      const priority = row.risk_score * 10 + row.inactivity_days + Math.round(row.claim_fail_rate_7d * 10);
      return {
        email: row.email,
        display_name: row.display_name,
        risk_tier: row.risk_tier,
        risk_score: row.risk_score,
        inactivity_days: row.inactivity_days,
        weakest_dimension: row.weakest_dimension,
        drivers: row.drivers,
        priority_score: priority,
        recommended_template_id: template ? String(template.template_id || '') : '',
        recommended_title: template ? String(template.title || '') : '',
        recommended_message: template ? String(template.message_template || '') : 'Schedule targeted coaching check-in.',
        next_steps: template ? String(template.next_steps || '') : ''
      };
    })
    .sort(function(a, b) { return b.priority_score - a.priority_score; });

  return portalOk_('INTERVENTION_QUEUE_OK', 'Intervention queue generated.', {
    total: queue.length,
    queue: queue
  });
}

function actionGetStatus_(payload) {
  const activeRaffle = getActiveRaffle_();
  const ops = readSheet('Ops_Log');
  const recent = ops.rows.slice(-25);

  const recentErrors = [];
  for (let i = 0; i < recent.length; i++) {
    const ev = String(getRowValue(recent[i], ops, 'event', ''));
    if (ev.toLowerCase().indexOf('error') === -1) continue;

    recentErrors.push({
      ts: getRowValue(recent[i], ops, 'ts', ''),
      event: ev
    });
  }

  return portalOk_('STATUS_OK', 'Status loaded.', {
    portal: 'OPERATIONAL',
    active_raffle: activeRaffle,
    recent_errors: recentErrors
  });
}

function actionGetActivityHistory_(payload) {
  const email = assertActorEmail_(payload);

  const out = [];

  const xp = readSheet('XP_Ledger');
  for (let i = 0; i < xp.rows.length; i++) {
    const row = xp.rows[i];
    if (String(getRowValue(row, xp, 'email', '')).toLowerCase() !== String(email).toLowerCase()) continue;
    out.push({
      ts: getRowValue(row, xp, 'ts', ''),
      kind: 'CLAIM',
      title: 'XP +'+ String(Number(getRowValue(row, xp, 'points', 0)) || 0),
      detail: 'Track ' + String(getRowValue(row, xp, 'track', '')) + ' · Module ' + String(getRowValue(row, xp, 'module', '')) + ' · Lesson ' + String(getRowValue(row, xp, 'lesson', ''))
    });
  }

  const entries = getRaffleEntries_('', email);
  entries.forEach(function(e) {
    out.push({
      ts: e.created_at,
      kind: 'RAFFLE',
      title: 'Raffle entry',
      detail: e.raffle_id + ' · Tickets spent: ' + e.tickets_spent
    });
  });

  const notifs = actionGetNotifications_({ actorEmail: email, data: { limit: 200 }, actorRole: payload.actorRole || 'STUDENT' }).data || [];
  notifs.forEach(function(n) {
    out.push({
      ts: n.created_at,
      kind: 'NOTIFICATION',
      title: n.title,
      detail: n.body
    });
  });

  out.sort(function(a, b) {
    return new Date(b.ts).getTime() - new Date(a.ts).getTime();
  });

  return portalOk_('ACTIVITY_HISTORY_OK', 'Activity history loaded.', out.slice(0, 250));
}

function actionAdminAuditLog_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);
  const d = readSheet('Ops_Log');
  const data = payload.data || {};
  const limit = Math.max(1, Math.min(500, Number(data.limit || 200)));

  const out = [];
  for (let i = d.rows.length - 1; i >= 0 && out.length < limit; i--) {
    const row = d.rows[i];
    out.push({
      ts: getRowValue(row, d, 'ts', ''),
      event: String(getRowValue(row, d, 'event', '')),
      details_json: String(getRowValue(row, d, 'details_json', ''))
    });
  }

  return portalOk_('AUDIT_LOG_OK', 'Audit log loaded.', out);
}

function seedCurriculumDraftFromCatalogIfEmpty_() {
  const programsDraft = readSheet('Programs_Draft');
  const activitiesDraft = readSheet('Activities_Draft');
  if (programsDraft.rows.length || activitiesDraft.rows.length) return;

  const catalog = readSheet('Catalog');
  if (!catalog.rows.length) return;

  const actorEmail = String((ADMIN_EMAILS && ADMIN_EMAILS[0]) || 'system@bow.local').toLowerCase();
  const now = _now();
  const programId = 'PRG_BOW_TIER1';

  appendObjectRow('Programs_Draft', {
    program_id: programId,
    name: 'BOW Tier 1 Foundations',
    version_label: 'v1',
    age_group: 'Cohort',
    learning_goals_json: safeStringify([
      'Business decision-making through sports',
      'Financial logic and tradeoff analysis',
      'Negotiation and communication'
    ]),
    status: 'DRAFT',
    sort_order: 1,
    updated_at: now,
    updated_by: actorEmail
  });

  const catalogRows = catalog.rows.map(function(row) {
    return {
      track: String(getRowValue(row, catalog, 'track', '')).trim(),
      moduleId: normalizeModuleKey(getRowValue(row, catalog, 'module_id', '')),
      lessonId: Number(getRowValue(row, catalog, 'lesson_id', 0)) || 0,
      lessonTitle: String(getRowValue(row, catalog, 'lesson_title', '')).trim(),
      activityUrl: String(getRowValue(row, catalog, 'activity_url', '')).trim()
    };
  }).filter(function(row) {
    return row.track && row.moduleId && row.lessonId;
  }).sort(function(a, b) {
    if (a.track !== b.track) return String(a.track).localeCompare(String(b.track));
    if (a.moduleId !== b.moduleId) return String(a.moduleId).localeCompare(String(b.moduleId));
    return Number(a.lessonId) - Number(b.lessonId);
  });

  const moduleMap = new Map();
  const lessonMap = new Map();
  const moduleCounters = {};
  let canAutoPublish = true;
  let nextModuleSort = 1;

  for (let i = 0; i < catalogRows.length; i++) {
    const row = catalogRows[i];
    const moduleKey = row.track + '|' + row.moduleId;

    if (!moduleMap.has(moduleKey)) {
      const moduleId = ('MOD_' + row.track + '_' + row.moduleId).replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
      moduleMap.set(moduleKey, moduleId);
      moduleCounters[moduleKey] = 0;

      appendObjectRow('Modules_Draft', {
        module_id: moduleId,
        program_id: programId,
        module_title: 'Track ' + row.track + ' Module ' + row.moduleId,
        core_competency: 'Decision Making',
        description: 'Applied sports-business decision module.',
        sort_order: nextModuleSort++,
        status: 'DRAFT',
        updated_at: now,
        updated_by: actorEmail
      });
    }

    const moduleId = moduleMap.get(moduleKey);
    moduleCounters[moduleKey] += 1;
    const lessonKey = ('LES_' + row.track + '_' + row.moduleId + '_' + row.lessonId).replace(/[^A-Z0-9_]/gi, '_').toUpperCase();

    if (!lessonMap.has(lessonKey)) {
      lessonMap.set(lessonKey, true);
      appendObjectRow('Lessons_Draft', {
        lesson_key: lessonKey,
        program_id: programId,
        module_id: moduleId,
        lesson_id: row.lessonId,
        lesson_title: row.lessonTitle || ('Lesson ' + row.lessonId),
        concept_intro: 'Core concept introduced through sports context.',
        case_context: 'Students evaluate a realistic front-office scenario.',
        decision_prompt: 'Pick the best option and defend your decision.',
        debrief_framework: 'Decision -> Evidence -> Risk -> Reflection',
        sort_order: moduleCounters[moduleKey],
        status: 'DRAFT',
        updated_at: now,
        updated_by: actorEmail
      });

      appendObjectRow('Outcomes_Draft', {
        outcome_id: ('OUT_' + lessonKey).replace(/[^A-Z0-9_]/gi, '_').toUpperCase(),
        lesson_key: lessonKey,
        module_id: moduleId,
        skill_name: 'Strategic Decision-Making',
        framework_name: 'Decision-Evidence-Risk',
        mastery_definition: 'Student presents a decision with clear financial and strategic logic.',
        assessment_hint: 'Score decision quality, finance, risk, communication.',
        sort_order: 1,
        status: 'DRAFT',
        updated_at: now,
        updated_by: actorEmail
      });
    }

    appendObjectRow('Activities_Draft', {
      activity_id: ('ACT_' + lessonKey).replace(/[^A-Z0-9_]/gi, '_').toUpperCase(),
      lesson_key: lessonKey,
      track: row.track,
      module_id: row.moduleId,
      lesson_id: row.lessonId,
      activity_title: row.lessonTitle || ('Activity ' + row.lessonId),
      activity_type: 'SIMULATION',
      sim_url: row.activityUrl,
      claim_code_pattern: 'T' + row.track + '-M' + row.moduleId + '-L' + row.lessonId,
      estimated_minutes: 20,
      role_focus: 'Front Office',
      difficulty: 'Core',
      sort_order: moduleCounters[moduleKey],
      status: 'DRAFT',
      updated_at: now,
      updated_by: actorEmail
    });

    if (!row.activityUrl) {
      canAutoPublish = false;
    }
  }

  const publishedPrograms = readSheet('Programs_Published');
  if (!publishedPrograms.rows.length && canAutoPublish) {
    try {
      actionAdminPublishCurriculum_({
        actorEmail: actorEmail,
        actorRole: 'ADMIN',
        data: {
          notes: 'Initial curriculum seed from Catalog'
        }
      });
    } catch (err) {
      logOps('portal_curriculum_seed_publish_error', {
        error: String(err && err.message || err)
      });
    }
  } else if (!canAutoPublish) {
    logOps('portal_curriculum_seed_publish_skipped', {
      reason: 'MISSING_SIM_URL_IN_CATALOG'
    });
  }
}

function seedPortalDefaults_() {
  const faq = readSheet('Help_FAQ');
  if (!faq.rows.length) {
    appendObjectRow('Help_FAQ', {
      faq_id: generateId_('FAQ'),
      question: 'How do I earn XP?',
      answer: 'Submit valid claim codes in Claim Center. XP updates your level and raffle tickets.',
      audience: 'ALL',
      enabled: 'TRUE',
      sort_order: 1
    });
    appendObjectRow('Help_FAQ', {
      faq_id: generateId_('FAQ'),
      question: 'How do raffle tickets work?',
      answer: 'You earn 1 ticket per 100 net XP. Tickets are spent when you enter raffles and expire when raffle closes.',
      audience: 'ALL',
      enabled: 'TRUE',
      sort_order: 2
    });
    appendObjectRow('Help_FAQ', {
      faq_id: generateId_('FAQ'),
      question: 'How do credentials get issued?',
      answer: 'Credentials are issued automatically when module/track milestones are met.',
      audience: 'ALL',
      enabled: 'TRUE',
      sort_order: 3
    });
  }

  ensureInterventionTemplateSeeds_();
  seedCurriculumDraftFromCatalogIfEmpty_();
}

function actionActivateInvite_(payload) {
  const data = payload.data || {};
  const inviteId = String(data.invite_id || '').trim();
  const email = String(data.email || payload.actorEmail || '').toLowerCase().trim();
  const firebaseUid = String(data.firebase_uid || '').trim();

  if (!inviteId || !email) {
    return portalErr_('MISSING_FIELDS', 'invite_id and email are required.', null);
  }

  const invites = readSheet('Portal_Invites');
  for (let i = 0; i < invites.rows.length; i++) {
    const row = invites.rows[i];
    const id = String(getRowValue(row, invites, 'invite_id', '')).trim();
    if (id !== inviteId) continue;

    const invitedEmail = String(getRowValue(row, invites, 'email', '')).toLowerCase().trim();
    const status = upper(getRowValue(row, invites, 'status', 'ISSUED'));
    const role = normalizeRole_(getRowValue(row, invites, 'role', 'STUDENT'));
    const expiresAtRaw = getRowValue(row, invites, 'expires_at', '');
    const expiresAt = expiresAtRaw ? toDate_(expiresAtRaw) : null;

    if (invitedEmail !== email) {
      return portalErr_('INVITE_EMAIL_MISMATCH', 'Invite does not belong to this email.', null);
    }
    if (status !== 'ISSUED') {
      return portalErr_('INVITE_NOT_ACTIVE', 'Invite is not active.', { status: status });
    }
    if (expiresAt && Date.now() > expiresAt.getTime()) {
      return portalErr_('INVITE_EXPIRED', 'Invite has expired.', null);
    }

    setCellByKey(invites, i + 2, 'status', 'ACCEPTED');

    upsertPortalUser_({
      email: email,
      role: role,
      status: 'ACTIVE',
      firebaseUid: firebaseUid || undefined,
      activatedAt: _now(),
      lastLoginAt: _now()
    });

    addNotification_(email, 'Account activated', 'Your class portal account is now active.', 'ACCOUNT');

    logOps('portal_activate_invite_ok', {
      invite_id: inviteId,
      email: email,
      role: role
    });

    return portalOk_('INVITE_ACTIVATED', 'Invite activated.', {
      invite_id: inviteId,
      email: email,
      role: role,
      status: 'ACTIVE'
    });
  }

  return portalErr_('INVITE_NOT_FOUND', 'Invite not found.', null);
}

/* =====================================================================
 * FEATURE 40 — Referral / Invite System
 * ===================================================================== */

function actionGetMyReferralLink_(payload) {
  const email = assertActorEmail_(payload);

  const d = readSheet('Referral_Codes');
  for (let i = 0; i < d.rows.length; i++) {
    const em = String(getRowValue(d.rows[i], d, 'email', '')).toLowerCase().trim();
    if (em === email) {
      return portalOk_('REFERRAL_LINK_OK', 'Referral code retrieved.', {
        referral_code: String(getRowValue(d.rows[i], d, 'referral_code', '')),
        uses_count: Number(getRowValue(d.rows[i], d, 'uses_count', 0)) || 0,
        created_at: getRowValue(d.rows[i], d, 'created_at', '')
      });
    }
  }

  // Create a new referral code for this student.
  const code = 'REF_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
  appendObjectRow('Referral_Codes', {
    referral_code: code,
    email: email,
    created_at: nowIso_(),
    uses_count: 0
  });

  return portalOk_('REFERRAL_LINK_CREATED', 'Referral code created.', {
    referral_code: code,
    uses_count: 0,
    created_at: nowIso_()
  });
}

function actionAdminRedeemReferral_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const referralCode = String(data.referral_code || '').trim();
  const referredEmail = String(data.referred_email || '').toLowerCase().trim();
  const xpAmount = Math.max(0, Number(data.xp_amount || 500));

  if (!referralCode || !referredEmail) {
    return portalErr_('MISSING_FIELDS', 'referral_code and referred_email are required.', null);
  }

  // Look up the referral code to find the referrer.
  const rc = readSheet('Referral_Codes');
  let referrerEmail = '';
  let rcRowNum = -1;
  for (let i = 0; i < rc.rows.length; i++) {
    const code = String(getRowValue(rc.rows[i], rc, 'referral_code', '')).trim();
    if (code !== referralCode) continue;
    referrerEmail = String(getRowValue(rc.rows[i], rc, 'email', '')).toLowerCase().trim();
    rcRowNum = i + 2;
    break;
  }

  if (!referrerEmail) {
    return portalErr_('INVALID_REFERRAL_CODE', 'Referral code not found.', null);
  }

  // Check for duplicate redemptions.
  const rr = readSheet('Referral_Redemptions');
  for (let i = 0; i < rr.rows.length; i++) {
    const refEmail = String(getRowValue(rr.rows[i], rr, 'referred_email', '')).toLowerCase().trim();
    if (refEmail === referredEmail) {
      return portalErr_('ALREADY_REDEEMED', 'This referred email has already been redeemed.', null);
    }
  }

  const redemptionId = generateId_('RDM');
  appendObjectRow('Referral_Redemptions', {
    redemption_id: redemptionId,
    referral_code: referralCode,
    referrer_email: referrerEmail,
    referred_email: referredEmail,
    redeemed_at: nowIso_(),
    xp_awarded: xpAmount
  });

  // Increment uses_count on the referral code row.
  if (rcRowNum > 0) {
    const curUses = Number(getRowValue(rc.rows[rcRowNum - 2], rc, 'uses_count', 0)) || 0;
    setCellByKey(rc, rcRowNum, 'uses_count', curUses + 1);
  }

  // Award XP to the referrer via XP_Ledger.
  appendObjectRow('XP_Ledger', {
    ts: nowIso_(),
    email: referrerEmail,
    name: getDisplayNameByEmail_(referrerEmail),
    track: 'REFERRAL',
    outcome: 'REFERRAL_BONUS',
    action: 'REFERRAL_REDEEMED',
    module: '',
    lesson: '',
    points: xpAmount,
    note: 'Referral bonus for enrolling ' + referredEmail,
    key: 'referral:' + redemptionId,
    ref_code: referralCode,
    tier: '',
    delta_reason: 'REFERRAL_BONUS',
    source: 'admin'
  });

  addNotification_(referrerEmail, 'Referral bonus earned', 'You earned ' + xpAmount + ' XP because ' + referredEmail + ' enrolled using your referral link!', 'INFO');

  logOps('portal_admin_redeem_referral_ok', {
    referral_code: referralCode,
    referrer_email: referrerEmail,
    referred_email: referredEmail,
    xp_awarded: xpAmount,
    redemption_id: redemptionId
  });

  return portalOk_('REFERRAL_REDEEMED', 'Referral redeemed and XP awarded.', {
    redemption_id: redemptionId,
    referrer_email: referrerEmail,
    referred_email: referredEmail,
    xp_awarded: xpAmount
  });
}

function actionAdminGetReferralActivity_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const codes = listSheetObjects_('Referral_Codes', false);
  const redemptions = listSheetObjects_('Referral_Redemptions', false);

  return portalOk_('REFERRAL_ACTIVITY_OK', 'Referral activity loaded.', {
    referral_codes: codes,
    referral_redemptions: redemptions
  });
}

/* =====================================================================
 * FEATURE 41 — Student Spotlight Generator
 * ===================================================================== */

function actionAdminGetStudentSpotlight_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const targetEmail = String(data.email || '').toLowerCase().trim();
  if (!targetEmail) return portalErr_('MISSING_EMAIL', 'Student email is required.', null);

  // Basic student info.
  const pu = getPortalUser_(targetEmail);
  const users = readSheet('Users');
  let displayName = targetEmail.split('@')[0];
  let xp = 0;
  let level = 1;
  let streakDays = 0;
  for (let i = 0; i < users.rows.length; i++) {
    const em = String(getRowValue(users.rows[i], users, 'email', '')).toLowerCase().trim();
    if (em !== targetEmail) continue;
    displayName = String(getRowValue(users.rows[i], users, 'display_name', '') || targetEmail.split('@')[0]);
    xp = Number(getRowValue(users.rows[i], users, 'xp', 0)) || 0;
    level = Number(getRowValue(users.rows[i], users, 'level', 1)) || 1;
    streakDays = Number(getRowValue(users.rows[i], users, 'streak_days', 0)) || 0;
    break;
  }

  // Badges.
  const achievements = readSheet('Achievements');
  const badges = [];
  for (let i = 0; i < achievements.rows.length; i++) {
    const em = String(getRowValue(achievements.rows[i], achievements, 'email', '')).toLowerCase().trim();
    if (em !== targetEmail) continue;
    badges.push(String(getRowValue(achievements.rows[i], achievements, 'badge_id', '')));
  }

  // League points this season.
  let leaguePoints = 0;
  const activeSeason = getActiveSeason_();
  if (activeSeason) {
    const lpl = readSheet('League_Points_Ledger');
    for (let i = 0; i < lpl.rows.length; i++) {
      const em = String(getRowValue(lpl.rows[i], lpl, 'email', '')).toLowerCase().trim();
      const sid = String(getRowValue(lpl.rows[i], lpl, 'season_id', '')).trim();
      if (em !== targetEmail || sid !== activeSeason.season_id) continue;
      leaguePoints += Number(getRowValue(lpl.rows[i], lpl, 'delta_points', 0)) || 0;
    }
  }

  // Best journal quote.
  let bestQuote = '';
  const journal = readSheet('Decision_Journal');
  const journalEntries = [];
  for (let i = 0; i < journal.rows.length; i++) {
    const em = String(getRowValue(journal.rows[i], journal, 'email', '')).toLowerCase().trim();
    if (em !== targetEmail) continue;
    const status = String(getRowValue(journal.rows[i], journal, 'status', '')).toUpperCase();
    if (status !== 'SCORED') continue;
    const text = String(getRowValue(journal.rows[i], journal, 'decision_text', '') || '').trim();
    if (text) journalEntries.push(text);
  }
  if (journalEntries.length > 0) {
    bestQuote = journalEntries[journalEntries.length - 1].substring(0, 200);
  }

  // Claims count.
  const xpLedger = readSheet('XP_Ledger');
  let claimsCount = 0;
  for (let i = 0; i < xpLedger.rows.length; i++) {
    const em = String(getRowValue(xpLedger.rows[i], xpLedger, 'email', '')).toLowerCase().trim();
    const action = String(getRowValue(xpLedger.rows[i], xpLedger, 'action', '')).toUpperCase();
    if (em === targetEmail && action === 'CLAIM_ACCEPTED') claimsCount++;
  }

  return portalOk_('SPOTLIGHT_OK', 'Spotlight data loaded.', {
    email: targetEmail,
    display_name: displayName,
    xp: xp,
    level: level,
    streak_days: streakDays,
    badges: badges,
    top_badge: badges.length > 0 ? badges[badges.length - 1] : null,
    league_points: leaguePoints,
    claims_count: claimsCount,
    best_quote: bestQuote,
    active_season: activeSeason ? activeSeason.title : null,
    role: pu ? pu.role : 'STUDENT',
    status: pu ? pu.status : 'ACTIVE'
  });
}

/* =====================================================================
 * FEATURE 42 — Admin Private Notes on Students
 * ===================================================================== */

function actionAdminAddStudentNote_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const studentEmail = String(data.student_email || '').toLowerCase().trim();
  const body = String(data.body || '').trim();

  if (!studentEmail || !body) {
    return portalErr_('MISSING_FIELDS', 'student_email and body are required.', null);
  }

  const noteId = generateId_('NOTE');
  appendObjectRow('Admin_Notes', {
    note_id: noteId,
    student_email: studentEmail,
    author_email: String(payload.actorEmail || '').toLowerCase(),
    body: body,
    created_at: nowIso_()
  });

  logOps('portal_admin_note_added', {
    note_id: noteId,
    student_email: studentEmail,
    author: String(payload.actorEmail || '').toLowerCase()
  });

  return portalOk_('NOTE_ADDED', 'Note added.', { note_id: noteId });
}

function actionAdminGetStudentNotes_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const filterEmail = String(data.student_email || '').toLowerCase().trim();

  const d = readSheet('Admin_Notes');
  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const stuEmail = String(getRowValue(row, d, 'student_email', '')).toLowerCase().trim();
    if (filterEmail && stuEmail !== filterEmail) continue;
    out.push({
      note_id: String(getRowValue(row, d, 'note_id', '')),
      student_email: stuEmail,
      author_email: String(getRowValue(row, d, 'author_email', '')).toLowerCase(),
      body: String(getRowValue(row, d, 'body', '')),
      created_at: getRowValue(row, d, 'created_at', '')
    });
  }

  // Return most recent first.
  out.sort(function(a, b) { return sortAscDate_(b.created_at, a.created_at); });

  return portalOk_('NOTES_OK', 'Notes loaded.', out);
}

function actionAdminDeleteStudentNote_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const noteId = String(data.note_id || '').trim();
  if (!noteId) return portalErr_('MISSING_NOTE_ID', 'note_id is required.', null);

  const d = readSheet('Admin_Notes');
  for (let i = 0; i < d.rows.length; i++) {
    const id = String(getRowValue(d.rows[i], d, 'note_id', '')).trim();
    if (id !== noteId) continue;
    d.sh.deleteRow(i + 2);
    logOps('portal_admin_note_deleted', { note_id: noteId, actor: String(payload.actorEmail || '').toLowerCase() });
    return portalOk_('NOTE_DELETED', 'Note deleted.', { note_id: noteId });
  }

  return portalErr_('NOTE_NOT_FOUND', 'Note not found.', null);
}

/* =====================================================================
 * FEATURE 43 — Scheduled Portal Announcements
 * ===================================================================== */

function actionAdminUpsertAnnouncement_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const existingId = String(data.announcement_id || '').trim();
  const title = String(data.title || '').trim();
  const body = String(data.body || '').trim();
  const showAt = String(data.show_at || '').trim();
  const autoHideAt = String(data.auto_hide_at || '').trim();

  if (!title || !body) {
    return portalErr_('MISSING_FIELDS', 'title and body are required.', null);
  }

  const d = readSheet('Portal_Announcements');

  if (existingId) {
    for (let i = 0; i < d.rows.length; i++) {
      const id = String(getRowValue(d.rows[i], d, 'announcement_id', '')).trim();
      if (id !== existingId) continue;
      if (title) setCellByKey(d, i + 2, 'title', title);
      if (body) setCellByKey(d, i + 2, 'body', body);
      if (showAt !== undefined) setCellByKey(d, i + 2, 'show_at', showAt);
      if (autoHideAt !== undefined) setCellByKey(d, i + 2, 'auto_hide_at', autoHideAt);
      if (data.status) setCellByKey(d, i + 2, 'status', String(data.status).toUpperCase());
      return portalOk_('ANNOUNCEMENT_UPDATED', 'Announcement updated.', { announcement_id: existingId });
    }
    return portalErr_('ANNOUNCEMENT_NOT_FOUND', 'Announcement not found.', null);
  }

  const announcementId = generateId_('ANN');
  appendObjectRow('Portal_Announcements', {
    announcement_id: announcementId,
    title: title,
    body: body,
    show_at: showAt || nowIso_(),
    auto_hide_at: autoHideAt || '',
    status: 'ACTIVE',
    created_by: String(payload.actorEmail || '').toLowerCase(),
    created_at: nowIso_()
  });

  logOps('portal_admin_announcement_created', {
    announcement_id: announcementId,
    title: title,
    actor: String(payload.actorEmail || '').toLowerCase()
  });

  return portalOk_('ANNOUNCEMENT_CREATED', 'Announcement created.', { announcement_id: announcementId });
}

function actionAdminListAnnouncements_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const d = readSheet('Portal_Announcements');
  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    out.push({
      announcement_id: String(getRowValue(row, d, 'announcement_id', '')),
      title: String(getRowValue(row, d, 'title', '')),
      body: String(getRowValue(row, d, 'body', '')),
      show_at: getRowValue(row, d, 'show_at', ''),
      auto_hide_at: getRowValue(row, d, 'auto_hide_at', ''),
      status: String(getRowValue(row, d, 'status', 'ACTIVE')).toUpperCase(),
      created_by: String(getRowValue(row, d, 'created_by', '')).toLowerCase(),
      created_at: getRowValue(row, d, 'created_at', '')
    });
  }
  out.sort(function(a, b) { return sortAscDate_(b.created_at, a.created_at); });
  return portalOk_('ANNOUNCEMENTS_OK', 'Announcements loaded.', out);
}

function actionAdminDismissAnnouncement_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const announcementId = String(data.announcement_id || '').trim();
  if (!announcementId) return portalErr_('MISSING_ID', 'announcement_id is required.', null);

  const d = readSheet('Portal_Announcements');
  for (let i = 0; i < d.rows.length; i++) {
    const id = String(getRowValue(d.rows[i], d, 'announcement_id', '')).trim();
    if (id !== announcementId) continue;
    setCellByKey(d, i + 2, 'status', 'DISMISSED');
    logOps('portal_admin_announcement_dismissed', { announcement_id: announcementId });
    return portalOk_('ANNOUNCEMENT_DISMISSED', 'Announcement dismissed.', { announcement_id: announcementId });
  }

  return portalErr_('ANNOUNCEMENT_NOT_FOUND', 'Announcement not found.', null);
}

function actionGetActiveAnnouncements_(payload) {
  assertActorEmail_(payload);
  const now = new Date();

  const d = readSheet('Portal_Announcements');
  const out = [];
  for (let i = 0; i < d.rows.length; i++) {
    const row = d.rows[i];
    const status = String(getRowValue(row, d, 'status', '')).toUpperCase();
    if (status !== 'ACTIVE') continue;

    const showAt = getRowValue(row, d, 'show_at', '');
    if (showAt) {
      const showDate = toDate_(showAt);
      if (showDate && showDate > now) continue;
    }

    const autoHideAt = getRowValue(row, d, 'auto_hide_at', '');
    if (autoHideAt) {
      const hideDate = toDate_(autoHideAt);
      if (hideDate && hideDate < now) continue;
    }

    out.push({
      announcement_id: String(getRowValue(row, d, 'announcement_id', '')),
      title: String(getRowValue(row, d, 'title', '')),
      body: String(getRowValue(row, d, 'body', '')),
      show_at: showAt,
      created_at: getRowValue(row, d, 'created_at', '')
    });
  }

  out.sort(function(a, b) { return sortAscDate_(b.created_at, a.created_at); });
  return portalOk_('ANNOUNCEMENTS_OK', 'Active announcements loaded.', out);
}

/* =====================================================================
 * FEATURE 44 — Admin Broadcast Message
 * ===================================================================== */

function actionAdminBroadcastMessage_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const title = String(data.title || '').trim();
  const body = String(data.body || '').trim();
  const kind = String(data.kind || 'INFO').toUpperCase();

  if (!title || !body) {
    return portalErr_('MISSING_FIELDS', 'title and body are required.', null);
  }

  // Get all active students.
  const pu = readSheet('Portal_Users');
  const recipients = [];
  for (let i = 0; i < pu.rows.length; i++) {
    const row = pu.rows[i];
    const email = String(getRowValue(row, pu, 'email', '')).toLowerCase().trim();
    const role = String(getRowValue(row, pu, 'role', '')).toUpperCase();
    const status = String(getRowValue(row, pu, 'status', '')).toUpperCase();
    if (!email || role !== 'STUDENT' || status === 'SUSPENDED') continue;
    recipients.push(email);
  }

  for (let i = 0; i < recipients.length; i++) {
    addNotification_(recipients[i], title, body, kind);
  }

  logOps('portal_admin_broadcast_sent', {
    title: title,
    actor: String(payload.actorEmail || '').toLowerCase(),
    recipient_count: recipients.length
  });

  return portalOk_('BROADCAST_SENT', 'Broadcast message sent to ' + recipients.length + ' student(s).', {
    recipient_count: recipients.length,
    title: title
  });
}

/* =====================================================================
 * FEATURE 45 — View-As-Student (Admin Preview Mode)
 * ===================================================================== */

function actionAdminGetStudentPreview_(payload) {
  requirePortalRole_(payload, ['ADMIN', 'INSTRUCTOR']);

  const data = payload.data || {};
  const targetEmail = String(data.email || '').toLowerCase().trim();
  if (!targetEmail) return portalErr_('MISSING_EMAIL', 'email is required.', null);

  // Fetch core student data by impersonating with a synthesized payload.
  const studentPayload = {
    actorEmail: targetEmail,
    actorRole: 'STUDENT',
    data: {}
  };

  const dashboard = actionGetDashboard_(studentPayload);
  const quests = actionGetMyQuests_(studentPayload);
  const notifications = actionGetNotifications_({ actorEmail: targetEmail, actorRole: 'STUDENT', data: { limit: 20 } });
  const leagueStandings = actionGetLeagueStandings_(studentPayload);

  return portalOk_('PREVIEW_OK', 'Student preview data loaded.', {
    target_email: targetEmail,
    dashboard: dashboard.data,
    quests: quests.data,
    recent_notifications: notifications.data,
    league_standings: leagueStandings.data
  });
}

function handlePortalActionRequest_(payload) {
  const startedAt = Date.now();

  try {
    ensureSchema();

    const requiredTop = ['action', 'requestId', 'actorEmail', 'actorRole', 'data', 'signature', 'ts'];
    for (let i = 0; i < requiredTop.length; i++) {
      const k = requiredTop[i];
      if (payload[k] === undefined || payload[k] === null || (k !== 'data' && String(payload[k]).trim() === '')) {
        logOps('portal_action_bad_request', {
          reason: 'MISSING_FIELD',
          missing_field: k,
          action: String(payload.action || ''),
          actor_email: String(payload.actorEmail || '').toLowerCase()
        });
        return portalErr_('MISSING_FIELD', 'Missing required field: ' + k, null);
      }
    }

    const sig = verifyPortalSignature_(payload);
    if (!sig.ok) {
      logOps('portal_action_auth_failed', {
        reason: sig.reason,
        action: String(payload.action || ''),
        actor_email: String(payload.actorEmail || '').toLowerCase(),
        request_id: String(payload.requestId || '')
      });
      return portalErr_('AUTH_FAILED', 'Signature verification failed.', { reason: sig.reason });
    }

    const action = String(payload.action || '').trim();
    const requestId = String(payload.requestId || '').trim();
    const actorEmail = String(payload.actorEmail || '').toLowerCase().trim();

    // Invite activation is the one action allowed before an existing portal user row exists.
    if (action !== 'portal.activateInvite') {
      ensureActorAuthorized_(payload);
    }

    const isIdempotent = PORTAL_IDEMPOTENT_ACTIONS.has(action);
    if (isIdempotent) {
      const existing = getRequestDedupeRecord_(requestId, action, actorEmail);
      if (existing) {
        if (existing.status === 'SUCCESS') {
          return portalOk_('IDEMPOTENT_REPLAY', 'Request already processed.', {
            request_id: requestId,
            action: action,
            replay: true,
            response_hash: existing.response_hash
          });
        }
        if (existing.status === 'IN_PROGRESS') {
          return portalErr_('REQUEST_IN_PROGRESS', 'An identical request is already being processed.', {
            request_id: requestId,
            action: action
          });
        }
        if (existing.status === 'FAILED') {
          return portalErr_('REQUEST_ALREADY_FAILED', 'This request_id already failed. Use a new request.', {
            request_id: requestId,
            action: action,
            response_hash: existing.response_hash
          });
        }
      } else {
        markRequestDedupeInProgress_(requestId, action, actorEmail);
      }
    }

    const handlerMap = {
      'portal.getHealth': actionGetHealth_,
      'portal.getDashboard': actionGetDashboard_,
      'portal.getHomeFeed': actionGetHomeFeed_,
      'portal.getSession': actionGetSession_,
      'portal.getProgress': actionGetProgress_,
      'portal.submitClaim': submitClaimFromPortal_,
      'portal.activateInvite': actionActivateInvite_,
      'portal.getCredentials': actionGetCredentials_,
      'portal.getActivities': actionGetActivities_,
      'portal.getModules': actionGetModules_,
      'portal.getPublishedCurriculum': actionGetPublishedCurriculum_,
      'portal.getMyJournalEntries': actionGetMyJournalEntries_,
      'portal.createJournalEntry': actionCreateJournalEntry_,
      'portal.getNextBestLessons': actionGetNextBestLessons_,
      'portal.getMyStrategicTranscript': actionGetMyStrategicTranscript_,
      'portal.generateStrategicTranscript': actionGenerateStrategicTranscript_,
      'portal.verifyStrategicTranscript': actionVerifyStrategicTranscript_,
      'portal.getLeaderboard': actionGetLeaderboard_,
      'portal.getAssignments': actionGetAssignments_,
      'portal.markAssignmentComplete': actionMarkAssignmentComplete_,
      'portal.getCalendar': actionGetCalendar_,
      'portal.getActiveSeason': actionGetActiveSeason_,
      'portal.getLeagueStandings': actionGetLeagueStandings_,
      'portal.getMyPod': actionGetMyPod_,
      'portal.sendPodKudos': actionSendPodKudos_,
      'portal.getActiveEvents': actionGetActiveEvents_,
      'portal.submitEventEntry': actionSubmitEventEntry_,
      'portal.getMyQuests': actionGetMyQuests_,
      'portal.claimQuestReward': actionClaimQuestReward_,
      'portal.getMyRewards': actionGetMyRewards_,
      'portal.getRaffleBalance': actionGetRaffleBalance_,
      'portal.getActiveRaffle': actionGetActiveRaffle_,
      'portal.enterRaffle': actionEnterRaffle_,
      'portal.getMyRaffleEntries': actionGetMyRaffleEntries_,
      'portal.getNotifications': actionGetNotifications_,
      'portal.getHelpFaq': actionGetHelpFaq_,
      'portal.createSupportTicket': actionCreateSupportTicket_,
      'portal.getStatus': actionGetStatus_,
      'portal.getActivityHistory': actionGetActivityHistory_,

      'portal.admin.getOverview': actionAdminOverview_,
      'portal.admin.getLaunchReadiness': actionAdminGetLaunchReadiness_,
      'portal.admin.runSmokeChecks': actionAdminRunSmokeChecks_,
      'portal.admin.getContentValidation': actionAdminGetContentValidation_,
      'portal.admin.getStudents': actionAdminStudents_,
      'portal.admin.getDraftPrograms': actionAdminGetDraftPrograms_,
      'portal.admin.createDraftProgram': actionAdminCreateDraftProgram_,
      'portal.admin.updateDraftProgram': actionAdminUpdateDraftProgram_,
      'portal.admin.getDraftModules': actionAdminGetDraftModules_,
      'portal.admin.createDraftModule': actionAdminCreateDraftModule_,
      'portal.admin.updateDraftModule': actionAdminUpdateDraftModule_,
      'portal.admin.getDraftLessons': actionAdminGetDraftLessons_,
      'portal.admin.createDraftLesson': actionAdminCreateDraftLesson_,
      'portal.admin.updateDraftLesson': actionAdminUpdateDraftLesson_,
      'portal.admin.getDraftActivities': actionAdminGetDraftActivities_,
      'portal.admin.createDraftActivity': actionAdminCreateDraftActivity_,
      'portal.admin.updateDraftActivity': actionAdminUpdateDraftActivity_,
      'portal.admin.getDraftOutcomes': actionAdminGetDraftOutcomes_,
      'portal.admin.createDraftOutcome': actionAdminCreateDraftOutcome_,
      'portal.admin.updateDraftOutcome': actionAdminUpdateDraftOutcome_,
      'portal.admin.reorderDraftEntities': actionAdminReorderDraftEntities_,
      'portal.admin.publishCurriculum': actionAdminPublishCurriculum_,
      'portal.admin.rollbackCurriculum': actionAdminRollbackCurriculum_,
      'portal.admin.getJournalReviewQueue': actionAdminGetJournalReviewQueue_,
      'portal.admin.scoreJournalEntry': actionAdminScoreJournalEntry_,
      'portal.admin.getMasteryHeatmap': actionAdminGetMasteryHeatmap_,
      'portal.admin.getDecisionTrends': actionAdminGetDecisionTrends_,
      'portal.admin.getAtRiskStudents': actionAdminGetAtRiskStudents_,
      'portal.admin.getCohortTrends': actionAdminGetCohortTrends_,
      'portal.admin.getInterventionQueue': actionAdminGetInterventionQueue_,
      'portal.admin.getInterventionTemplates': actionAdminGetInterventionTemplates_,
      'portal.admin.getNegotiationScorecards': actionAdminGetNegotiationScorecards_,
      'portal.admin.getSupportTickets': actionAdminGetSupportTickets_,
      'portal.admin.resolveSupportTicket': actionAdminResolveSupportTicket_,
      'portal.admin.createSeason': actionAdminCreateSeason_,
      'portal.admin.listSeasons': actionAdminListSeasons_,
      'portal.admin.upsertEvent': actionAdminUpsertEvent_,
      'portal.admin.listEvents': actionAdminListEvents_,
      'portal.admin.assignPods': actionAdminAssignPods_,
      'portal.admin.listPods': actionAdminListPods_,
      'portal.admin.upsertQuest': actionAdminUpsertQuest_,
      'portal.admin.listQuests': actionAdminListQuests_,
      'portal.admin.getEngagementOverview': actionAdminGetEngagementOverview_,
      'portal.admin.getEngagementDropoff': actionAdminGetEngagementDropoff_,
      'portal.admin.createInvite': actionAdminCreateInvite_,
      'portal.admin.getActionQueue': actionAdminActionQueue_,
      'portal.admin.runAction': actionAdminRunActionQueue_,
      'portal.admin.upsertAssignment': actionAdminUpsertAssignment_,
      'portal.admin.upsertCalendarEvent': actionAdminUpsertCalendarEvent_,
      'portal.admin.createRaffle': actionAdminCreateRaffle_,
      'portal.admin.closeDrawRaffle': actionAdminCloseDrawRaffle_,
      'portal.admin.getAuditLog': actionAdminAuditLog_,

      // Feature 40: Referral / Invite System
      'portal.getMyReferralLink': actionGetMyReferralLink_,
      'portal.admin.redeemReferral': actionAdminRedeemReferral_,
      'portal.admin.getReferralActivity': actionAdminGetReferralActivity_,

      // Feature 41: Student Spotlight Generator
      'portal.admin.getStudentSpotlight': actionAdminGetStudentSpotlight_,

      // Feature 42: Admin Private Notes
      'portal.admin.addStudentNote': actionAdminAddStudentNote_,
      'portal.admin.getStudentNotes': actionAdminGetStudentNotes_,
      'portal.admin.deleteStudentNote': actionAdminDeleteStudentNote_,

      // Feature 43: Scheduled Portal Announcements
      'portal.admin.upsertAnnouncement': actionAdminUpsertAnnouncement_,
      'portal.admin.listAnnouncements': actionAdminListAnnouncements_,
      'portal.admin.dismissAnnouncement': actionAdminDismissAnnouncement_,
      'portal.getActiveAnnouncements': actionGetActiveAnnouncements_,

      // Feature 44: Admin Broadcast Message
      'portal.admin.broadcastMessage': actionAdminBroadcastMessage_,

      // Feature 45: View-As-Student Preview
      'portal.admin.getStudentPreview': actionAdminGetStudentPreview_
    };

    const handler = handlerMap[action];
    if (!handler) {
      logOps('portal_action_bad_request', {
        reason: 'UNKNOWN_ACTION',
        action: action,
        actor_email: String(payload.actorEmail || '').toLowerCase()
      });
      return portalErr_('UNKNOWN_ACTION', 'Unknown action: ' + action, null);
    }

    const result = handler(payload);
    if (isIdempotent) {
      finalizeRequestDedupe_(requestId, action, actorEmail, result && result.ok ? 'SUCCESS' : 'FAILED', result);
    }

    logOps('portal_action_ok', {
      action: action,
      actor_email: String(payload.actorEmail || '').toLowerCase(),
      request_id: String(payload.requestId || ''),
      latency_ms: Date.now() - startedAt
    });

    return result;
  } catch (err) {
    const msg = String(err && err.stack || err);

    logOps('portal_action_error', {
      action: String(payload && payload.action || ''),
      actor_email: String(payload && payload.actorEmail || '').toLowerCase(),
      request_id: String(payload && payload.requestId || ''),
      error: msg,
      latency_ms: Date.now() - startedAt
    });

    const failedAction = String(payload && payload.action || '').trim();
    const failedRequestId = String(payload && payload.requestId || '').trim();
    const failedEmail = String(payload && payload.actorEmail || '').toLowerCase().trim();
    if (PORTAL_IDEMPOTENT_ACTIONS.has(failedAction) && failedRequestId) {
      finalizeRequestDedupe_(failedRequestId, failedAction, failedEmail, 'FAILED', {
        ok: false,
        code: 'PORTAL_ACTION_ERROR',
        message: msg
      });
    }

    return portalErr_('PORTAL_ACTION_ERROR', msg, null);
  }
}
