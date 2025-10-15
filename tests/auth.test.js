const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Authentication Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new CA user', async () => {
      const userData = {
        email: 'ca@example.com',
        password: 'Password123',
        name: 'Test CA',
        role: 'CA',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'CA',
      };

      await User.create(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password requirements', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'CA',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'CA',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'CA',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      accessToken = response.body.data.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'CA',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
