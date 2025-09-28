/**
 * Auto-generated template module
 * Generated: 2025-09-28T04:09:09.754Z
 * Contains all framework templates compiled as JavaScript strings
 */

// Template registry
const templates = {};

// Template: extensions/auth/pages/ForgotPasswordPage.mst
templates['extensions/auth/pages/ForgotPasswordPage.mst'] = `<div class="auth-page forgot-password-page min-vh-100 d-flex align-items-center py-4">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-sm-8 col-md-8 col-lg-6 col-xl-5">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <!-- Header -->
                        <div class="text-center mb-4">
                            {{#logoUrl}}<img src="{{logoUrl}}" alt="{{title}}" class="mb-3" style="max-height: 60px;">{{/logoUrl}}
                            <h2 class="h3 mb-2">{{messages.forgotTitle}}</h2>
                            <p class="text-muted">{{messages.forgotSubtitle}}</p>
                        </div>

                        <!-- Error Alert -->
                        {{#error}}
                        <div class="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{{error}}</div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                        {{/error}}

                        <!-- Step 1: Email Form -->
                        {{#isStepEmail}}
                        <form id="form-request-reset" novalidate>
                            <div class="mb-3">
                                <label for="forgotEmail" class="form-label"><i class="bi bi-envelope me-1"></i>Email Address</label>
                                <input type="email" class="form-control form-control-lg" id="forgotEmail" name="email" placeholder="Enter your registered email" required autofocus>
                                <div class="form-text">We'll send you instructions to reset your password.</div>
                            </div>
                            <button type="button" class="btn btn-primary btn-lg w-100 mb-3" data-action="requestReset" {{#isLoading}}disabled{{/isLoading}}>
                                {{#isLoading}}<span class="spinner-border spinner-border-sm me-2"></span>Sending...{{/isLoading}}
                                {{^isLoading}}<i class="bi bi-send me-2"></i>Send Instructions{{/isLoading}}
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-lg w-100" data-action="backToLogin" {{#isLoading}}disabled{{/isLoading}}>
                                <i class="bi bi-arrow-left me-2"></i>Back to Login
                            </button>
                        </form>
                        <div class="text-center mt-4">
                            <p class="text-muted">Remember your password? <a href="#" class="text-decoration-none fw-semibold" data-action="backToLogin">Sign in</a></p>
                        </div>
                        {{/isStepEmail}}

                        <!-- Step 2 (Link Method): Confirmation -->
                        {{#isStepLinkSent}}
                        <div class="text-center">
                            <div class="mb-4"><i class="bi bi-envelope-check text-success" style="font-size: 4rem;"></i></div>
                            <h3 class="h4 mb-3">Check your email</h3>
                            <p class="text-muted">If an account exists for <strong>{{data.email}}</strong>, we have sent instructions for resetting your password.</p>
                            <div class="d-grid gap-2 mt-4">
                                <button type="button" class="btn btn-primary btn-lg" data-action="backToLogin"><i class="bi bi-arrow-left me-2"></i>Back to Login</button>
                            </div>
                        </div>
                        {{/isStepLinkSent}}

                        <!-- Step 2 (Code Method): Code Entry Form -->
                        {{#isStepCode}}
                        <p class="text-muted text-center mb-3">A verification code has been sent to <strong>{{data.email}}</strong>. Please enter it below.</p>
                        <form id="form-reset-with-code" novalidate>
                            <div class="mb-3">
                                <label for="resetCode" class="form-label"><i class="bi bi-shield-lock me-1"></i>Verification Code</label>
                                <input type="text" class="form-control form-control-lg" id="resetCode" name="code" placeholder="Enter code" required>
                            </div>
                            <div class="mb-3">
                                <label for="resetPassword" class="form-label"><i class="bi bi-lock me-1"></i>New Password</label>
                                <input type="password" class="form-control form-control-lg" id="resetPassword" name="new_password" placeholder="Enter new password" required autocomplete="new-password">
                            </div>
                            <div class="mb-3">
                                <label for="confirmPassword" class="form-label"><i class="bi bi-lock-fill me-1"></i>Confirm New Password</label>
                                <input type="password" class="form-control form-control-lg" id="confirmPassword" name="confirm_password" placeholder="Confirm new password" required autocomplete="new-password">
                            </div>
                            <button type="button" class="btn btn-primary btn-lg w-100" data-action="resetWithCode" {{#isLoading}}disabled{{/isLoading}}>
                                {{#isLoading}}<span class="spinner-border spinner-border-sm me-2"></span>Resetting...{{/isLoading}}
                                {{^isLoading}}<i class="bi bi-key me-2"></i>Reset Password{{/isLoading}}
                            </button>
                        </form>
                        {{/isStepCode}}

                        <!-- Step 3 (Code Method): Success -->
                        {{#isStepSuccess}}
                        <div class="text-center">
                            <div class="mb-4"><i class="bi bi-check-circle text-success" style="font-size: 4rem;"></i></div>
                            <h3 class="h4 mb-3">Password Reset!</h3>
                            <p class="text-muted">Your password has been changed successfully. You will be redirected to the login page shortly.</p>
                        </div>
                        {{/isStepSuccess}}

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Template: extensions/auth/pages/LoginPage.mst
templates['extensions/auth/pages/LoginPage.mst'] = `<div class="auth-page min-vh-100 d-flex align-items-center py-4">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-sm-10 col-md-8 col-lg-6 col-xl-5">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <!-- Logo and Header -->
                        <div class="text-center mb-4">
                            {{#data.logoUrl}}
                            <img src="{{data.logoUrl}}" alt="{{data.title}}" class="mb-3" style="max-height: 60px;">
                            {{/data.logoUrl}}
                            {{#data.messages.loginTitle}}
                            <h2 class="h3 mb-2">{{#data.loginIcon}}<i class="{{data.loginIcon}}"></i> {{/data.loginIcon}}{{data.messages.loginTitle}}</h2>
                            {{/data.messages.loginTitle}}
                            {{/data.messages.loginSubtitle}}
                            <p class="text-muted">{{data.messages.loginSubtitle}}</p>
                            {{/data.messages.loginSubtitle}}
                        </div>

                        <!-- Error Alert -->
                        {{#data.error}}
                        <div class="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{{data.error}}</div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                        {{/data.error}}

                        <!-- Login Form -->
                        <form novalidate>
                            <!-- Username/Email Field -->
                            <div class="mb-3">
                                <label for="loginUsername" class="form-label">
                                    <i class="bi bi-person me-1"></i>Username or Email
                                </label>
                                <input
                                    type="text"
                                    class="form-control form-control-lg"
                                    id="loginUsername"
                                    placeholder="Enter your username or email"
                                    value="{{username}}"
                                    data-field="username"
                                    data-action-keydown="handleKeyPress"
                                    autocomplete="username"
                                    required
                                    autofocus
                                    {{#isLoading}}disabled{{/isLoading}}>
                            </div>

                            <!-- Password Field -->
                            <div class="mb-3">
                                <label for="loginPassword" class="form-label">
                                    <i class="bi bi-lock me-1"></i>Password
                                </label>
                                <div class="input-group">
                                    <input
                                        type="{{#showPassword}}text{{/showPassword}}{{^showPassword}}password{{/showPassword}}"
                                        class="form-control form-control-lg"
                                        id="loginPassword"
                                        placeholder="Enter your password"
                                        value="{{password}}"
                                        data-field="password"
                                        data-action-keydown="handleKeyPress"
                                        autocomplete="current-password"
                                        required
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <button
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        data-action="togglePassword"
                                        {{#isLoading}}disabled{{/isLoading}}>
                                        <i class="bi bi-eye{{#data.showPassword}}-slash{{/data.showPassword}}"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Remember Me & Forgot Password -->
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                {{#data.rememberMe}}
                                <div class="form-check">
                                    <input
                                        class="form-check-input"
                                        type="checkbox"
                                        id="rememberMe"
                                        data-field="rememberMe"
                                        data-change-action="updateField"
                                        autocomplete="off"
                                        {{#rememberMe}}checked{{/rememberMe}}
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <label class="form-check-label" for="rememberMe">
                                        Remember me
                                    </label>
                                </div>
                                {{/data.rememberMe}}
                                {{^data.rememberMe}}<div></div>{{/data.rememberMe}}

                                {{#data.forgotPassword}}
                                <a href="?page=forgot-password" class="text-decoration-none" data-action="forgotPassword">
                                    Forgot password?
                                </a>
                                {{/data.forgotPassword}}
                            </div>

                            <!-- Login Button -->
                            <button
                                type="button"
                                class="btn btn-primary btn-lg w-100 mb-3"
                                data-action="login"
                                {{#data.isLoading}}disabled{{/data.isLoading}}>
                                {{#data.isLoading}}
                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Signing in...
                                {{/data.isLoading}}
                                {{^data.isLoading}}
                                <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
                                {{/data.isLoading}}
                            </button>

                            <!-- Alternative Login Methods -->
                            {{#data.passkeySupported}}
                            <div class="position-relative my-3">
                                <hr class="text-muted">
                                <span class="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                                    OR
                                </span>
                            </div>

                            <button
                                type="button"
                                class="btn btn-outline-primary btn-lg w-100 mb-2"
                                data-action="loginWithPasskey"
                                {{#data.isLoading}}disabled{{/data.isLoading}}>
                                <i class="bi bi-fingerprint me-2"></i>Sign in with Passkey
                            </button>
                            {{/data.passkeySupported}}
                        </form>

                        <!-- Register Link -->
                        {{#data.registration}}
                        <div class="text-center mt-4">
                            <p class="mb-0">
                                Don't have an account?
                                <a href="#" class="text-decoration-none fw-semibold" data-action="register">
                                    Sign up
                                </a>
                            </p>
                        </div>
                        {{/data.registration}}
                    </div>
                </div>

                <!-- Security Notice -->
                <!-- TOS and Privacy Links -->
                <div class="text-center mt-3 auth-footer-links">
                    {{#data.termsUrl}}
                        <small><a href="{{data.termsUrl}}" target="_blank" rel="noopener noreferrer">Terms of Service</a></small>
                    {{/data.termsUrl}}
                    {{#data.termsUrl}}{{#data.privacyUrl}}
                        <small class="mx-1 text-muted">&middot;</small>
                    {{/data.privacyUrl}}{{/data.termsUrl}}
                    {{#data.privacyUrl}}
                        <small><a href="{{data.privacyUrl}}" target="_blank" rel="noopener noreferrer">Privacy Policy</a></small>
                    {{/data.privacyUrl}}
                    <div class="text-muted text-center mt-3">
                        <small>version {{data.version}}</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Template: extensions/auth/pages/RegisterPage.mst
templates['extensions/auth/pages/RegisterPage.mst'] = `<div class="auth-page register-page min-vh-100 d-flex align-items-center py-4">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-sm-10 col-md-8 col-lg-6 col-xl-5">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <!-- Logo and Header -->
                        <div class="text-center mb-4">
                            {{#logoUrl}}
                            <img src="{{logoUrl}}" alt="{{title}}" class="mb-3" style="max-height: 60px;">
                            {{/logoUrl}}
                            <h2 class="h3 mb-2">{{messages.registerTitle}}</h2>
                            <p class="text-muted">{{messages.registerSubtitle}}</p>
                        </div>

                        <!-- Error Alert -->
                        {{#error}}
                        <div class="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{{error}}</div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                        {{/error}}

                        <!-- Registration Form -->
                        <form data-action="register" novalidate>
                            <!-- Name Field -->
                            <div class="mb-3">
                                <label for="registerName" class="form-label">
                                    <i class="bi bi-person me-1"></i>Full Name
                                </label>
                                <input
                                    type="text"
                                    class="form-control form-control-lg"
                                    id="registerName"
                                    placeholder="Enter your full name"
                                    value="{{name}}"
                                    data-field="name"
                                    data-change-action="updateField"
                                    data-filter="live-search"
                                    data-action-keydown="handleKeyPress"
                                    autocomplete="name"
                                    required
                                    autofocus
                                    {{#isLoading}}disabled{{/isLoading}}>
                            </div>

                            <!-- Email Field -->
                            <div class="mb-3">
                                <label for="registerEmail" class="form-label">
                                    <i class="bi bi-envelope me-1"></i>Email Address
                                </label>
                                <input
                                    type="email"
                                    class="form-control form-control-lg"
                                    id="registerEmail"
                                    placeholder="name@example.com"
                                    value="{{email}}"
                                    data-field="email"
                                    data-change-action="updateField"
                                    data-filter="live-search"
                                    data-action-keydown="handleKeyPress"
                                    autocomplete="email"
                                    required
                                    {{#isLoading}}disabled{{/isLoading}}>
                            </div>

                            <!-- Password Field -->
                            <div class="mb-3">
                                <label for="registerPassword" class="form-label">
                                    <i class="bi bi-lock me-1"></i>Password
                                </label>
                                <div class="input-group">
                                    <input
                                        type="{{#showPassword}}text{{/showPassword}}{{^showPassword}}password{{/showPassword}}"
                                        class="form-control form-control-lg"
                                        id="registerPassword"
                                        placeholder="Create a strong password"
                                        value="{{password}}"
                                        data-field="password"
                                        data-change-action="updateField"
                                        data-filter="live-search"
                                        data-action-keydown="handleKeyPress"
                                        autocomplete="new-password"
                                        required
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <button
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        data-password-field="password"
                                        data-action="togglePassword"
                                        {{#isLoading}}disabled{{/isLoading}}>
                                        <i class="bi bi-eye{{#showPassword}}-slash{{/showPassword}}"></i>
                                    </button>
                                </div>

                                <!-- Password Strength Indicator -->
                                {{#passwordStrength}}
                                <div class="mt-2">
                                    <div class="progress" style="height: 4px;">
                                        <div class="progress-bar
                                            {{#passwordStrength.weak}}bg-danger{{/passwordStrength.weak}}
                                            {{#passwordStrength.fair}}bg-warning{{/passwordStrength.fair}}
                                            {{#passwordStrength.good}}bg-info{{/passwordStrength.good}}
                                            {{#passwordStrength.strong}}bg-success{{/passwordStrength.strong}}"
                                        role="progressbar"
                                        style="width:
                                            {{#passwordStrength.weak}}25%{{/passwordStrength.weak}}
                                            {{#passwordStrength.fair}}50%{{/passwordStrength.fair}}
                                            {{#passwordStrength.good}}75%{{/passwordStrength.good}}
                                            {{#passwordStrength.strong}}100%{{/passwordStrength.strong}}">
                                        </div>
                                    </div>
                                    <small class="text-muted mt-1">
                                        Password strength: {{passwordStrength}}
                                    </small>
                                </div>
                                {{/passwordStrength}}
                            </div>

                            <!-- Confirm Password Field -->
                            <div class="mb-3">
                                <label for="registerConfirmPassword" class="form-label">
                                    <i class="bi bi-lock-fill me-1"></i>Confirm Password
                                </label>
                                <div class="input-group">
                                    <input
                                        type="{{#showConfirmPassword}}text{{/showConfirmPassword}}{{^showConfirmPassword}}password{{/showConfirmPassword}}"
                                        class="form-control form-control-lg {{^passwordMatch}}is-invalid{{/passwordMatch}}"
                                        id="registerConfirmPassword"
                                        placeholder="Re-enter your password"
                                        value="{{confirmPassword}}"
                                        data-field="confirmPassword"
                                        data-change-action="updateField"
                                        data-filter="live-search"
                                        data-action-keydown="handleKeyPress"
                                        autocomplete="new-password"
                                        required
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <button
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        data-password-field="confirmPassword"
                                        data-action="togglePassword"
                                        {{#isLoading}}disabled{{/isLoading}}>
                                        <i class="bi bi-eye{{#showConfirmPassword}}-slash{{/showConfirmPassword}}"></i>
                                    </button>
                                </div>
                                {{^passwordMatch}}
                                <div class="invalid-feedback">
                                    Passwords do not match
                                </div>
                                {{/passwordMatch}}
                            </div>

                            <!-- Register Button -->
                            <button
                                type="submit"
                                class="btn btn-primary btn-lg w-100 mb-3"
                                {{#isLoading}}disabled{{/isLoading}}>
                                {{#isLoading}}
                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating account...
                                {{/isLoading}}
                                {{^isLoading}}
                                <i class="bi bi-person-plus me-2"></i>Create Account
                                {{/isLoading}}
                            </button>
                        </form>

                        <!-- Login Link -->
                        <div class="text-center mt-4">
                            <p class="mb-0">
                                Already have an account?
                                <a href="#" class="text-decoration-none fw-semibold" data-action="login">
                                    Sign in
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Security Notice -->
                <div class="text-center mt-3">
                    <small class="text-muted">
                        <i class="bi bi-shield-check me-1"></i>Your information is secure and encrypted
                    </small>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Template: extensions/auth/pages/ResetPasswordPage.mst
templates['extensions/auth/pages/ResetPasswordPage.mst'] = `<div class="auth-page reset-password-page min-vh-100 d-flex align-items-center py-4">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-sm-10 col-md-8 col-lg-6 col-xl-5">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <!-- Logo and Header -->
                        <div class="text-center mb-4">
                            {{#logoUrl}}
                            <img src="{{logoUrl}}" alt="{{title}}" class="mb-3" style="max-height: 60px;">
                            {{/logoUrl}}
                            <h2 class="h3 mb-2">{{messages.resetTitle}}</h2>
                            <p class="text-muted">{{messages.resetSubtitle}}</p>
                        </div>

                        <!-- Error Alert -->
                        {{#error}}
                        <div class="alert alert-danger d-flex align-items-center alert-dismissible fade show" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>{{error}}</div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                        {{/error}}

                        <!-- Success State -->
                        {{#success}}
                        <div class="alert alert-success d-flex align-items-center" role="alert">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <div>
                                <strong>Password Reset Complete!</strong><br>
                                {{#successMessage}}{{successMessage}}{{/successMessage}}
                                {{^successMessage}}Your password has been reset successfully. You can now log in with your new password.{{/successMessage}}
                            </div>
                        </div>

                        <div class="text-center">
                            <p class="mb-3">
                                <i class="bi bi-shield-check text-success" style="font-size: 3rem;"></i>
                            </p>
                            <p class="text-muted">
                                Redirecting you to the login page...
                            </p>
                            <div class="d-grid gap-2 mt-4">
                                <button
                                    class="btn btn-primary btn-lg"
                                    data-action="backToLogin">
                                    <i class="bi bi-box-arrow-in-right me-2"></i>Continue to Login
                                </button>
                            </div>
                        </div>
                        {{/success}}

                        <!-- Reset Form -->
                        {{^success}}
                        {{#tokenValid}}
                        <form data-action="resetPassword" novalidate>
                            <!-- New Password Field -->
                            <div class="mb-3">
                                <label for="resetPassword" class="form-label">
                                    <i class="bi bi-lock me-1"></i>New Password
                                </label>
                                <div class="input-group">
                                    <input
                                        type="{{#showPassword}}text{{/showPassword}}{{^showPassword}}password{{/showPassword}}"
                                        class="form-control form-control-lg"
                                        id="resetPassword"
                                        placeholder="Enter your new password"
                                        value="{{password}}"
                                        data-field="password"
                                        data-change-action="updateField"
                                        data-filter="live-search"
                                        data-action-keydown="handleKeyPress"
                                        autocomplete="new-password"
                                        required
                                        autofocus
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <button
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        data-password-field="password"
                                        data-action="togglePassword"
                                        {{#isLoading}}disabled{{/isLoading}}>
                                        <i class="bi bi-eye{{#showPassword}}-slash{{/showPassword}}"></i>
                                    </button>
                                </div>

                                <!-- Password Strength Indicator -->
                                {{#passwordStrength}}
                                <div class="mt-2">
                                    <div class="progress" style="height: 4px;">
                                        <div class="progress-bar
                                            {{#passwordStrength.weak}}bg-danger{{/passwordStrength.weak}}
                                            {{#passwordStrength.fair}}bg-warning{{/passwordStrength.fair}}
                                            {{#passwordStrength.good}}bg-info{{/passwordStrength.good}}
                                            {{#passwordStrength.strong}}bg-success{{/passwordStrength.strong}}"
                                        role="progressbar"
                                        style="width:
                                            {{#passwordStrength.weak}}25%{{/passwordStrength.weak}}
                                            {{#passwordStrength.fair}}50%{{/passwordStrength.fair}}
                                            {{#passwordStrength.good}}75%{{/passwordStrength.good}}
                                            {{#passwordStrength.strong}}100%{{/passwordStrength.strong}}">
                                        </div>
                                    </div>
                                    <small class="text-muted mt-1">
                                        Password strength: {{passwordStrength}}
                                    </small>
                                </div>
                                {{/passwordStrength}}
                            </div>

                            <!-- Confirm Password Field -->
                            <div class="mb-4">
                                <label for="resetConfirmPassword" class="form-label">
                                    <i class="bi bi-lock-fill me-1"></i>Confirm New Password
                                </label>
                                <div class="input-group">
                                    <input
                                        type="{{#showConfirmPassword}}text{{/showConfirmPassword}}{{^showConfirmPassword}}password{{/showConfirmPassword}}"
                                        class="form-control form-control-lg {{^passwordMatch}}is-invalid{{/passwordMatch}}"
                                        id="resetConfirmPassword"
                                        placeholder="Re-enter your new password"
                                        value="{{confirmPassword}}"
                                        data-field="confirmPassword"
                                        data-change-action="updateField"
                                        data-filter="live-search"
                                        data-action-keydown="handleKeyPress"
                                        autocomplete="new-password"
                                        required
                                        {{#isLoading}}disabled{{/isLoading}}>
                                    <button
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        data-password-field="confirmPassword"
                                        data-action="togglePassword"
                                        {{#isLoading}}disabled{{/isLoading}}>
                                        <i class="bi bi-eye{{#showConfirmPassword}}-slash{{/showConfirmPassword}}"></i>
                                    </button>
                                </div>
                                {{^passwordMatch}}
                                <div class="invalid-feedback">
                                    Passwords do not match
                                </div>
                                {{/passwordMatch}}
                            </div>

                            <!-- Reset Button -->
                            <button
                                type="submit"
                                class="btn btn-primary btn-lg w-100 mb-3"
                                {{#isLoading}}disabled{{/isLoading}}>
                                {{#isLoading}}
                                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Resetting password...
                                {{/isLoading}}
                                {{^isLoading}}
                                <i class="bi bi-key me-2"></i>Reset Password
                                {{/isLoading}}
                            </button>

                            <!-- Back to Login -->
                            <button
                                type="button"
                                class="btn btn-outline-secondary btn-lg w-100"
                                data-action="backToLogin"
                                {{#isLoading}}disabled{{/isLoading}}>
                                <i class="bi bi-arrow-left me-2"></i>Back to Login
                            </button>
                        </form>
                        {{/tokenValid}}

                        <!-- Invalid Token State -->
                        {{^tokenValid}}
                        <div class="text-center">
                            <div class="mb-4">
                                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 4rem;"></i>
                            </div>
                            <h4 class="text-warning mb-3">Invalid Reset Link</h4>
                            <p class="text-muted mb-4">
                                This password reset link is invalid or has expired.
                                Please request a new password reset.
                            </p>
                            <div class="d-grid gap-2">
                                <button
                                    class="btn btn-primary btn-lg"
                                    data-action="requestNew">
                                    <i class="bi bi-envelope me-2"></i>Request New Reset
                                </button>
                                <button
                                    class="btn btn-outline-secondary btn-lg"
                                    data-action="backToLogin">
                                    <i class="bi bi-arrow-left me-2"></i>Back to Login
                                </button>
                            </div>
                        </div>
                        {{/tokenValid}}

                        <!-- Additional Links -->
                        {{#tokenValid}}{{^success}}
                        <div class="text-center mt-4">
                            <p class="text-muted mb-2">
                                Remember your password?
                                <a href="#" class="text-decoration-none fw-semibold" data-action="backToLogin">
                                    Sign in
                                </a>
                            </p>
                            {{#registration}}
                            <p class="text-muted mb-0">
                                Don't have an account?
                                <a href="#" class="text-decoration-none fw-semibold" data-action="register">
                                    Sign up
                                </a>
                            </p>
                            {{/registration}}
                        </div>
                        {{/success}}{{/tokenValid}}
                        {{/success}}
                    </div>
                </div>

                <!-- Security Notice -->
                <div class="text-center mt-3">
                    <small class="text-muted">
                        <i class="bi bi-shield-lock me-1"></i>
                        Secure password reset with email verification
                    </small>
                </div>
            </div>
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