# MOJO Framework Examples

Welcome to the MOJO Framework examples! This directory contains comprehensive examples demonstrating the features and best practices of the MOJO framework.

## 🚀 Main Examples Application

The primary example is a single-page application that showcases all major MOJO features in one organized interface.

### Running the Examples

1. **Using the Dev Server** (Recommended):
   ```bash
   npm run dev
   ```
   Then navigate to: http://localhost:3000/examples/

2. **Direct File Access**:
   Open `index.html` in your browser

### Structure

```
examples/
├── index.html          # Main entry point
├── app.js             # Application bootstrap
├── app.css            # Styles
├── models/            # Shared data models
│   ├── Todo.js        # RestModel example
│   └── TodoCollection.js # DataList example
├── pages/             # Page components
│   ├── home/          # Landing page
│   ├── components/    # Component demos
│   ├── dialogs/       # Dialog examples
│   ├── forms/         # Form examples
│   ├── models/        # Model & data demos
│   ├── navigation/    # Navigation patterns
│   ├── tables/        # Table examples
│   └── templates/     # Template engine
└── legacy/            # Previous examples (reference)
```

## 📚 Features Demonstrated

### Core Concepts
- **Components** - View class, lifecycle, rendering
- **Pages & Routing** - Param-based routing (`?page=name`)
- **Templates** - Mustache.js integration
- **Models & Data** - RestModel, DataList, API integration

### UI Components
- **Dialogs** - Modal dialogs, alerts, confirmations
- **Forms** - FormBuilder, validation, data binding
- **Tables** - Data tables, sorting, filtering, pagination

### Best Practices
- Clean folder organization
- Shared models in `/models`
- Consistent routing patterns
- Proper component lifecycle usage

## 🏗️ Architecture

### Models (`/models`)
Reusable data models that extend RestModel:
```javascript
import { RestModel } from '../../src/mojo.js';

class Todo extends RestModel {
    static endpoint = '/api/example/todo';
    // Model implementation
}
```

### Pages (`/pages`)
Page components that extend the Page class:
```javascript
import Page from '../../../src/core/Page.js';

export default class HomePage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            page_name: 'home',
            title: 'Home Page'
        });
    }
}
```

### Routing
The examples use param-based routing (MOJO default):
- Home: `?page=home`
- Components: `?page=components`
- Forms: `?page=forms`
- Models: `?page=models`

## 🔧 Key Files

### `app.js`
Main application file that:
- Initializes the router
- Sets up navigation
- Registers all pages
- Configures the layout

### `models/Todo.js`
Example RestModel implementation showing:
- API endpoint configuration
- Custom methods
- Validation
- Data transformation

### `models/TodoCollection.js`
Example DataList implementation showing:
- Collection management
- Batch operations
- Filtering and sorting
- API synchronization

## 📖 Learning Path

1. **Start with Home** - Overview of MOJO features
2. **Explore Components** - Basic building blocks
3. **Study Navigation** - Routing patterns
4. **Learn Templates** - Mustache.js integration
5. **Understand Models** - Data management
6. **Build Forms** - User input handling
7. **Work with Tables** - Data presentation
8. **Use Dialogs** - Modal interactions

## 🗂️ Legacy Examples

Previous examples have been preserved in the `/legacy` folder for reference. These include:
- Original tutorials
- Phase 1 & 2 demonstrations
- Specialized use cases

See `/legacy/README.md` for details.

## 🛠️ Development

### Adding New Pages

1. Create a new folder in `/pages`
2. Create your Page class extending `Page`
3. Register in `app.js`:
   ```javascript
   router.addRoute('mypage', MyPage);
   ```
4. Add navigation item in `navItems`

### Creating Models

1. Add model file to `/models`
2. Extend `RestModel` or use as base
3. Import where needed:
   ```javascript
   import MyModel from '../../models/MyModel.js';
   ```

## 🔗 API Integration

The examples use a test API server. Ensure it's running:
```bash
# In a separate terminal
npm run api
```

API endpoints:
- TODO API: `http://0.0.0.0:8881/api/example/todo`

## 📝 Notes

- Examples use Bootstrap 5 for styling
- Param-based routing works best for static hosting
- Models are shared across pages for consistency
- Each page demonstrates specific MOJO features
- Code is well-commented for learning

## 🚦 Quick Start

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open browser to: http://localhost:3000/examples/
4. Explore the examples through the navigation menu

## 📚 Further Resources

- [MOJO Documentation](../docs/)
- [API Reference](../docs/api/)
- [User Guide](../docs/user-guide/)
- [Legacy Examples](./legacy/)

---

Happy coding with MOJO! 🎉