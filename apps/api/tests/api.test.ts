import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp, bootDatabase } from '../src/index.js';
import { setDb, getUploadDir, getDb } from '../src/db/index.js';
import { purgeExpiredVents } from '../src/services/expiry.js';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'yellout-test-'));
const dbPath = path.join(tmpRoot, 'test.db');
const uploadDir = path.join(tmpRoot, 'uploads');

process.env.DATABASE_PATH = dbPath;
process.env.UPLOAD_DIR = uploadDir;
process.env.RATE_LIMIT_MAX = '10000';

before(() => {
  fs.mkdirSync(uploadDir, { recursive: true });
  bootDatabase(dbPath);
});

after(() => {
  setDb(null);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('YellOut API', () => {
  const app = createApp();
  let tokenA = '';
  let tokenB = '';
  let ventId = '';

  it('creates anonymous sessions for two users', async () => {
    const a = await request(app).post('/api/v1/session').expect(201);
    const b = await request(app).post('/api/v1/session').expect(201);
    assert.ok(a.body.token);
    assert.ok(a.body.codename);
    assert.ok(b.body.token);
    assert.notEqual(a.body.token, b.body.token);
    tokenA = a.body.token;
    tokenB = b.body.token;
  });

  it('rejects unauthenticated plaza access', async () => {
    await request(app).get('/api/v1/vents').expect(401);
  });

  it('uploads a vent and lists it for another session', async () => {
    const audio = Buffer.from('fake-webm-audio-bytes');
    const res = await request(app)
      .post('/api/v1/vents')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('targetTag', '领导')
      .field('duration', '3')
      .field('voiceEffect', 'deep')
      .field('waveformData', JSON.stringify([0.2, 0.5, 0.8, 0.4]))
      .attach('audio', audio, { filename: 'vent.webm', contentType: 'audio/webm' })
      .expect(201);

    assert.equal(res.body.vent.targetTag, '领导');
    assert.ok(res.body.vent.audioUrl);
    ventId = res.body.vent.id;

    const list = await request(app)
      .get('/api/v1/vents')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].id, ventId);
    assert.equal(list.body.items[0].userReactions.hugs, false);
  });

  it('toggles reactions across sessions', async () => {
    const res = await request(app)
      .post(`/api/v1/vents/${ventId}/reactions`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ type: 'hugs' })
      .expect(200);

    assert.equal(res.body.reactions.hugs, 1);
    assert.equal(res.body.userReactions.hugs, true);

    const again = await request(app)
      .post(`/api/v1/vents/${ventId}/reactions`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ type: 'hugs' })
      .expect(200);

    assert.equal(again.body.reactions.hugs, 0);
    assert.equal(again.body.userReactions.hugs, false);
  });

  it('accepts voice replies from another session', async () => {
    const audio = Buffer.from('reply-audio');
    const res = await request(app)
      .post(`/api/v1/vents/${ventId}/replies`)
      .set('Authorization', `Bearer ${tokenB}`)
      .field('duration', '4')
      .field('voiceEffect', 'deep')
      .attach('audio', audio, { filename: 'reply.webm', contentType: 'audio/webm' })
      .expect(201);

    assert.ok(res.body.id);
    assert.equal(res.body.duration, 4);

    const detail = await request(app)
      .get(`/api/v1/vents/${ventId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    assert.equal(detail.body.voiceReplies.length, 1);
  });

  it('accepts abuse reports', async () => {
    const res = await request(app)
      .post(`/api/v1/vents/${ventId}/report`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ reason: 'spam', detail: 'test' })
      .expect(201);
    assert.equal(res.body.status, 'received');
  });

  it('health endpoint reports moderation stub', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).get('/api/v1/health').expect(200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.moderation, 'stub');
  });

  it('purges expired vents and deletes audio files', async () => {
    const session = await request(app).post('/api/v1/session').expect(201);
    const created = await request(app)
      .post('/api/v1/vents')
      .set('Authorization', `Bearer ${session.body.token}`)
      .field('targetTag', '生活')
      .field('duration', '2')
      .field('voiceEffect', 'ethereal')
      .field('waveformData', JSON.stringify([0.4, 0.6]))
      .attach('audio', Buffer.from('expire-me'), {
        filename: 'e.webm',
        contentType: 'audio/webm',
      })
      .expect(201);

    const id = created.body.vent.id as string;
    const row = getDb()
      .prepare(`SELECT audio_path FROM vents WHERE id = ?`)
      .get(id) as { audio_path: string };
    const full = path.join(getUploadDir(), row.audio_path);
    assert.equal(fs.existsSync(full), true);

    getDb().prepare(`UPDATE vents SET expires_at = ? WHERE id = ?`).run(Date.now() - 10, id);
    const n = purgeExpiredVents();
    assert.ok(n >= 1);
    assert.equal(fs.existsSync(full), false);
  });
});
