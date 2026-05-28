jest.mock('../../utils/autoIncrement', () => ({
  generateId: jest.fn().mockResolvedValue('U001'),
}));

const User = require('../userModel');

describe('userModel', () => {
  const base = {
    full_name: 'Test User',
    phone_number: '0900000000',
    email: 'test@example.com',
    role: 'admin',
    password: 'hashed-password',
  };

  test('schema requires full_name, phone_number, email, role, password', () => {
    const doc = new User({});
    const err = doc.validateSync();
    expect(err.errors.full_name).toBeDefined();
    expect(err.errors.phone_number).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.role).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  test('schema accepts valid admin user', () => {
    const doc = new User(base);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema normalizes email via setter', () => {
    const doc = new User({ ...base, email: '  Test@Example.COM  ' });
    expect(doc.email).toBe('test@example.com');
  });

  test('schema rejects invalid email', () => {
    const doc = new User({ ...base, email: 'not-an-email' });
    const err = doc.validateSync();
    expect(err.errors.email).toBeDefined();
  });

  test('schema rejects invalid role', () => {
    const doc = new User({ ...base, role: 'superuser' });
    const err = doc.validateSync();
    expect(err.errors.role).toBeDefined();
  });

  test('schema defaults firstLogin to true', () => {
    const doc = new User(base);
    expect(doc.firstLogin).toBe(true);
  });

  test('schema has expected paths', () => {
    const schema = User.schema;
    expect(schema.paths.zone_id).toBeDefined();
    expect(schema.paths.company_id).toBeDefined();
    expect(schema.paths.resetToken).toBeDefined();
    expect(schema.paths.deleted_at).toBeDefined();
  });

  test('schema accepts manager role', () => {
    const doc = new User({ ...base, role: 'manager' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts company role', () => {
    const doc = new User({ ...base, role: 'company' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      User.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save normalizes email', async () => {
    const doc = new User({ ...base, email: '  Test@Example.COM  ' });
    doc.isModified = jest.fn((field) => field === 'email');
    await runPreSaveHooks(doc);
    expect(doc.email).toBe('test@example.com');
  });

  test('pre-save generates admin user_id', async () => {
    const doc = new User({ ...base, role: 'admin' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.user_id).toBe('U001');
  });

  test('pre-save generates manager user_id', async () => {
    const doc = new User({ ...base, role: 'manager' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.user_id).toBe('U001');
  });

  test('pre-save generates company user_id', async () => {
    const doc = new User({ ...base, role: 'company' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.user_id).toBe('U001');
  });

  test('pre-save skips user_id generation when not new', async () => {
    const doc = new User({ ...base, user_id: 'U999' });
    doc.isNew = false;
    await runPreSaveHooks(doc);
    expect(doc.user_id).toBe('U999');
  });

  test('pre-save skips user_id generation when already set', async () => {
    const doc = new User({ ...base, user_id: 'U999' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.user_id).toBe('U999');
  });
});
