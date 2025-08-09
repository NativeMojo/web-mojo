/**
 * MOJO Framework - Hello World Example
 * Your first MOJO application demonstrating core concepts
 */

// Import MOJO framework components
import View from '../../src/core/View.js';

// Hello World View Component
class HelloWorldView extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="col-md-8 mx-auto">
                    <div class="hello-world-app">
                    <div class="card">
                        <div class="card-body text-center p-4">
                            <div class="mb-4">
                                <i class="bi bi-star-fill text-warning" style="font-size: 3rem;"></i>
                                <h1 class="mt-3 mb-2">{{greeting}}</h1>
                                <p class="lead text-muted">{{message}}</p>
                            </div>
                            
                            <div class="mb-4">
                                <button class="btn btn-primary me-2" data-action="changeGreeting">
                                    <i class="bi bi-shuffle me-1"></i>
                                    Change Greeting
                                </button>
                                <button class="btn btn-success me-2" data-action="showTime">
                                    <i class="bi bi-clock me-1"></i>
                                    Show Time
                                </button>
                                <button class="btn btn-info" data-action="celebrateSuccess">
                                    <i class="bi bi-party-popper me-1"></i>
                                    Celebrate!
                                </button>
                            </div>

                            <div class="stats-section">
                                <div class="row g-2">
                                    <div class="col-4">
                                        <div class="card bg-light">
                                            <div class="card-body p-2">
                                                <div class="h5 mb-0 text-primary">{{clickCount}}</div>
                                                <small class="text-muted">Button Clicks</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="card bg-light">
                                            <div class="card-body p-2">
                                                <div class="h5 mb-0 text-success">{{greetingChanges}}</div>
                                                <small class="text-muted">Greetings</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="card bg-light">
                                            <div class="card-body p-2">
                                                <div class="h5 mb-0 text-info">{{celebrations}}</div>
                                                <small class="text-muted">Celebrations</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {{#showCurrentTime}}
                            <div class="alert alert-info mt-3" role="alert">
                                <i class="bi bi-clock me-1"></i>
                                Current time: <strong>{{currentTime}}</strong>
                            </div>
                            {{/showCurrentTime}}
                        </div>
                    </div>

                    <!-- Learning Section -->
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body p-3">
                                    <h6 class="card-title">
                                        <i class="bi bi-book text-primary me-1"></i>
                                        What's Happening?
                                    </h6>
                                    <ul class="list-unstyled small mb-0">
                                        <li><i class="bi bi-arrow-right text-muted me-1"></i> View component with template</li>
                                        <li><i class="bi bi-arrow-right text-muted me-1"></i> Data binding with Mustache.js</li>
                                        <li><i class="bi bi-arrow-right text-muted me-1"></i> Action handlers for interactions</li>
                                        <li><i class="bi bi-arrow-right text-muted me-1"></i> Real-time data updates</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-body p-3">
                                    <h6 class="card-title">
                                        <i class="bi bi-code-slash text-success me-1"></i>
                                        Try This
                                    </h6>
                                    <ul class="list-unstyled small mb-0">
                                        <li><i class="bi bi-check-circle text-success me-1"></i> Click buttons to see updates</li>
                                        <li><i class="bi bi-check-circle text-success me-1"></i> Open browser dev tools</li>
                                        <li><i class="bi bi-check-circle text-success me-1"></i> Watch console messages</li>
                                        <li><i class="bi bi-check-circle text-success me-1"></i> Inspect the DOM changes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            data: {
                greeting: 'Hello, MOJO World!',
                message: 'Welcome to your first MOJO Framework application.',
                clickCount: 0,
                greetingChanges: 0,
                celebrations: 0,
                currentTime: null,
                showCurrentTime: false
            },
            className: 'hello-world-container',
            replaceContent: true,
            ...options
        });

        // Store different greetings for variety
        this.greetings = [
            { greeting: 'Hello, MOJO World!', message: 'Welcome to your first MOJO Framework application.' },
            { greeting: '¡Hola, MOJO!', message: 'Building modern web apps has never been easier.' },
            { greeting: 'Bonjour, MOJO!', message: 'Component-based development at its finest.' },
            { greeting: 'Guten Tag, MOJO!', message: 'Bootstrap 5 integration made simple.' },
            { greeting: 'Ciao, MOJO!', message: 'Templates and data binding in perfect harmony.' },
            { greeting: 'こんにちは, MOJO!', message: 'Modern ES6+ JavaScript patterns.' },
            { greeting: 'Привет, MOJO!', message: 'Clean architecture, powerful results.' }
        ];
    }

    // Lifecycle method - called after component is rendered
    async onAfterRender() {
        console.log('✅ HelloWorldView rendered successfully!');
        console.log('📊 Initial data:', this.data);
    }

    // Lifecycle method - called after component is mounted to DOM
    async onAfterMount() {
        console.log('🎯 HelloWorldView mounted to DOM!');
        console.log('🔍 You can inspect this component:', this);
        
        // Show a welcome message
        this.showSuccess('🎉 Hello World app is ready! Try clicking the buttons.');
        
        // Make component accessible for debugging
        window.helloWorldApp = this;
    }

    // Action handler - Change greeting to a random one
    async onActionChangeGreeting(event, element) {
        try {
            console.log('🔄 Changing greeting...');
            
            // Get current data
            const currentData = this.data;
            const currentIndex = this.greetings.findIndex(g => g.greeting === currentData.greeting);
            
            // Pick a different random greeting
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * this.greetings.length);
            } while (newIndex === currentIndex && this.greetings.length > 1);
            
            const newGreeting = this.greetings[newIndex];
            
            // Update data - this will automatically re-render the template
            this.updateData({
                greeting: newGreeting.greeting,
                message: newGreeting.message,
                clickCount: currentData.clickCount + 1,
                greetingChanges: currentData.greetingChanges + 1
            });
            
            // Force re-render to ensure template updates
            await this.render();

            console.log('✅ Greeting changed to:', newGreeting.greeting);
            
            // Show user feedback
            this.showInfo(`Greeting changed! (#${currentData.greetingChanges + 1})`);

        } catch (error) {
            console.error('❌ Error changing greeting:', error);
            this.showError('Failed to change greeting. Check console for details.');
        }
    }

    // Action handler - Show current time
    async onActionShowTime(event, element) {
        try {
            console.log('⏰ Showing current time...');
            
            const currentData = this.data;
            const now = new Date();
            const timeString = now.toLocaleString();
            

            
            // Update data with current time
            this.updateData({
                currentTime: timeString,
                clickCount: currentData.clickCount + 1,
                showCurrentTime: true
            });
            
            // Force re-render to ensure template updates
            await this.render();
            


            console.log('✅ Time displayed:', timeString);
            this.showInfo('Current time displayed!');

        } catch (error) {
            console.error('❌ Error showing time:', error);
            this.showError('Failed to show time. Check console for details.');
        }
    }

    // Action handler - Celebrate success with confetti-like effect
    async onActionCelebrateSuccess(event, element) {
        try {
            console.log('🎉 Celebrating success...');
            
            const currentData = this.data;
            
            // Update celebration count
            this.updateData({
                clickCount: currentData.clickCount + 1,
                celebrations: currentData.celebrations + 1,
                greeting: '🎉 Congratulations! 🎉',
                message: `You've mastered MOJO basics! Celebration #${currentData.celebrations + 1}`
            });
            
            // Force re-render to ensure template updates
            await this.render();

            // Add visual celebration effect
            const button = element;
            const originalHTML = button.innerHTML;
            
            // Animate button
            button.innerHTML = '<i class="bi bi-check-circle me-1"></i>Celebrating!';
            button.classList.add('btn-warning');
            button.classList.remove('btn-info');
            
            // Reset button after animation
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('btn-warning');
                button.classList.add('btn-info');
            }, 1500);

            console.log('✅ Celebration complete!');
            this.showSuccess(`🎊 Celebration #${currentData.celebrations + 1} complete! You're doing great!`);

        } catch (error) {
            console.error('❌ Error celebrating:', error);
            this.showError('Failed to celebrate. Check console for details.');
        }
    }
}

// Application initialization
class HelloWorldApp {
    constructor() {
        this.view = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Hello World MOJO App...');
            
            // Clear the app container first
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.innerHTML = '';
            }
            
            // Create the main view
            this.view = new HelloWorldView();
            
            // Render the view into the #app container
            await this.view.render('#app');
            
            console.log('✅ Hello World app initialized successfully!');
            console.log('💡 Pro tip: Check window.helloWorldApp to inspect the component');
            
        } catch (error) {
            console.error('❌ Failed to initialize Hello World app:', error);
            
            // Show error in the UI
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Initialization Error</h4>
                        <p>Failed to load the Hello World app. Please check the browser console for details.</p>
                        <hr>
                        <p class="mb-0"><strong>Error:</strong> ${error.message}</p>
                    </div>
                `;
            }
        }
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM ready, starting Hello World app...');
    
    const app = new HelloWorldApp();
    await app.initialize();
});

// Export for debugging and testing
export { HelloWorldView, HelloWorldApp };