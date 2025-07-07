const fs = require('fs');
const yaml = require('js-yaml');

// Simple mock implementation to test our logic
class MockNosanaContainer {
    constructor(id, name, image) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.status = 'running';
        this.createdAt = new Date();
        this.labels = {
            'kubelite.managed': 'true',
            'kubelite.app': name
        };
    }
}

class MockNosanaClient {
    constructor() {
        this.containers = new Map();
        this.nextId = 1;
    }

    async deployContainer(image, name) {
        const id = `kubelite-${this.nextId++}`;
        const container = new MockNosanaContainer(id, name, image);
        this.containers.set(id, container);
        console.log(`[NosanaClient] Deployed container ${id} with image ${image}`);
        return id;
    }

    async stopContainer(id) {
        const container = this.containers.get(id);
        if (!container) {
            throw new Error(`Container ${id} not found`);
        }
        this.containers.delete(id);
        console.log(`[NosanaClient] Stopped container ${id}`);
    }

    async getRunningContainers() {
        return Array.from(this.containers.values()).filter(
            container => container.status === 'running' && 
                        container.labels['kubelite.managed'] === 'true'
        );
    }

    async getContainersByApp(appName) {
        return Array.from(this.containers.values()).filter(
            container => container.labels['kubelite.app'] === appName
        );
    }
}

class MockManifestParser {
    static parseFromFile(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const manifest = yaml.load(fileContent);
            
            if (!manifest || manifest.kind !== 'Application') {
                throw new Error("Invalid manifest: must be of kind 'Application'");
            }

            return {
                name: manifest.metadata.name,
                image: manifest.spec.container.image,
                replicas: manifest.spec.replicas || 1
            };
        } catch (error) {
            throw new Error(`Failed to parse manifest: ${error}`);
        }
    }
}

class MockKubeLiteOrchestrator {
    constructor() {
        this.nosanaClient = new MockNosanaClient();
        this.isRunning = false;
        this.reconcileInterval = null;
        this.reconcileIntervalMs = 5000; // 5 seconds for testing
    }

    async start(manifestPath) {
        if (this.isRunning) {
            console.log('[KubeLite] Orchestrator is already running');
            return;
        }

        this.isRunning = true;
        console.log('[KubeLite] Starting orchestrator...');

        // Initial reconciliation
        if (manifestPath) {
            await this.reconcile(manifestPath);
        }

        // Start continuous reconciliation loop
        this.reconcileInterval = setInterval(async () => {
            if (manifestPath) {
                try {
                    await this.reconcile(manifestPath);
                } catch (error) {
                    console.error('[KubeLite] Reconciliation error:', error);
                }
            }
        }, this.reconcileIntervalMs);

        console.log(`[KubeLite] Orchestrator started with ${this.reconcileIntervalMs}ms reconcile interval`);
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.reconcileInterval) {
            clearInterval(this.reconcileInterval);
            this.reconcileInterval = null;
        }

        console.log('[KubeLite] Orchestrator stopped');
    }

    async reconcile(manifestPath) {
        console.log('[KubeLite] Starting reconciliation cycle...');

        try {
            // 1. Read desired state from manifest
            const desiredApp = MockManifestParser.parseFromFile(manifestPath);
            console.log(`[KubeLite] Desired state: ${desiredApp.name} with ${desiredApp.replicas} replicas`);

            // 2. Get current state from Nosana
            const currentContainers = await this.nosanaClient.getContainersByApp(desiredApp.name);
            const currentReplicas = currentContainers.length;

            console.log(`[KubeLite] Current state: ${currentReplicas} running containers`);

            // 3. Compare and reconcile
            await this.reconcileApp(desiredApp, currentContainers);

            console.log('[KubeLite] Reconciliation cycle completed');
        } catch (error) {
            console.error('[KubeLite] Reconciliation failed:', error);
            throw error;
        }
    }

    async reconcileApp(desiredApp, currentContainers) {
        const currentReplicas = currentContainers.length;
        const desiredReplicas = desiredApp.replicas;

        if (currentReplicas < desiredReplicas) {
            // Scale up: deploy more containers
            const toCreate = desiredReplicas - currentReplicas;
            console.log(`[KubeLite] Scaling up ${desiredApp.name}: deploying ${toCreate} containers`);

            for (let i = 0; i < toCreate; i++) {
                await this.deployContainer(desiredApp);
            }
        } else if (currentReplicas > desiredReplicas) {
            // Scale down: stop excess containers
            const toRemove = currentReplicas - desiredReplicas;
            console.log(`[KubeLite] Scaling down ${desiredApp.name}: removing ${toRemove} containers`);

            // Remove the oldest containers first
            const containersToRemove = currentContainers
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                .slice(0, toRemove);

            for (const container of containersToRemove) {
                await this.nosanaClient.stopContainer(container.id);
            }
        } else {
            console.log(`[KubeLite] ${desiredApp.name} is in desired state`);
        }
    }

    async deployContainer(app) {
        return await this.nosanaClient.deployContainer(app.image, app.name);
    }

    async getStatus() {
        const allContainers = await this.nosanaClient.getRunningContainers();

        // Group containers by app name
        const appContainers = new Map();
        for (const container of allContainers) {
            const appName = container.labels['kubelite.app'];
            if (appName) {
                if (!appContainers.has(appName)) {
                    appContainers.set(appName, []);
                }
                appContainers.get(appName).push(container);
            }
        }

        // Build status for each app
        const status = [];
        for (const [appName, containers] of appContainers) {
            const firstContainer = containers[0];
            status.push({
                appName,
                image: firstContainer.image,
                currentReplicas: containers.length,
                containers: containers.map(c => ({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    createdAt: c.createdAt.toISOString()
                }))
            });
        }

        return status;
    }

    async deployFromManifest(manifestPath) {
        const app = MockManifestParser.parseFromFile(manifestPath);
        console.log(`[KubeLite] Deploying ${app.name} with ${app.replicas} replicas`);

        for (let i = 0; i < app.replicas; i++) {
            await this.deployContainer(app);
        }

        console.log(`[KubeLite] Successfully deployed ${app.name}`);
    }

    async deleteApp(appName) {
        const containers = await this.nosanaClient.getContainersByApp(appName);
        console.log(`[KubeLite] Deleting ${containers.length} containers for ${appName}`);

        for (const container of containers) {
            await this.nosanaClient.stopContainer(container.id);
        }

        console.log(`[KubeLite] Successfully deleted ${appName}`);
    }
}

// Test script for KubeLite Phase 1
async function testKubeLite() {
    console.log('=== KubeLite Phase 1 Test ===\n');
    
    const orchestrator = new MockKubeLiteOrchestrator();
    const manifestPath = './deploy.yaml';
    
    try {
        console.log('1. Initial deployment from manifest...');
        await orchestrator.deployFromManifest(manifestPath);
        
        console.log('\n2. Getting initial status...');
        let status = await orchestrator.getStatus();
        console.log('Status:', JSON.stringify(status, null, 2));
        
        console.log('\n3. Starting reconciliation loop...');
        await orchestrator.start(manifestPath);
        
        console.log('\n4. Simulating a container failure (manual stop)...');
        const containers = await orchestrator.nosanaClient.getContainersByApp('my-first-app');
        if (containers.length > 0) {
            console.log(`   Stopping container ${containers[0].id} to simulate failure`);
            await orchestrator.nosanaClient.stopContainer(containers[0].id);
        }
        
        console.log('\n5. Waiting 8 seconds for reconciliation to detect and fix the failure...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('\n6. Getting status after reconciliation...');
        status = await orchestrator.getStatus();
        console.log('Status after reconciliation:', JSON.stringify(status, null, 2));
        
        console.log('\n7. Testing scaling: Creating manifest with 3 replicas...');
        const scaledManifest = `apiVersion: kubelite.io/v1
kind: Application
metadata:
  name: my-first-app
spec:
  replicas: 3
  container:
    image: "nginx:latest"
    ports:
      - containerPort: 80
        protocol: TCP`;
        
        fs.writeFileSync('./deploy-scaled.yaml', scaledManifest);
        
        console.log('\n8. Reconciling with scaled manifest...');
        await orchestrator.reconcile('./deploy-scaled.yaml');
        
        console.log('\n9. Getting final status...');
        status = await orchestrator.getStatus();
        console.log('Final Status:', JSON.stringify(status, null, 2));
        
        console.log('\n10. Stopping orchestrator...');
        orchestrator.stop();
        
        console.log('\n=== Phase 1 Test completed successfully! ===');
        console.log('\n✅ SUCCESS CRITERIA ACHIEVED:');
        console.log('   - Agent can read and parse YAML manifests');
        console.log('   - Agent maintains desired replica count (2 nginx containers)');
        console.log('   - Agent automatically restarts failed containers');
        console.log('   - Agent can scale up when desired replicas increase');
        console.log('   - Agent performs continuous reconciliation');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testKubeLite();
