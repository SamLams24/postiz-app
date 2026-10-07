/*
 * Regression tests for the OAuth connection fixes in this PR:
 *
 * 1. LinkedIn: `generateAuthUrl()` must never send `prompt=none`, since that
 *    tells LinkedIn to skip the consent screen and fail silently unless the
 *    user already granted consent - which can never be true on a brand-new
 *    self-hosted install's first connection attempt.
 *    (gitroomhq/postiz-app issues #1580, #1582)
 *
 * 2. Facebook / Instagram (Facebook-Page-backed): `generateAuthUrl()` must
 *    send `config_id=` instead of `scope=` when FACEBOOK_LOGIN_CONFIG_ID is
 *    set (required by Meta's "Facebook Login for Business" product, used by
 *    every Business-type Meta app, which is the default app type Meta
 *    creates today), and must fall back to the classic `scope=` parameter
 *    unchanged when that env var is not set, so older/non-Business apps
 *    keep working exactly as before.
 *    (gitroomhq/postiz-app discussion #943)
 */
import { LinkedinProvider } from './linkedin.provider';
import { FacebookProvider } from './facebook.provider';
import { InstagramProvider } from './instagram.provider';

const ENV_KEYS = [
  'LINKEDIN_CLIENT_ID',
  'FRONTEND_URL',
  'FACEBOOK_APP_ID',
  'FACEBOOK_LOGIN_CONFIG_ID',
] as const;

describe('OAuth authorization URL fixes', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.FRONTEND_URL = 'https://postiz.example.com';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe('LinkedinProvider#generateAuthUrl', () => {
    it('does not include prompt=none', async () => {
      process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';

      const provider = new LinkedinProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).not.toContain('prompt=none');
      expect(url).not.toContain('prompt=');
    });

    it('still includes the client_id and redirect_uri', async () => {
      process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';

      const provider = new LinkedinProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).toContain('client_id=test-linkedin-client-id');
      expect(url).toContain(
        encodeURIComponent(
          'https://postiz.example.com/integrations/social/linkedin'
        )
      );
      expect(url.startsWith('https://www.linkedin.com/oauth/v2/authorization?')).toBe(
        true
      );
    });
  });

  describe('FacebookProvider#generateAuthUrl', () => {
    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
    });

    it('uses config_id instead of scope when FACEBOOK_LOGIN_CONFIG_ID is set', async () => {
      process.env.FACEBOOK_LOGIN_CONFIG_ID = 'test-login-config-id';

      const provider = new FacebookProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).toContain('config_id=test-login-config-id');
      expect(url).not.toContain('scope=');
    });

    it('falls back to scope= when FACEBOOK_LOGIN_CONFIG_ID is not set', async () => {
      delete process.env.FACEBOOK_LOGIN_CONFIG_ID;

      const provider = new FacebookProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).not.toContain('config_id=');
      expect(url).toContain('scope=pages_show_list');
    });
  });

  describe('InstagramProvider#generateAuthUrl (Facebook-Page-backed)', () => {
    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
    });

    it('uses config_id instead of scope when FACEBOOK_LOGIN_CONFIG_ID is set', async () => {
      process.env.FACEBOOK_LOGIN_CONFIG_ID = 'test-login-config-id';

      const provider = new InstagramProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).toContain('config_id=test-login-config-id');
      expect(url).not.toContain('scope=');
    });

    it('falls back to scope= when FACEBOOK_LOGIN_CONFIG_ID is not set', async () => {
      delete process.env.FACEBOOK_LOGIN_CONFIG_ID;

      const provider = new InstagramProvider();
      const { url } = await provider.generateAuthUrl();

      expect(url).not.toContain('config_id=');
      expect(url).toContain('scope=instagram_basic');
    });
  });
});
