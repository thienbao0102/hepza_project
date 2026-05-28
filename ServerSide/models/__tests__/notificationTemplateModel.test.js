jest.mock('../../utils/autoIncrement', () => ({
  generateId: jest.fn().mockResolvedValue('NT001'),
}));

const NotificationTemplate = require('../notificationTemplateModel');

describe('notificationTemplateModel', () => {
  const base = {
    name: 'Test Template',
    title: 'Test Title',
    body: 'Test Body',
    type: 'Info',
    creator_role: 'admin',
    target: {
      mode: 'STATIC',
      roles: ['admin'],
    },
    schedule: {
      type: 'MANUAL',
    },
  };

  test('schema requires name, title, body, type, creator_role', () => {
    const doc = new NotificationTemplate({});
    const err = doc.validateSync();
    expect(err.errors['name']).toBeDefined();
    expect(err.errors['title']).toBeDefined();
    expect(err.errors['body']).toBeDefined();
    expect(err.errors['creator_role']).toBeDefined();
  });

  test('schema accepts valid template', () => {
    const doc = new NotificationTemplate(base);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema defaults type to Info', () => {
    const doc = new NotificationTemplate({ ...base, type: undefined });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.type).toBe('Info');
  });

  test('schema rejects invalid type', () => {
    const doc = new NotificationTemplate({ ...base, type: 'Invalid' });
    const err = doc.validateSync();
    expect(err.errors['type']).toBeDefined();
  });

  test('schema defaults target mode to STATIC', () => {
    const doc = new NotificationTemplate({
      ...base,
      target: { mode: undefined, roles: ['admin'] },
    });
    expect(doc.target.mode).toBe('STATIC');
  });

  test('schema requires dynamicRule for DYNAMIC mode', () => {
    const doc = new NotificationTemplate({
      ...base,
      target: { mode: 'DYNAMIC', roles: ['admin'] },
    });
    const err = doc.validateSync();
    expect(err.errors['target.dynamicRule']).toBeDefined();
  });

  test('schema accepts DYNAMIC mode with dynamicRule', () => {
    const doc = new NotificationTemplate({
      ...base,
      target: { mode: 'DYNAMIC', dynamicRule: 'MISSING_REPORT', roles: ['admin'] },
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts HYBRID mode with dynamicRule', () => {
    const doc = new NotificationTemplate({
      ...base,
      target: { mode: 'HYBRID', dynamicRule: 'MISSING_REPORT', roles: ['admin'] },
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid schedule type', () => {
    const doc = new NotificationTemplate({
      ...base,
      schedule: { type: 'INVALID' },
    });
    const err = doc.validateSync();
    expect(err.errors['schedule.type']).toBeDefined();
  });

  test('schema accepts IMMEDIATE schedule', () => {
    const doc = new NotificationTemplate({
      ...base,
      schedule: { type: 'IMMEDIATE' },
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema defaults isActive to true', () => {
    const doc = new NotificationTemplate(base);
    expect(doc.isActive).toBe(true);
  });

  test('schema defaults attachment size to 0', () => {
    const doc = new NotificationTemplate({
      ...base,
      attachments: [{ url: 'https://example.com/file.pdf' }],
    });
    expect(doc.attachments[0].size).toBe(0);
  });

  test('schema has expected paths', () => {
    const schema = NotificationTemplate.schema;
    expect(schema.paths.notification_T_id).toBeDefined();
    expect(schema.paths.repeatJobKey).toBeDefined();
    expect(schema.paths.created_at).toBeDefined();
  });

  test('schema accepts RECURRING schedule with cronString', () => {
    const doc = new NotificationTemplate({
      ...base,
      schedule: { type: 'RECURRING', cronString: '0 9 * * *' },
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts ONE_TIME schedule with sendAt', () => {
    const doc = new NotificationTemplate({
      ...base,
      schedule: { type: 'ONE_TIME', sendAt: new Date() },
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      NotificationTemplate.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save generates notification_T_id for new doc', async () => {
    const doc = new NotificationTemplate(base);
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.notification_T_id).toBe('NT001');
  });

  test('pre-save skips notification_T_id generation when already set', async () => {
    const doc = new NotificationTemplate({ ...base, notification_T_id: 'NT999' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.notification_T_id).toBe('NT999');
  });
});
