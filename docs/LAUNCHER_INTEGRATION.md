# CyberdeckOS and Cyberdeck Launcher Integration

## Overview

This document outlines the integration between CyberdeckOS and Cyberdeck Launcher, defining how these two components work together to provide a secure, efficient platform for running web applications. CyberdeckOS provides the privileged system layer, while Cyberdeck Launcher serves as the user interface and application manager.

## Architecture

```
+---------------------------------------------------------------+
|                        Applications                           |
|  (PWAs running in Cyberdeck Launcher via browser runtime)     |
+---------------------------------------------------------------+
                              |
                              | WebAX API Calls
                              v
+---------------------------------------------------------------+
|                     Cyberdeck Launcher                        |
|  (PWA-launch system, windowing, permission management)        |
+---------------------------------------------------------------+
                              |
                              | Privileged API Calls
                              v
+---------------------------------------------------------------+
|                        CyberdeckOS                            |
|  (Service management, resource allocation, security)          |
+---------------------------------------------------------------+
```

## Integration Points

### Initialization and Bootstrap

When the system boots, the following sequence occurs:

1. **OS Boot**: The host operating system boots
2. **CyberdeckOS Initialization**: CyberdeckOS initializes and starts essential services
3. **Browser Launch**: The browser is launched in kiosk mode
4. **Launcher Load**: Cyberdeck Launcher loads as a PWA
5. **Launcher Registration**: Cyberdeck Launcher registers with CyberdeckOS
6. **Service Discovery**: Cyberdeck Launcher discovers available services
7. **UI Initialization**: Cyberdeck Launcher initializes its UI

Example initialization code:

```javascript
// CyberdeckOS initialization (Rust code compiled to WASM)
export async function initialize() {
  // Initialize system components
  await initializeServiceManager();
  await initializePermissionManager();
  await initializeResourceManager();
  await initializeStorageManager();
  await initializeCommunicationManager();
  await initializeSecurityManager();
  
  // Start essential services
  await startEssentialServices();
  
  // Open communication channel
  await openSystemChannel();
  
  return { status: 'initialized', version: '1.0.0' };
}

// Cyberdeck Launcher initialization (TypeScript)
async function initializeLauncher() {
  try {
    // Initialize CyberdeckOS
    const osStatus = await CyberdeckOS.initialize();
    console.log('CyberdeckOS initialized:', osStatus);
    
    // Register the Launcher
    await CyberdeckOS.registerLauncher({
      version: '1.0.0',
      capabilities: ['webgpu', 'webcodecs', 'webauthn'],
      requirements: {
        memory: '512MB',
        storage: '1GB',
        services: ['postgres', 'minio']
      }
    });
    
    // Discover available services
    const services = await CyberdeckOS.getAvailableServices();
    console.log('Available services:', services);
    
    // Initialize UI
    initializeUI();
    
    // Load saved applications
    await loadSavedApplications();
  } catch (error) {
    console.error('Launcher initialization failed:', error);
    showErrorScreen('Failed to initialize Cyberdeck Launcher');
  }
}
```

### Service Management

Cyberdeck Launcher interacts with CyberdeckOS to manage services:

1. **Service Discovery**: Launcher discovers available services
2. **Service Status**: Launcher monitors service status
3. **Service Control**: Launcher can start, stop, and restart services
4. **Service Configuration**: Launcher can configure services

Example service management code:

```javascript
// Get available services
const services = await CyberdeckOS.getAvailableServices();

// Get service status
const postgresStatus = await CyberdeckOS.getServiceStatus('postgres');

// Start a service
await CyberdeckOS.startService('postgres', {
  port: 5432,
  dataDir: '/data/postgres',
  configFile: '/etc/postgres/postgresql.conf'
});

// Stop a service
await CyberdeckOS.stopService('postgres', { timeout: 30 });

// Restart a service
await CyberdeckOS.restartService('postgres');

// Configure a service
await CyberdeckOS.configureService('postgres', {
  maxConnections: 100,
  sharedBuffers: '256MB',
  workMem: '4MB'
});
```

### Permission Management

Cyberdeck Launcher manages permissions for applications:

1. **Permission Request**: Applications request permissions through the Launcher
2. **User Consent**: Launcher displays permission requests to the user
3. **Permission Grant**: Launcher forwards granted permissions to CyberdeckOS
4. **Permission Enforcement**: CyberdeckOS enforces permissions for all operations

Example permission flow:

```javascript
// Application requests permission (via jcule API)
async function requestCameraAccess() {
  try {
    const permission = await jcule.permissions.request('hardware:camera');
    if (permission) {
      // Permission granted, access camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = stream;
    } else {
      // Permission denied
      showPermissionDeniedMessage();
    }
  } catch (error) {
    console.error('Permission request failed:', error);
    showErrorMessage('Failed to request camera permission');
  }
}

// Launcher handles permission request
async function handlePermissionRequest(app, permission) {
  // Check if permission is already granted
  const existingPermission = await CyberdeckOS.checkPermission(app.id, permission);
  if (existingPermission) {
    return existingPermission;
  }
  
  // Show permission request to user
  const userConsent = await showPermissionDialog(app, permission);
  if (!userConsent) {
    return null;
  }
  
  // Request permission from CyberdeckOS
  const token = await CyberdeckOS.grantPermission(app.id, permission);
  
  // Store permission in app's permission list
  app.permissions.push({ permission, token });
  
  return token;
}

// CyberdeckOS grants permission
async function grantPermission(appId, permission) {
  // Validate app and permission
  validateAppAndPermission(appId, permission);
  
  // Generate permission token
  const token = generatePermissionToken(appId, permission);
  
  // Store permission grant
  storePermissionGrant(appId, permission, token);
  
  // Log permission grant
  logPermissionGrant(appId, permission);
  
  return token;
}
```

### Resource Allocation

CyberdeckOS allocates resources to the Launcher and its applications:

1. **Resource Requirements**: Launcher declares resource requirements
2. **Resource Allocation**: CyberdeckOS allocates resources based on requirements
3. **Resource Monitoring**: CyberdeckOS monitors resource usage
4. **Resource Adjustment**: CyberdeckOS adjusts resource allocation as needed

Example resource allocation:

```javascript
// Launcher declares resource requirements
await CyberdeckOS.setResourceRequirements({
  cpu: {
    priority: 'high',
    cores: 2
  },
  memory: {
    minimum: '256MB',
    recommended: '512MB'
  },
  storage: {
    minimum: '500MB',
    recommended: '1GB'
  },
  network: {
    priority: 'medium',
    bandwidth: '10Mbps'
  }
});

// CyberdeckOS allocates resources
function allocateResources(requirements) {
  // Calculate available resources
  const availableResources = calculateAvailableResources();
  
  // Allocate CPU resources
  const cpuAllocation = allocateCPUResources(
    requirements.cpu,
    availableResources.cpu
  );
  
  // Allocate memory resources
  const memoryAllocation = allocateMemoryResources(
    requirements.memory,
    availableResources.memory
  );
  
  // Allocate storage resources
  const storageAllocation = allocateStorageResources(
    requirements.storage,
    availableResources.storage
  );
  
  // Allocate network resources
  const networkAllocation = allocateNetworkResources(
    requirements.network,
    availableResources.network
  );
  
  // Return allocated resources
  return {
    cpu: cpuAllocation,
    memory: memoryAllocation,
    storage: storageAllocation,
    network: networkAllocation
  };
}

// Monitor resource usage
function monitorResources() {
  setInterval(() => {
    // Get current resource usage
    const cpuUsage = getCPUUsage();
    const memoryUsage = getMemoryUsage();
    const storageUsage = getStorageUsage();
    const networkUsage = getNetworkUsage();
    
    // Check for resource constraints
    if (cpuUsage > 90) {
      // CPU usage too high, take action
      throttleCPUUsage();
    }
    
    if (memoryUsage > 90) {
      // Memory usage too high, take action
      freeUnusedMemory();
    }
    
    // Update resource metrics
    updateResourceMetrics({
      cpu: cpuUsage,
      memory: memoryUsage,
      storage: storageUsage,
      network: networkUsage
    });
  }, 5000);
}
```

### Communication

CyberdeckOS and Cyberdeck Launcher communicate through secure channels:

1. **System Channel**: Used for system-level communication
2. **Service Channels**: Used for service-specific communication
3. **Application Channels**: Used for application-specific communication

Example communication:

```javascript
// Create system channel
const systemChannel = await CyberdeckOS.createChannel('system', {
  encrypted: true,
  persistent: true
});

// Subscribe to system events
systemChannel.subscribe('system:event', (event) => {
  console.log('System event:', event);
  
  // Handle different event types
  switch (event.type) {
    case 'service:started':
      updateServiceStatus(event.service, 'running');
      break;
    case 'service:stopped':
      updateServiceStatus(event.service, 'stopped');
      break;
    case 'resource:warning':
      showResourceWarning(event.resource, event.usage);
      break;
    case 'security:alert':
      showSecurityAlert(event.alert);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }
});

// Publish message to system channel
systemChannel.publish('launcher:ready', {
  version: '1.0.0',
  timestamp: Date.now()
});

// Create service channel
const postgresChannel = await CyberdeckOS.createChannel('service:postgres', {
  encrypted: true
});

// Subscribe to service events
postgresChannel.subscribe('postgres:event', (event) => {
  console.log('Postgres event:', event);
  updatePostgresStatus(event);
});

// Create application channel
const appChannel = await CyberdeckOS.createChannel('app:notes', {
  encrypted: true,
  accessControl: [
    { origin: 'https://notes-app.example.com', permissions: ['read', 'write'] }
  ]
});

// Forward application messages
appChannel.subscribe('notes:event', (event) => {
  forwardToApplication('notes-app', event);
});
```

### Application Management

Cyberdeck Launcher manages applications with support from CyberdeckOS:

1. **Application Installation**: Launcher installs applications
2. **Application Launch**: Launcher launches applications
3. **Application Lifecycle**: Launcher manages application lifecycle
4. **Application Communication**: Launcher facilitates application communication

Example application management:

```javascript
// Install application
async function installApplication(url) {
  try {
    // Fetch application manifest
    const manifest = await fetchManifest(url);
    
    // Validate manifest
    validateManifest(manifest);
    
    // Request storage allocation
    const storage = await CyberdeckOS.allocateStorage(
      manifest.id,
      manifest.storage.required
    );
    
    // Download application assets
    await downloadAssets(manifest.assets, storage.path);
    
    // Register application with CyberdeckOS
    await CyberdeckOS.registerApplication({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      permissions: manifest.permissions,
      storage: storage.path
    });
    
    // Add application to launcher
    addApplicationToLauncher(manifest, storage.path);
    
    return { success: true, appId: manifest.id };
  } catch (error) {
    console.error('Application installation failed:', error);
    return { success: false, error: error.message };
  }
}

// Launch application
async function launchApplication(appId) {
  try {
    // Get application info
    const app = getApplicationInfo(appId);
    
    // Request resources
    const resources = await CyberdeckOS.allocateResources(
      appId,
      app.resourceRequirements
    );
    
    // Create application iframe
    const iframe = createApplicationIframe(app);
    
    // Set up communication channel
    const channel = await CyberdeckOS.createChannel(`app:${appId}`, {
      encrypted: true,
      accessControl: [
        { origin: app.origin, permissions: ['read', 'write'] }
      ]
    });
    
    // Initialize application
    initializeApplication(iframe, app, channel);
    
    // Track running application
    trackRunningApplication(appId, iframe, channel, resources);
    
    return { success: true };
  } catch (error) {
    console.error('Application launch failed:', error);
    return { success: false, error: error.message };
  }
}

// Terminate application
async function terminateApplication(appId) {
  try {
    // Get running application
    const runningApp = getRunningApplication(appId);
    
    // Send termination signal
    await sendTerminationSignal(runningApp);
    
    // Remove application iframe
    removeApplicationIframe(runningApp.iframe);
    
    // Close communication channel
    await runningApp.channel.close();
    
    // Release resources
    await CyberdeckOS.releaseResources(appId);
    
    // Remove from running applications
    removeFromRunningApplications(appId);
    
    return { success: true };
  } catch (error) {
    console.error('Application termination failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Settings Management

Cyberdeck Launcher provides a settings interface for CyberdeckOS:

1. **System Settings**: Settings for CyberdeckOS
2. **Service Settings**: Settings for services
3. **Security Settings**: Settings for security features
4. **Resource Settings**: Settings for resource allocation

Example settings management:

```javascript
// Get system settings
const systemSettings = await CyberdeckOS.getSystemSettings();

// Update system settings
await CyberdeckOS.updateSystemSettings({
  hostname: 'cyberdeck-01',
  timezone: 'America/New_York',
  locale: 'en-US',
  autoUpdate: true
});

// Get service settings
const postgresSettings = await CyberdeckOS.getServiceSettings('postgres');

// Update service settings
await CyberdeckOS.updateServiceSettings('postgres', {
  maxConnections: 100,
  sharedBuffers: '256MB',
  workMem: '4MB'
});

// Get security settings
const securitySettings = await CyberdeckOS.getSecuritySettings();

// Update security settings
await CyberdeckOS.updateSecuritySettings({
  autoLock: true,
  lockTimeout: 300, // seconds
  requirePasswordOnWake: true,
  biometricAuth: true
});

// Get resource settings
const resourceSettings = await CyberdeckOS.getResourceSettings();

// Update resource settings
await CyberdeckOS.updateResourceSettings({
  cpuGovernor: 'performance',
  memoryLimit: '4GB',
  swapUsage: 'minimal',
  backgroundProcessPriority: 'low'
});
```

## API Reference

### CyberdeckOS API for Launcher

```typescript
interface CyberdeckOS {
  // Initialization
  initialize(): Promise<InitResult>;
  registerLauncher(info: LauncherInfo): Promise<RegisterResult>;
  
  // Service Management
  getAvailableServices(): Promise<string[]>;
  getServiceStatus(service: string): Promise<ServiceStatus>;
  startService(service: string, options?: ServiceOptions): Promise<StartResult>;
  stopService(service: string, options?: StopOptions): Promise<StopResult>;
  restartService(service: string, options?: RestartOptions): Promise<RestartResult>;
  configureService(service: string, config: any): Promise<ConfigureResult>;
  
  // Permission Management
  checkPermission(appId: string, permission: string): Promise<boolean>;
  grantPermission(appId: string, permission: string): Promise<string>;
  revokePermission(appId: string, permission: string): Promise<boolean>;
  getPermissions(appId: string): Promise<Permission[]>;
  
  // Resource Management
  setResourceRequirements(requirements: ResourceRequirements): Promise<ResourceAllocation>;
  allocateResources(appId: string, requirements: ResourceRequirements): Promise<ResourceAllocation>;
  releaseResources(appId: string): Promise<boolean>;
  getResourceUsage(): Promise<ResourceUsage>;
  
  // Storage Management
  allocateStorage(appId: string, size: number): Promise<StorageAllocation>;
  releaseStorage(appId: string): Promise<boolean>;
  getStorageUsage(appId?: string): Promise<StorageUsage>;
  
  // Communication
  createChannel(name: string, options?: ChannelOptions): Promise<Channel>;
  getChannel(name: string): Promise<Channel | null>;
  closeChannel(name: string): Promise<boolean>;
  
  // Application Management
  registerApplication(app: ApplicationInfo): Promise<RegisterResult>;
  unregisterApplication(appId: string): Promise<boolean>;
  getApplicationInfo(appId: string): Promise<ApplicationInfo | null>;
  
  // Settings Management
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean>;
  getServiceSettings(service: string): Promise<any>;
  updateServiceSettings(service: string, settings: any): Promise<boolean>;
  getSecuritySettings(): Promise<SecuritySettings>;
  updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<boolean>;
  getResourceSettings(): Promise<ResourceSettings>;
  updateResourceSettings(settings: Partial<ResourceSettings>): Promise<boolean>;
}

// Types
interface InitResult {
  status: 'initialized' | 'error';
  version: string;
  error?: string;
}

interface LauncherInfo {
  version: string;
  capabilities: string[];
  requirements: {
    memory: string;
    storage: string;
    services: string[];
  };
}

interface RegisterResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface ServiceStatus {
  running: boolean;
  health: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  metrics: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

interface ServiceOptions {
  port?: number;
  dataDir?: string;
  configFile?: string;
  [key: string]: any;
}

interface StopOptions {
  timeout?: number;
  force?: boolean;
}

interface RestartOptions {
  timeout?: number;
  force?: boolean;
}

interface StartResult {
  success: boolean;
  pid?: number;
  error?: string;
}

interface StopResult {
  success: boolean;
  error?: string;
}

interface RestartResult {
  success: boolean;
  pid?: number;
  error?: string;
}

interface ConfigureResult {
  success: boolean;
  error?: string;
}

interface Permission {
  permission: string;
  granted: boolean;
  token?: string;
  timestamp: number;
}

interface ResourceRequirements {
  cpu?: {
    priority?: 'low' | 'medium' | 'high';
    cores?: number;
  };
  memory?: {
    minimum: string;
    recommended: string;
  };
  storage?: {
    minimum: string;
    recommended: string;
  };
  network?: {
    priority?: 'low' | 'medium' | 'high';
    bandwidth?: string;
  };
}

interface ResourceAllocation {
  cpu: {
    cores: number;
    priority: number;
  };
  memory: {
    limit: string;
    guaranteed: string;
  };
  storage: {
    limit: string;
    path: string;
  };
  network: {
    bandwidth: string;
    priority: number;
  };
}

interface ResourceUsage {
  cpu: {
    total: number;
    byApp: { [appId: string]: number };
  };
  memory: {
    total: number;
    byApp: { [appId: string]: number };
  };
  storage: {
    total: number;
    byApp: { [appId: string]: number };
  };
  network: {
    total: number;
    byApp: { [appId: string]: number };
  };
}

interface StorageAllocation {
  path: string;
  size: number;
  available: number;
}

interface StorageUsage {
  total: number;
  used: number;
  available: number;
  byApp?: { [appId: string]: number };
}

interface ChannelOptions {
  encrypted?: boolean;
  persistent?: boolean;
  accessControl?: AccessControl[];
}

interface AccessControl {
  origin: string;
  permissions: ('read' | 'write')[];
}

interface Channel {
  name: string;
  publish(event: string, data: any): Promise<void>;
  subscribe(event: string, callback: (data: any) => void): Subscription;
  close(): Promise<boolean>;
}

interface Subscription {
  unsubscribe(): void;
  pause(): void;
  resume(): void;
}

interface ApplicationInfo {
  id: string;
  name: string;
  version: string;
  permissions: string[];
  storage: string;
  origin?: string;
}

interface SystemSettings {
  hostname: string;
  timezone: string;
  locale: string;
  autoUpdate: boolean;
  [key: string]: any;
}

interface SecuritySettings {
  autoLock: boolean;
  lockTimeout: number;
  requirePasswordOnWake: boolean;
  biometricAuth: boolean;
  [key: string]: any;
}

interface ResourceSettings {
  cpuGovernor: 'performance' | 'balanced' | 'powersave';
  memoryLimit: string;
  swapUsage: 'none' | 'minimal' | 'normal' | 'aggressive';
  backgroundProcessPriority: 'low' | 'normal' | 'high';
  [key: string]: any;
}
```

### Launcher API for Applications (jcule)

```typescript
interface jcule {
  // Core API
  initialize(): Promise<void>;
  getVersion(): string;
  
  // Permission API
  permissions: {
    request(permission: string): Promise<string | null>;
    check(permission: string): Promise<boolean>;
    getGranted(): Promise<string[]>;
  };
  
  // Service API
  service: {
    query(service: string, query: any, token?: string): Promise<any>;
    getStatus(service: string): Promise<ServiceStatus>;
    getAvailable(): Promise<string[]>;
  };
  
  // Storage API
  storage: {
    set(key: string, value: any, options?: StorageOptions): Promise<void>;
    get(key: string): Promise<any>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    getUsageStats(): Promise<StorageStats>;
    s3: {
      put(bucket: string, key: string, data: Blob): Promise<void>;
      get(bucket: string, key: string): Promise<Blob>;
      list(bucket: string, prefix?: string): Promise<S3Object[]>;
      delete(bucket: string, key: string): Promise<void>;
    };
  };
  
  // Communication API
  comlink: {
    publish(channel: string, message: any): Promise<void>;
    subscribe(channel: string, callback: (message: any) => void): Subscription;
    requestPermission(origin: string, channel: string): Promise<boolean>;
    createChannel(name: string, options?: ChannelOptions): Promise<Channel>;
    getAvailableChannels(): Promise<string[]>;
  };
  
  // Security API
  security: {
    authenticate(credentials: any): Promise<AuthResult>;
    generateToken(claims: any, expiration?: number): Promise<string>;
    verifyToken(token: string): Promise<any>;
    encrypt(data: any, options?: EncryptOptions): Promise<string>;
    decrypt(encryptedData: string): Promise<any>;
  };
  
  // Lifecycle API
  lifecycle: {
    onPause(callback: () => void): void;
    onResume(callback: () => void): void;
    onShutdown(callback: () => void): void;
    requestBackground(): Promise<boolean>;
  };
  
  // UI API
  ui: {
    showNotification(options: NotificationOptions): Promise<string>;
    requestFullscreen(): Promise<boolean>;
    exitFullscreen(): Promise<boolean>;
    isFullscreen(): boolean;
  };
}
```

## Implementation Considerations

### Browser Integration

CyberdeckOS integrates with the browser through:

1. **WASM Modules**: Core CyberdeckOS components compiled to WebAssembly
2. **JavaScript Bridge**: JavaScript API for browser integration
3. **Service Worker**: Background processing and offline support
4. **Extension API**: Browser extension for privileged operations

### Performance Optimization

Performance is optimized through:

1. **Lazy Loading**: Components load only when needed
2. **Efficient IPC**: Optimized inter-process communication
3. **Resource Pooling**: Shared resources for efficiency
4. **Background Processing**: Heavy processing in background threads
5. **Caching**: Intelligent caching of frequently accessed data

### Security Considerations

Security is ensured through:

1. **Origin Isolation**: Applications isolated by origin
2. **Content Security Policy**: Restrictions on script execution
3. **Permission Model**: Strict permission controls
4. **Secure Communication**: Encrypted channels for all communication
5. **Audit Logging**: Comprehensive logging of security-relevant actions

### Error Handling

Robust error handling includes:

1. **Graceful Degradation**: Fallbacks for failed operations
2. **Error Recovery**: Automatic recovery from errors
3. **User Feedback**: Clear error messages for users
4. **Logging**: Detailed error logging for debugging
5. **Crash Recovery**: Recovery from crashes without data loss

## Conclusion

The integration between CyberdeckOS and Cyberdeck Launcher creates a secure, efficient platform for running web applications. CyberdeckOS provides the privileged system layer, handling service management, resource allocation, and security, while Cyberdeck Launcher provides the user interface and application management.

This architecture enables web applications to access system resources securely, with strict permission controls and resource allocation. The well-defined API between CyberdeckOS and Cyberdeck Launcher ensures a clean separation of concerns while enabling seamless integration.

Developers can build applications that leverage the full power of the system through the jcule API, which provides a consistent interface to CyberdeckOS services and resources. Users benefit from a secure, efficient platform that protects their data while enabling rich web applications.
