/**
 * MOJO Framework Version Information
 * Auto-generated on 2025-09-26T05:51:27.778Z
 */

export const VERSION = '2.1.279';
export const VERSION_MAJOR = 2;
export const VERSION_MINOR = 1;
export const VERSION_REVISION = 279;
export const BUILD_TIME = '2025-09-26T05:51:27.778Z';

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
