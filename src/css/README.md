# MOJO Authentication CSS

Professional, responsive CSS styling for MOJO Framework authentication pages. **Single file, zero dependencies, ready for external projects.**

## 🎯 **Single File Approach**

**One file does it all:**
- ✅ **`auth.css`** - Complete authentication styling (800+ lines)
- ✅ **External project ready** - No build process required
- ✅ **CSS custom properties** for easy theming
- ✅ **Framework integration helpers** built-in
- ✅ **Responsive design** for all screen sizes
- ✅ **Accessibility features** included

## 🚀 **Quick Start**

### For External Projects

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Just one CSS file needed -->
    <link rel="stylesheet" href="node_modules/mojo-framework/src/css/auth.css">
    
    <!-- Bootstrap Icons (recommended for icons) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css">
</head>
<body>
    <div class="auth-page">
        <!-- Your auth content -->
    </div>
</body>
</html>
```

### Via CDN (Future)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mojo-framework/css/auth.css">
```

### CSS Import

```css
/* In your main stylesheet */
@import url('path/to/mojo/src/css/auth.css');
```

## 🎨 **Theming Made Simple**

Override CSS custom properties in your project:

```css
/* Your project's custom styles */
:root {
    /* Brand colors */
    --mojo-auth-primary: #your-brand-color;
    --mojo-auth-secondary: #your-secondary-color;
    
    /* Layout */
    --mojo-auth-border-radius: 0.5rem;
    --mojo-auth-card-padding: 2rem;
}
```

**That's it!** Your auth pages now use your brand colors.

## 🏗️ **HTML Structure**

### Basic Authentication Page

```html
<div class="auth-page">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-sm-10 col-md-8 col-lg-6 col-xl-5">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <!-- Logo -->
                        <div class="text-center mb-4">
                            <img src="logo.png" alt="App" class="mojo-auth-logo">
                            <h2 class="h3 mb-2">Welcome Back</h2>
                        </div>

                        <!-- Form -->
                        <form>
                            <div class="mb-3">
                                <label class="form-label">
                                    <i class="bi bi-envelope me-1"></i>Email
                                </label>
                                <input type="email" class="form-control form-control-lg">
                            </div>
                            <button type="submit" class="btn btn-primary btn-lg w-100">
                                Sign In
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

## 🧰 **Layout Options**

### 1. Full-Screen (Default)
```html
<div class="auth-page">
    <!-- Full viewport with gradient background -->
</div>
```

### 2. Compact/Embedded
```html
<div class="mojo-auth-compact">
    <div class="auth-page">
        <!-- Transparent background, fits in existing layout -->
    </div>
</div>
```

### 3. Dark Theme
```html
<div class="mojo-auth-dark">
    <div class="auth-page">
        <!-- Dark colors automatically applied -->
    </div>
</div>
```

### 4. No Background
```html
<div class="mojo-auth-no-bg">
    <div class="auth-page">
        <!-- You handle the background -->
    </div>
</div>
```

## 🔧 **Framework Integration**

### Bootstrap 5 (Recommended)

```html
<!-- Bootstrap + MOJO Auth -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="path/to/auth.css" rel="stylesheet">

<div class="auth-page bootstrap-theme">
    <!-- Automatically uses Bootstrap's CSS variables -->
</div>
```

### Tailwind CSS

```html
<div class="auth-page tailwind-theme">
    <!-- Compatible font stack applied -->
</div>
```

### Any Framework

The CSS is **framework-agnostic**:

```css
/* Your framework integration */
.your-framework .auth-page {
    --mojo-auth-primary: var(--your-primary-color);
    font-family: var(--your-font-family);
}
```

## 📱 **Responsive Features**

- **< 576px**: Mobile-first optimizations
- **576px - 768px**: Tablet adjustments  
- **768px+**: Desktop layout with hover effects
- **992px+**: Large desktop spacing

### Mobile Full-Screen Option

```html
<div class="mojo-auth-mobile-full">
    <div class="auth-page">
        <!-- Full-screen on mobile, card on desktop -->
    </div>
</div>
```

## ♿ **Built-in Accessibility**

- ✅ **High contrast mode** support
- ✅ **Focus-visible** indicators
- ✅ **Screen reader** friendly
- ✅ **Keyboard navigation**
- ✅ **Reduced motion** support
- ✅ **Print-friendly** styles

## 🌙 **Dark Mode**

### Automatic Detection
```css
/* Automatically detects user preference */
<div class="mojo-auth-auto">
    <div class="auth-page">
        <!-- Switches based on prefers-color-scheme -->
    </div>
</div>
```

### Manual Control
```html
<!-- Force dark theme -->
<div class="mojo-auth-dark">
    <div class="auth-page"><!-- Always dark --></div>
</div>
```

## 🎨 **CSS Classes Reference**

### Layout Classes
| Class | Purpose |
|-------|---------|
| `.auth-page` | **Required** main container |
| `.mojo-auth-container` | Full-screen wrapper helper |
| `.mojo-auth-wrapper` | Content wrapper with max-width |
| `.mojo-auth-compact` | Embedded layout |
| `.mojo-auth-dark` | Dark theme |
| `.mojo-auth-no-bg` | Transparent background |

### Component Classes
| Class | Purpose |
|-------|---------|
| `.form-control` | Styled form inputs |
| `.btn-primary` | Primary action button |
| `.btn-outline-primary` | Secondary button |
| `.alert-danger` | Error messages |
| `.alert-success` | Success messages |
| `.mojo-auth-logo` | Logo styling |

## 🔧 **Customization Examples**

### Brand Colors
```css
:root {
    --mojo-auth-primary: #ff6b35;
    --mojo-auth-secondary: #004e7c;
}
```

### Square Design
```css
:root {
    --mojo-auth-border-radius: 0.25rem;
}
```

### Custom Background
```css
.auth-page {
    background: url('background.jpg') center/cover !important;
}
```

### Corporate Theme
```css
:root {
    --mojo-auth-primary: #003d7a;
    --mojo-auth-secondary: #0066cc;
    --mojo-auth-border-radius: 0;
}

.auth-page .card {
    box-shadow: none !important;
    border: 2px solid var(--mojo-auth-primary) !important;
}
```

## 🚨 **Troubleshooting**

### Styles Not Applying
```html
<!-- Make sure you have the required class -->
<div class="auth-page">
    <!-- ✅ Correct -->
</div>

<div class="login-page">
    <!-- ❌ Wrong - must use "auth-page" -->
</div>
```

### Custom Colors Not Working
```css
/* ✅ Define in :root */
:root {
    --mojo-auth-primary: #your-color;
}

/* ❌ Don't define on .auth-page */
.auth-page {
    --mojo-auth-primary: #your-color; /* Won't work */
}
```

### Framework Conflicts
```css
/* Override conflicting styles with !important */
.auth-page .btn-primary {
    background: linear-gradient(135deg, var(--mojo-auth-primary) 0%, var(--mojo-auth-secondary) 100%) !important;
}
```

## 🏗️ **Future CSS Architecture**

This single-file approach will extend to other MOJO components:

```
src/css/
├── auth.css          # ✅ Authentication (this file)
├── data-grid.css     # 🔜 Future: DataGrid styling
├── charts.css        # 🔜 Future: Charts styling
└── core.css          # 🔜 Future: Core framework styles
```

**Benefits:**
- **Granular imports** - Only load what you need
- **Zero conflicts** - Each component is self-contained
- **Easy maintenance** - One file per feature
- **External ready** - No build process required

## 📦 **File Information**

- **File**: `src/css/auth.css`
- **Size**: ~800 lines of optimized CSS
- **Dependencies**: None (optional Bootstrap Icons)
- **Browser Support**: Modern browsers (IE11+ with fallbacks)
- **License**: MIT

## 📚 **Related Documentation**

- [Authentication Guide](../../docs/guide/Auth.md) - Complete auth system docs
- [Demo Application](../../examples/auth-demo/) - Working examples
- [MOJO Framework](../../README.md) - Main framework documentation

---

**Ready to use!** Just link the CSS file and start building beautiful authentication pages. 🎉