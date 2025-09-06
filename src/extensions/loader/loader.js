/**
 * MOJO App Initial Loader
 * A self-contained, drop-in script to display a themed loading animation.
 *
 * Usage:
 * 1. Add a theme class to your <body> tag (optional).
 *    - mojo-loader-theme-dark
 *    - mojo-loader-theme-light
 *    - mojo-loader-theme-corporate
 *    - mojo-loader-theme-playful
 *    - mojo-loader-theme-futuristic (new animation)
 *    - mojo-loader-theme-minimal (new animation)
 *    (Defaults to a purple gradient if no theme is set)
 * 2. Include this script in your main HTML file: <script src="/src/loader/loader.js"></script>
 * 3. Call `window.hideInitialLoader()` from your main app script when initialization is complete.
 */
(function () {
    if (document.getElementById('mojo-initial-loader')) return;

    // --- 1. Theme and Animation Detection ---
    const getTheme = () => {
        const classList = document.body.classList;
        if (classList.contains('mojo-loader-theme-futuristic')) return 'futuristic';
        if (classList.contains('mojo-loader-theme-minimal')) return 'minimal';
        if (classList.contains('mojo-loader-theme-dark')) return 'dark';
        if (classList.contains('mojo-loader-theme-light')) return 'light';
        if (classList.contains('mojo-loader-theme-corporate')) return 'corporate';
        if (classList.contains('mojo-loader-theme-playful')) return 'playful';
        return 'default';
    };
    const theme = getTheme();

    // --- 2. Define CSS Styles ---
    const styles = `
        .mojo-loader-body { overflow: hidden; }
        .mojo-loader-container {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            transition: opacity 0.3s ease-in-out;
            /* Default Theme (Purple) */
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .mojo-loader-content {
            background: rgba(255, 255, 255, 0.95); padding: 3rem; border-radius: 1rem;
            text-align: center; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px); max-width: 400px; margin: 2rem;
        }
        .mojo-loader-spinner { width: 3rem; height: 3rem; border-width: 0.25em; color: #667eea; }
        .mojo-loader-fade-out { opacity: 0; }

        /* --- Standard Themes --- */
        .mojo-loader-theme-dark .mojo-loader-container { background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); }
        .mojo-loader-theme-dark .mojo-loader-content { background: rgba(45, 55, 72, 0.95); color: #e2e8f0; }
        .mojo-loader-theme-dark .mojo-loader-content .text-dark { color: #e2e8f0 !important; }
        .mojo-loader-theme-dark .mojo-loader-content .text-muted { color: #a0aec0 !important; }
        .mojo-loader-theme-dark .mojo-loader-spinner { color: #718096; }
        .mojo-loader-theme-light .mojo-loader-container { background: linear-gradient(135deg, #e2e8f0 0%, #f7fafc 100%); }
        .mojo-loader-theme-light .mojo-loader-spinner { color: #a0aec0; }
        .mojo-loader-theme-corporate .mojo-loader-container { background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%); }
        .mojo-loader-theme-corporate .mojo-loader-spinner { color: #63b3ed; }
        .mojo-loader-theme-playful .mojo-loader-container { background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); }
        .mojo-loader-theme-playful .mojo-loader-spinner { color: #fbd38d; }

        /* --- Animation Theme: Futuristic --- */
        .mojo-loader-theme-futuristic .mojo-loader-container { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
        .mojo-loader-theme-futuristic .mojo-loader-content { background: rgba(30, 41, 59, 0.9); color: #94a3b8; }
        .mojo-loader-theme-futuristic .mojo-loader-content .text-dark { color: #e2e8f0 !important; }
        .mojo-loader-theme-futuristic .mojo-loader-content .text-muted { color: #64748b !important; }
        .mojo-loader-pulse-container { width: 60px; height: 60px; margin: 0 auto 1.5rem; position: relative; }
        .mojo-loader-hexagon {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #0ea5e9;
            clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
            animation: pulse 2s ease-in-out infinite;
        }
        .mojo-loader-hexagon:nth-child(2) { animation-delay: 0.5s; }
        @keyframes pulse {
            0%, 100% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1); opacity: 1; }
        }

        /* --- Animation Theme: Minimal --- */
        .mojo-loader-theme-minimal .mojo-loader-container { background-color: #f8f9fa; }
        .mojo-loader-theme-minimal .mojo-loader-content { background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .mojo-loader-dots-container { display: flex; justify-content: center; align-items: center; height: 60px; margin-bottom: 1rem; }
        .mojo-loader-dot {
            width: 12px; height: 12px; margin: 0 4px;
            background-color: #6c757d; border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .mojo-loader-dot:nth-child(1) { animation-delay: -0.32s; }
        .mojo-loader-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }
    `;

    // --- 3. Define HTML Structure based on Theme ---
    const getAnimationMarkup = () => {
        switch (theme) {
            case 'futuristic':
                return `
                    <div class="mojo-loader-pulse-container">
                        <div class="mojo-loader-hexagon"></div>
                        <div class="mojo-loader-hexagon"></div>
                    </div>`;
            case 'minimal':
                return `
                    <div class="mojo-loader-dots-container">
                        <div class="mojo-loader-dot"></div>
                        <div class="mojo-loader-dot"></div>
                        <div class="mojo-loader-dot"></div>
                    </div>`;
            default:
                return `<div class="spinner-border mojo-loader-spinner mb-3" role="status"><span class="visually-hidden">Loading...</span></div>`;
        }
    };

    const markup = `
        <div class="mojo-loader-container" id="mojo-initial-loader">
            <div class="mojo-loader-content">
                ${getAnimationMarkup()}
                <h4 class="text-dark mb-2">Initializing</h4>
                <p class="text-muted mb-3" id="mojo-loading-message">Loading application...</p>
                ${theme !== 'minimal' ? `
                <div class="progress" style="height: 4px">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" id="mojo-loading-progress"></div>
                </div>` : ''}
            </div>
        </div>
    `;

    // --- 4. Inject CSS and HTML ---
    document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);
    document.body.insertAdjacentHTML('beforeend', markup);
    document.body.classList.add('mojo-loader-body');

    // --- 5. Animation and Control Logic ---
    const loader = document.getElementById('mojo-initial-loader');
    const progressBar = document.getElementById('mojo-loading-progress');
    const loadingMessage = document.getElementById('mojo-loading-message');

    const messages = ["Connecting...", "Loading components...", "Preparing interface...", "Finalizing..."];
    let messageIndex = 0;
    let progress = 0;

    const updateProgress = () => {
        progress += Math.random() * 12 + 3;
        if (progress > 90) progress = 90;
        if (progressBar) progressBar.style.width = `${progress}%`;

        if (Math.random() < 0.3 && messageIndex < messages.length - 1) {
            messageIndex++;
            if (loadingMessage) loadingMessage.textContent = messages[messageIndex];
        }

        if (progress < 90) setTimeout(updateProgress, 250 + Math.random() * 400);
    };

    // --- 6. Expose Global Hide Function and Start Animation ---
    window.hideInitialLoader = function () {
        if (!loader) return;
        if (progressBar) {
            progressBar.style.width = "100%";
            progressBar.classList.remove("progress-bar-striped", "progress-bar-animated");
        }
        if (loadingMessage) loadingMessage.textContent = "Ready!";
        document.body.classList.remove('mojo-loader-body');
        setTimeout(() => {
            loader.classList.add("mojo-loader-fade-out");
            setTimeout(() => loader.remove(), 300);
        }, 200);
    };

    setTimeout(updateProgress, 200);
    setTimeout(() => {
        if (document.getElementById("mojo-initial-loader") && loadingMessage) {
            loadingMessage.textContent = "This is taking longer than usual...";
        }
    }, 10000);
    setTimeout(() => {
        if (document.getElementById("mojo-initial-loader")) {
            console.warn("Loading timeout - forcing loader hide.");
            window.hideInitialLoader();
        }
    }, 30000);
})();
