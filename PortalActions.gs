/*******************************************************
 * BOW Sports Capital — Portal Actions API
 * Secure server-to-server action router for Next.js portal
 *******************************************************/

const PORTAL_SHARED_SECRET_PROPERTY = 'PORTAL_SHARED_SECRET';
const PORTAL_SIGNATURE_WINDOW_MS = 10 * 60 * 1000;
const TICKETS_PER_XP = 100;

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
    return portalOk_('JOURNAL_UPDATED', 'Journal entry updated.', { entry_id: existing.entry_id, claim_code: claimCode });
  }

  const lessons = listSheetObjects_('Lessons_Published', false);
  const lessonRow = lessons.find(function(row) { return String(row.lesson_key || '') === lessonKey; }) || {};

  appendObjectRow('Decision_Journal', {
    entry_id: generateId_('JRN'),
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

  addNotification_(email, 'Journal entry submitted', 'Your decision journal entry for ' + claimCode + ' is awaiting instructor review.', 'JOURNAL');
  return portalOk_('JOURNAL_CREATED', 'Journal entry submitted.', { claim_code: claimCode });
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

function submitClaimFromPortal_(payload) {
  const actorEmail = assertActorEmail_(payload);
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
  const ticketBalance = getRaffleBalanceByEmail_(email);
  const perTrack = aggregateTrackXP_(email);

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

    // Invite activation is the one action allowed before an existing portal user row exists.
    if (action !== 'portal.activateInvite') {
      ensureActorAuthorized_(payload);
    }

    const handlerMap = {
      'portal.getDashboard': actionGetDashboard_,
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
      'portal.admin.getInterventionTemplates': actionAdminGetInterventionTemplates_,
      'portal.admin.getNegotiationScorecards': actionAdminGetNegotiationScorecards_,
      'portal.admin.getSupportTickets': actionAdminGetSupportTickets_,
      'portal.admin.resolveSupportTicket': actionAdminResolveSupportTicket_,
      'portal.admin.createInvite': actionAdminCreateInvite_,
      'portal.admin.getActionQueue': actionAdminActionQueue_,
      'portal.admin.runAction': actionAdminRunActionQueue_,
      'portal.admin.upsertAssignment': actionAdminUpsertAssignment_,
      'portal.admin.upsertCalendarEvent': actionAdminUpsertCalendarEvent_,
      'portal.admin.createRaffle': actionAdminCreateRaffle_,
      'portal.admin.closeDrawRaffle': actionAdminCloseDrawRaffle_,
      'portal.admin.getAuditLog': actionAdminAuditLog_
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

    return portalErr_('PORTAL_ACTION_ERROR', msg, null);
  }
}
