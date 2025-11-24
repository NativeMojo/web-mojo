/**
 * Auto-generated template module
 * Generated: 2025-11-23T03:35:23.087Z
 * Contains all framework templates compiled as JavaScript strings
 */

// Template registry
const templates = {};

// Template: extensions/auth/pages/ForgotPasswordPage.mst
templates['extensions/auth/pages/ForgotPasswordPage.mst'] = `<!--
  Deprecated Template: ForgotPasswordPage.mst

  This legacy template has been removed in favor of the Simple Auth (KISS) module.

  Do not use this template. It remains only to make deprecation explicit if loaded accidentally.

  Replacement:
    - Use \`mountAuth(container, { baseURL, onSuccessRedirect, ... })\` from \`web-mojo/auth\`
    - Or use \`createAuthClient({ baseURL })\` if you provide your own HTML.

  Example:
    <div id="auth-root"></div>
    <script type="module">
      import { mountAuth } from 'web-mojo/auth';
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || '/';
      const apiBase = params.get('apiBase') || '/api';
      mountAuth(document.getElementById('auth-root'), {
        baseURL: apiBase,
        onSuccessRedirect: redirect,
        branding: { title: 'My App', subtitle: 'Sign in to your account' },
        theme: 'light'
      });
    </script>
-->

<div style="max-width: 720px; margin: 3rem auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <div style="padding: 1rem; border: 1px solid #f0ad4e; background: #fcf8e3; color: #8a6d3b; border-radius: 6px;">
    <strong>Deprecated:</strong> ForgotPasswordPage.mst is no longer supported.
    <div style="margin-top: .5rem;">
      Please use <code>mountAuth</code> from <code>web-mojo/auth</code> to render the authentication UI.
    </div>
  </div>
</div>
`;

// Template: extensions/auth/pages/LoginPage.mst
templates['extensions/auth/pages/LoginPage.mst'] = `<!--
  Deprecated Template: LoginPage.mst

  This legacy template has been removed in favor of the Simple Auth (KISS) module.
  Do not use this template. It remains only to make deprecation explicit if loaded accidentally.

  Replacement:
    - Use \`mountAuth(container, { baseURL, onSuccessRedirect, ... })\` from \`web-mojo/auth\`
    - Or use \`createAuthClient({ baseURL })\` if you provide your own HTML.

  Example:
    <div id="auth-root"></div>
    <script type="module">
      import { mountAuth } from 'web-mojo/auth';
      mountAuth(document.getElementById('auth-root'), {
        baseURL: '/api',
        onSuccessRedirect: '/',
        branding: { title: 'My App', subtitle: 'Sign in to your account' },
        theme: 'light'
      });
    </script>
-->

<div style="max-width: 720px; margin: 3rem auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <div style="padding: 1rem; border: 1px solid #f0ad4e; background: #fcf8e3; color: #8a6d3b; border-radius: 6px;">
    <strong>Deprecated:</strong> LoginPage.mst is no longer supported.
    <div style="margin-top: .5rem;">
      Please use <code>mountAuth</code> from <code>web-mojo/auth</code> to render the auth UI.
    </div>
  </div>
</div>
`;

// Template: extensions/auth/pages/RegisterPage.mst
templates['extensions/auth/pages/RegisterPage.mst'] = `<!--
  Deprecated Template: RegisterPage.mst

  This legacy template has been removed in favor of the Simple Auth (KISS) module.

  Do not use this template. It remains only to make deprecation explicit if loaded accidentally.

  Replacement:
    - Use \`mountAuth(container, { baseURL, onSuccessRedirect, ... })\` from \`web-mojo/auth\`
    - Or use \`createAuthClient({ baseURL })\` if you provide your own HTML.

  Example:
    <div id="auth-root"></div>
    <script type="module">
      import { mountAuth } from 'web-mojo/auth';
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || '/';
      const apiBase = params.get('apiBase') || '/api';
      mountAuth(document.getElementById('auth-root'), {
        baseURL: apiBase,
        onSuccessRedirect: redirect,
        branding: { title: 'My App', subtitle: 'Sign in to your account' },
        theme: 'light'
      });
    </script>
-->

<div style="max-width: 720px; margin: 3rem auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <div style="padding: 1rem; border: 1px solid #f0ad4e; background: #fcf8e3; color: #8a6d3b; border-radius: 6px;">
    <strong>Deprecated:</strong> RegisterPage.mst is no longer supported.
    <div style="margin-top: .5rem;">
      Please use <code>mountAuth</code> from <code>web-mojo/auth</code> to render the authentication UI.
    </div>
  </div>
</div>
`;

// Template: extensions/auth/pages/ResetPasswordPage.mst
templates['extensions/auth/pages/ResetPasswordPage.mst'] = `<!--
  Deprecated Template: ResetPasswordPage.mst

  This legacy template has been removed in favor of the Simple Auth (KISS) module.

  Do not use this template. It remains only to make deprecation explicit if loaded accidentally.

  Replacement:
    - Use \`mountAuth(container, { baseURL, onSuccessRedirect, ... })\` from \`web-mojo/auth\`
    - Or use \`createAuthClient({ baseURL })\` if you provide your own HTML.

  Example:
    <div id="auth-root"></div>
    <script type="module">
      import { mountAuth } from 'web-mojo/auth';
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || '/';
      const apiBase = params.get('apiBase') || '/api';
      mountAuth(document.getElementById('auth-root'), {
        baseURL: apiBase,
        onSuccessRedirect: redirect,
        branding: { title: 'My App', subtitle: 'Sign in to your account' },
        theme: 'light'
      });
    </script>
-->

<div style="max-width: 720px; margin: 3rem auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
  <div style="padding: 1rem; border: 1px solid #f0ad4e; background: #fcf8e3; color: #8a6d3b; border-radius: 6px;">
    <strong>Deprecated:</strong> ResetPasswordPage.mst is no longer supported.
    <div style="margin-top: .5rem;">
      Please use <code>mountAuth</code> from <code>web-mojo/auth</code> to render the authentication UI.
    </div>
  </div>
</div>
`;

// Export templates
export default templates;

// Convenience exports for common templates
export const extensions_auth_pages_ForgotPasswordPage_mst = templates['extensions/auth/pages/ForgotPasswordPage.mst'];
export const extensions_auth_pages_LoginPage_mst = templates['extensions/auth/pages/LoginPage.mst'];
export const extensions_auth_pages_RegisterPage_mst = templates['extensions/auth/pages/RegisterPage.mst'];
export const extensions_auth_pages_ResetPasswordPage_mst = templates['extensions/auth/pages/ResetPasswordPage.mst'];

// Helper functions

/**
 * Get a template by key
 * @param {string} key - Template key (e.g., "auth/pages/LoginPage.mst")
 * @returns {string|undefined} Template content or undefined if not found
 */
export function getTemplate(key) {
  // Handle different path formats
  const normalizedKey = key
    .replace(/^\//, "")  // Remove leading slash
    .replace(/^src\//, "")  // Remove src/ prefix
    .replace(/\\/g, "/");  // Normalize path separators
  
  return templates[normalizedKey] || templates[key];
}

/**
 * Check if a template exists
 * @param {string} key - Template key
 * @returns {boolean} True if template exists
 */
export function hasTemplate(key) {
  return getTemplate(key) !== undefined;
}

/**
 * Get all template keys
 * @returns {string[]} Array of template keys
 */
export function getTemplateKeys() {
  return Object.keys(templates);
}

/**
 * Get template count
 * @returns {number} Number of templates
 */
export function getTemplateCount() {
  return Object.keys(templates).length;
}