/**
 * MOJO Framework Version Manager
 * Auto-increments revision number on src/ changes and manages version info
 */

import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

class VersionManager {
    constructor() {
        this.packagePath = path.join(process.cwd(), 'package.json');
        this.versionFilePath = path.join(process.cwd(), 'src/version.js');
        this.indexPath = path.join(process.cwd(), 'src/index.js');
        this.buildTime = new Date().toISOString();
    }

    async getCurrentVersion() {
        try {
            const packageJson = JSON.parse(await fs.readFile(this.packagePath, 'utf-8'));
            return packageJson.version;
        } catch (error) {
            console.error('Error reading package.json:', error);
            return '2.0.0';
        }
    }

    parseVersion(version) {
        const [major, minor, revision] = version.split('.').map(Number);
        return { major: major || 2, minor: minor || 0, revision: revision || 0 };
    }

    formatVersion(major, minor, revision) {
        return `${major}.${minor}.${revision}`;
    }

    async incrementRevision() {
        const currentVersion = await this.getCurrentVersion();
        const { major, minor, revision } = this.parseVersion(currentVersion);
        const newRevision = revision + 1;
        const newVersion = this.formatVersion(major, minor, newRevision);

        console.log(`🔄 Incrementing version: ${currentVersion} → ${newVersion}`);

        await this.updateVersion(newVersion);
        return newVersion;
    }

    async updateVersion(newVersion) {
        // Update package.json
        await this.updatePackageJson(newVersion);

        // Update version.js file
        await this.updateVersionFile(newVersion);

        // Update index.js export
        // await this.updateIndexFile(newVersion);

        console.log(`✅ Version updated to ${newVersion}`);
    }

    async updatePackageJson(newVersion) {
        try {
            const packageJson = JSON.parse(await fs.readFile(this.packagePath, 'utf-8'));
            packageJson.version = newVersion;
            await fs.writeFile(this.packagePath, JSON.stringify(packageJson, null, 4) + '\n');
        } catch (error) {
            console.error('Error updating package.json:', error);
        }
    }

    async updateVersionFile(newVersion) {
        const { major, minor, revision } = this.parseVersion(newVersion);

        const versionContent = `/**
 * MOJO Framework Version Information
 * Auto-generated on ${this.buildTime}
 */

export const VERSION = '${newVersion}';
export const VERSION_MAJOR = ${major};
export const VERSION_MINOR = ${minor};
export const VERSION_REVISION = ${revision};
export const BUILD_TIME = '${this.buildTime}';

// Version object for easy access
export const VERSION_INFO = {
    full: VERSION,
    major: VERSION_MAJOR,
    minor: VERSION_MINOR,
    revision: VERSION_REVISION,
    buildTime: BUILD_TIME,
    toString() {
        return this.full;
    },
    compare(other) {
        const parseVer = (v) => v.split('.').map(Number);
        const [a1, a2, a3] = parseVer(this.full);
        const [b1, b2, b3] = parseVer(other);

        if (a1 !== b1) return a1 - b1;
        if (a2 !== b2) return a2 - b2;
        return a3 - b3;
    }
};

// Make version globally available if in browser
if (typeof window !== 'undefined') {
    window.MOJO = window.MOJO || {};
    window.MOJO.VERSION = VERSION;
    window.MOJO.VERSION_INFO = VERSION_INFO;

    // Also add to MOJO.version for convenience
    window.MOJO.version = VERSION;
}

export default VERSION_INFO;
`;

        try {
            await fs.writeFile(this.versionFilePath, versionContent);
        } catch (error) {
            console.error('Error updating version.js:', error);
        }
    }

    async updateIndexFile(newVersion) {
        try {
            let content = await fs.readFile(this.indexPath, 'utf-8');

            // Update the VERSION export
            content = content.replace(
                /export const VERSION = '[^']*';/,
                `export const VERSION = '${newVersion}';`
            );

            // Add version import if not present
            if (!content.includes("from './version.js'")) {
                // Find the imports section and add version import
                const lines = content.split('\n');
                let importInserted = false;

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('import') && lines[i].includes('./')) {
                        // Insert version import before other local imports
                        lines.splice(i, 0, "import { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME } from './version.js';");
                        importInserted = true;
                        break;
                    }
                }

                if (!importInserted) {
                    // Insert at the beginning if no local imports found
                    lines.unshift("import { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME } from './version.js';");
                }

                content = lines.join('\n');
            }

            // Add VERSION_INFO export if not present
            if (!content.includes("export { VERSION_INFO }")) {
                content += "\n// Export version information\nexport { VERSION_INFO, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME } from './version.js';\n";
            }

            await fs.writeFile(this.indexPath, content);
        } catch (error) {
            console.error('Error updating index.js:', error);
        }
    }

    async startWatcher() {
        console.log('🚀 Starting MOJO version watcher...');
        console.log('📁 Watching src/ subdirectories for changes (excluding root files)...');

        const watcher = chokidar.watch('src/*/**/*.js', {
            ignored: [
                'src/version.js',           // Don't watch the version file itself
                '**/node_modules/**',       // Ignore node_modules
                '**/dist/**',              // Ignore dist folder
                '**/.git/**'               // Ignore git folder
            ],
            persistent: true,
            ignoreInitial: true
        });

        let timeout;
        const debounceMs = 2000; // Wait 2 seconds after last change

        watcher.on('change', (filePath) => {
            console.log(`📝 File changed: ${filePath}`);

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    await this.incrementRevision();
                } catch (error) {
                    console.error('Error incrementing version:', error);
                }
            }, debounceMs);
        });

        watcher.on('add', (filePath) => {
            console.log(`➕ File added: ${filePath}`);

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    await this.incrementRevision();
                } catch (error) {
                    console.error('Error incrementing version:', error);
                }
            }, debounceMs);
        });

        watcher.on('unlink', (filePath) => {
            console.log(`🗑️  File removed: ${filePath}`);

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    await this.incrementRevision();
                } catch (error) {
                    console.error('Error incrementing version:', error);
                }
            }, debounceMs);
        });

        watcher.on('error', (error) => {
            console.error('Watcher error:', error);
        });

        // Initial version setup
        const currentVersion = await this.getCurrentVersion();
        await this.updateVersionFile(currentVersion);
        console.log(`📦 Current version: ${currentVersion}`);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down version watcher...');
            watcher.close();
            process.exit(0);
        });

        return watcher;
    }

    async manualIncrement() {
        return await this.incrementRevision();
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--watch')) {
        const manager = new VersionManager();
        await manager.startWatcher();
    } else if (args.includes('--increment')) {
        const manager = new VersionManager();
        const version = await manager.manualIncrement();
        console.log(`New version: ${version}`);
        process.exit(0);
    } else if (args.includes('--init')) {
        const manager = new VersionManager();
        const currentVersion = await manager.getCurrentVersion();
        await manager.updateVersionFile(currentVersion);
        // await manager.updateIndexFile(currentVersion);
        console.log(`Initialized version file with version ${currentVersion}`);
        process.exit(0);
    } else {
        console.log(`
🔧 MOJO Version Manager

Usage:
  node scripts/version-manager.js --watch     Start file watcher
  node scripts/version-manager.js --increment Increment version once
  node scripts/version-manager.js --init      Initialize version file

Options:
  --watch      Watch src/ directory and auto-increment on changes
  --increment  Manually increment revision number
  --init       Create/update version.js with current version

Examples:
  npm run version:watch      # Start watching for changes
  npm run version:increment  # Bump version manually
  npm run version:init       # Initialize version system
`);
        process.exit(0);
    }
}

// Only run main if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default VersionManager;
