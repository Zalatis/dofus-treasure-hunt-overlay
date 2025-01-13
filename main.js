const { app, BrowserWindow, shell, globalShortcut } = require('electron');
const https = require('https');
const path = require('path');
const fs = require('fs');

let mainWindow;
let latestChromeVersion = '131.0.0.0';  // Fallback default version

const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
const defaultURL = 'https://dofusdb.fr/fr/tools/treasure-hunt';
const betaURL = 'https://beta.dofusdb.fr/fr/tools/treasure-hunt';
const availableLanguages = ['fr', 'en', 'pt', 'es', 'de'];
const defaultLanguage = 'fr';

// Default configuration
const defaultConfig = {
    bounds: { x: 0, y: 0, width: 320, height: 700 },
    url: `https://dofusdb.fr/${defaultLanguage}/tools/treasure-hunt`,
    language: defaultLanguage,
    isFrame: true
};

// Load configuration from file
function loadConfig() {
    try {
        if (fs.existsSync(settingsFilePath)) {
            const data = fs.readFileSync(settingsFilePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Failed to load configuration:', err);
    }
    return defaultConfig; // Return default config if loading fails
}

// Save configuration to file
function saveConfig(config) {
    try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Failed to save configuration:', err);
    }
}

// Clear the configuration file and reset to default
function clearConfig() {
    try {
        if (fs.existsSync(settingsFilePath)) {
            fs.unlinkSync(settingsFilePath); // Delete the file
        }
        Object.assign(config, defaultConfig); // Reset in-memory config to defaults
        saveConfig(config); // Save the default configuration
        console.log('Configuration reset to default.');
        if (mainWindow) {
            mainWindow.close(); // Close the current window
            createWindow(isFrame); // Recreate the window with default settings
        }
    } catch (err) {
        console.error('Failed to clear configuration:', err);
    }
}

const config = loadConfig();
let isFrame = typeof config.isFrame === 'boolean' ? config.isFrame : true; // Default to true if not valid

// Function to fetch the latest Chrome version
function fetchLatestChromeVersion() {
    return new Promise((resolve, reject) => {
        const url = 'https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions';

        https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.versions && parsedData.versions.length > 0) {
                        resolve(parsedData.versions[0].version); // Use the first version from the response
                    } else {
                        reject(new Error('No versions found in the response'));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', err => {
            reject(err);
        });
    });
}

// Function to create a window with the frame setting and position
function createWindow(frame) {
    const lastWindowBounds = config.bounds; // Load saved bounds from config

    mainWindow = new BrowserWindow({
        width: lastWindowBounds.width,
        height: lastWindowBounds.height,
        x: lastWindowBounds.x,
        y: lastWindowBounds.y,
        frame: frame,  // Set frame to true or false based on the toggle
        alwaysOnTop: true,
        icon: 'assets/icon.ico',
        webPreferences: {
            preload: `${__dirname}/preload.js`,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            allowRunningInsecureContent: false
        }
    });

    // Clear cache and cookies before loading the page
    const session = mainWindow.webContents.session;
    Promise.all([
        session.clearCache(),
        session.clearStorageData({ storages: ['cookies'] })
    ])
    .then(() => {
        console.log('Cache and cookies cleared successfully.');
    })
    .catch(err => {
        console.error('Failed to clear cache or cookies:', err);
    });

    mainWindow.webContents.setUserAgent(
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${latestChromeVersion} Safari/537.36`
    );

    mainWindow.loadURL(config.url); // Load the URL from config

    // Remove the menu from the window
    mainWindow.setMenu(null);

    // Open external links in the default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Call the function to track movement and resizing
    trackWindowPositionAndSize(mainWindow);

    // Handle when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Function to track window move and resize events
function trackWindowPositionAndSize(window) {
    window.on('move', () => {
        if (window) {
            const bounds = window.getBounds();
            config.bounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
            saveConfig(config); // Save bounds on move
        }
    });

    window.on('resize', () => {
        if (window) {
            const bounds = window.getBounds();
            config.bounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
            saveConfig(config); // Save bounds on resize
        }
    });
}

function toggleURL() {
    const baseURL = config.url.includes('beta') ? defaultURL : betaURL;
    console.log(config.language);
    config.url = `${baseURL.replace('/fr/', `/${config.language}/`)}`;
    console.log(config.url);
    saveConfig(config); // Save the new URL to the configuration
    if (mainWindow) {
        mainWindow.loadURL(config.url); // Reload the page with the new URL
    } else {
        createWindow(isFrame);
    }
}

// Function to toggle the language
function toggleLanguage() {
    const currentIndex = availableLanguages.indexOf(config.language);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    config.language = availableLanguages[nextIndex]; // Cycle to the next language

    // Update the URL depending on whether we are in the production or beta environment
    const baseURL = config.url.includes('beta') ? betaURL : defaultURL;
    config.url = `${baseURL.replace('/fr/', `/${config.language}/`)}`; // Update URL with the new language

    saveConfig(config); // Save the new language and URL
    if (mainWindow) {
        mainWindow.loadURL(config.url); // Reload the page with the new URL
    } else {
        createWindow(isFrame);
    }
}


app.whenReady().then(async () => {
    try {
        latestChromeVersion = await fetchLatestChromeVersion();
        console.log(`Latest Chrome version fetched: ${latestChromeVersion}`);
    } catch (error) {
        console.error('Failed to fetch the latest Chrome version:', error);
    }

    // Initially create the window with the frame set to false (frameless)
    createWindow(isFrame);

    // Register the global shortcut for Control+F2 to toggle the frame
    globalShortcut.register('Control+F2', () => {
        isFrame = !isFrame; // Toggle the isFrame state
        config.isFrame = isFrame; // Save the new state to config
        saveConfig(config); // Save updated configuration

        const allWindows = BrowserWindow.getAllWindows();
        allWindows.forEach(window => window.close());
        createWindow(isFrame);
    });

    // Register the global shortcut for Control+F3 to toggle the language
    globalShortcut.register('Control+F3', () => {
        toggleLanguage();
    });

    // Register the global shortcut for Control+F4 to toggle the URL
    globalShortcut.register('Control+F4', () => {
        toggleURL();
    });

    // Register the global shortcut for Control+F12 to clear the configuration
    globalShortcut.register('Control+F12', () => {
        clearConfig();
    });
});

// Handle all windows closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle application activation (macOS-specific behavior)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(isFrame);  // Create a new window with the correct frame state
    }
});
