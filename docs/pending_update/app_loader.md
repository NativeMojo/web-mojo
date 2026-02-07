# Application Loader

The MOJO framework includes a self-contained, drop-in script to display a beautiful, themed loading animation while your main application initializes. This provides a professional user experience right from the start.

## Features

- **Zero Configuration**: Simply include the script and it works.
- **Themable**: Easily apply different color schemes by adding a class to your `<body>` tag.
- **Self-Contained**: The script injects its own HTML and CSS, keeping your main `index.html` clean.
- **Lightweight**: No external dependencies are required, other than your project's existing Bootstrap 5 CSS for some spinner and progress bar styling.

## Quick Start

Using the loader involves two simple steps:

### 1. Include the Loader Script

Add the loader script to the `<head>` or `<body>` of your main `index.html` file. When using the `web-mojo` package, you can reference it directly.

```html
<!doctype html>
<html lang="en">
    <head>
        <title>My App</title>
        <!-- Your other CSS files -->
    </head>
    <body>
        <div id="app"></div>

        <!-- MOJO Loader -->
        <script src="node_modules/web-mojo/dist/loader.umd.js"></script>

        <!-- Your main application script -->
        <script type="module" src="app.js"></script>
    </body>
</html>
```

### 2. Hide the Loader on App Ready

From your main application script (e.g., `app.js`), call the global `window.hideInitialLoader()` function after your application has finished its initial setup and is ready to be displayed.

This is typically done after `app.start()` resolves.

```javascript
import { WebApp } from 'web-mojo';

const app = new WebApp({
    // ... your app config
});

// Start the application
app.start().then(() => {
    console.log('App started successfully');

    // Hide the initial loader now that the app is ready
    if (window.hideInitialLoader) {
        window.hideInitialLoader();
    }
}).catch(error => {
    console.error('Failed to start app:', error);
    // It's good practice to also hide the loader on error
    if (window.hideInitialLoader) {
        window.hideInitialLoader();
    }
});
```

## Theming

You can easily change the loader's appearance by adding a theme class to the `<body>` tag of your HTML file.

### Available Themes

-   **(Default)**: A stylish purple gradient with a spinner. No class is needed.
-   `mojo-loader-theme-dark`: A sleek, dark gray/black gradient with a spinner.
-   `mojo-loader-theme-light`: A subtle, clean light gray gradient with a spinner.
-   `mojo-loader-theme-corporate`: A professional and clean blue gradient with a spinner.
-   `mojo-loader-theme-playful`: A vibrant orange-to-yellow gradient with a spinner.
-   `mojo-loader-theme-futuristic`: A dark, high-tech theme with a **pulsing hexagon animation**.
-   `mojo-loader-theme-minimal`: A clean, light theme with a **bouncing dots animation** (no progress bar).

### Example: Using the Futuristic Theme

```html
<!doctype html>
<html lang="en">
    <head>
        <title>My Futuristic App</title>
    </head>
    <body class="mojo-loader-theme-futuristic">
        <div id="app"></div>

        <script src="node_modules/web-mojo/dist/loader.umd.js"></script>
        <script type="module" src="app.js"></script>
    </body>
</html>
```
