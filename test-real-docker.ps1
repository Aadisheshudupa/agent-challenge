# Test script for real Docker integration with KubeLite agent
Write-Host "🧪 Testing KubeLite Agent with Real Docker Integration" -ForegroundColor Cyan

# Function to make API calls
function Test-KubeLiteAPI {
    param(
        [string]$Message,
        [string]$Endpoint = "/agents/kubelite-agent/sync"
    )
    
    Write-Host "`n📤 Testing: $Message" -ForegroundColor Yellow
    
    $body = @{
        messages = @(
            @{
                role = "user"
                content = $Message
            }
        )
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4000$Endpoint" -Method POST -Body $body -ContentType "application/json"
        Write-Host "✅ Response: $($response.choices[0].message.content)" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to check Docker containers
function Check-DockerContainers {
    Write-Host "`n🐳 Current Docker containers:" -ForegroundColor Cyan
    docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
    
    Write-Host "`n🏷️ KubeLite-managed containers:" -ForegroundColor Cyan
    docker ps --filter "label=kubelite.managed=true" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
}

# Wait for service to be ready
Write-Host "⏳ Waiting for KubeLite service to be ready..." -ForegroundColor Yellow
$timeout = 300 # 5 minutes
$start = Get-Date
do {
    Start-Sleep -Seconds 5
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
        if ($health) {
            Write-Host "✅ Service is ready!" -ForegroundColor Green
            break
        }
    } catch {
        $elapsed = (Get-Date) - $start
        if ($elapsed.TotalSeconds -gt $timeout) {
            Write-Host "❌ Timeout waiting for service" -ForegroundColor Red
            exit 1
        }
        Write-Host "Still waiting... $([int]$elapsed.TotalSeconds)s" -ForegroundColor Gray
    }
} while ($true)

# Initial container check
Check-DockerContainers

# Test 1: Deploy a container
Test-KubeLiteAPI "Deploy a nginx container called 'web-server'"

Start-Sleep -Seconds 5
Check-DockerContainers

# Test 2: List containers
Test-KubeLiteAPI "List all running containers"

# Test 3: Deploy another container
Test-KubeLiteAPI "Start a redis container named 'cache'"

Start-Sleep -Seconds 5
Check-DockerContainers

# Test 4: Get container logs
Test-KubeLiteAPI "Show me the logs for the nginx container"

# Test 5: Stop a container
Test-KubeLiteAPI "Stop the redis container"

Start-Sleep -Seconds 3
Check-DockerContainers

# Test 6: Clean up
Test-KubeLiteAPI "Stop all containers"

Start-Sleep -Seconds 3
Check-DockerContainers

Write-Host "`n🎉 Testing complete!" -ForegroundColor Green
