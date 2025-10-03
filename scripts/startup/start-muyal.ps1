# Muyal Custom Engine Agent (CEA) Startup Script
# Starts CEA services with optional MCP and A2A capabilities
#
# Parameters:
#   -SkipCleanup : Skip killing existing node processes
#   -Verbose     : Enable verbose logging
#   -NoBrowser   : Skip automatic browser opening
#   -EnableMCP   : Start MCP (Model Context Protocol) server
#   -EnableA2A   : Start A2A (Agent-to-Agent) communication
#
# Examples:
#   .\start-muyal.ps1                        # Start basic CEA
#   .\start-muyal.ps1 -EnableMCP             # Start CEA with MCP server
#   .\start-muyal.ps1 -EnableMCP -EnableA2A  # Start full CEA with MCP and A2A
#   .\start-muyal.ps1 -NoBrowser             # Start without browser opening

param(
    [switch]$SkipCleanup,
    [switch]$Verbose,
    [switch]$NoBrowser,
    [switch]$EnableMCP,
    [switch]$EnableA2A
)

Write-Host "Starting Muyal Custom Engine Agent (CEA)..." -ForegroundColor Green

if ($EnableMCP) {
    Write-Host "  + MCP (Model Context Protocol) Server enabled" -ForegroundColor Cyan
}
if ($EnableA2A) {
    Write-Host "  + A2A (Agent-to-Agent) Communication enabled" -ForegroundColor Cyan
}

# Cleanup existing node processes
if (-not $SkipCleanup) {
    Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Validate config file exists
if (-not (Test-Path ".\.env")) {
    Write-Host "ERROR: Configuration file .env not found!" -ForegroundColor Red
    Write-Host "Please ensure your Azure OpenAI credentials are configured in .env file." -ForegroundColor Yellow
    Write-Host "See CONFIGURATION.md for setup instructions." -ForegroundColor Yellow
    exit 1
}

# Check if at least one AI provider is configured in .env
$envContent = Get-Content ".\.env" -Raw
$hasProvider = $false

# Check for any configured AI provider
if ($envContent -match "AZURE_OPENAI_API_KEY=.+" -and $envContent -match "AZURE_OPENAI_ENDPOINT=.+") {
    $hasProvider = $true
    Write-Host "Azure OpenAI provider configured" -ForegroundColor Green
}
if ($envContent -match "OPENAI_API_KEY=sk-.+") {
    $hasProvider = $true
    Write-Host "OpenAI provider configured" -ForegroundColor Green
}
if ($envContent -match "ANTHROPIC_API_KEY=sk-ant-.+") {
    $hasProvider = $true
    Write-Host "Anthropic provider configured" -ForegroundColor Green
}
if ($envContent -match "GOOGLE_AI_API_KEY=.+") {
    $hasProvider = $true
    Write-Host "Google AI provider configured" -ForegroundColor Green
}
if ($envContent -match "OLLAMA_ENABLED=true") {
    $hasProvider = $true
    Write-Host "Ollama (Local AI) provider configured" -ForegroundColor Green
}

if (-not $hasProvider) {
    Write-Host "ERROR: No AI providers configured in .env file!" -ForegroundColor Red
    Write-Host "Please configure at least one AI provider:" -ForegroundColor Yellow
    Write-Host "- AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT (recommended)" -ForegroundColor Yellow
    Write-Host "- OPENAI_API_KEY (OpenAI)" -ForegroundColor Yellow
    Write-Host "- ANTHROPIC_API_KEY (Claude)" -ForegroundColor Yellow
    Write-Host "- GOOGLE_AI_API_KEY (Gemini)" -ForegroundColor Yellow
    Write-Host "- OLLAMA_ENABLED=true (Local AI)" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "See .env.example for template or docs/SETUP_AND_USAGE.md for help" -ForegroundColor Cyan
    exit 1
}

Write-Host "Starting playground..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:teamsfx:launch-playground"

Write-Host "Waiting for playground to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Starting agent..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:teamsfx:playground"

# Start MCP server if enabled
if ($EnableMCP) {
    Write-Host "Starting MCP server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run mcp:server"
    Start-Sleep -Seconds 2
}

# Start A2A server if enabled
if ($EnableA2A) {
    Write-Host "Starting A2A communication..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run a2a:server"
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "SUCCESS! Custom Engine Agent (CEA) services started:" -ForegroundColor Green
Write-Host "  * Microsoft 365 Playground: http://localhost:56150 (Teams testing)" -ForegroundColor White
Write-Host "  * Web Chat Interface: http://localhost:3978 (Direct web chat)" -ForegroundColor White
Write-Host "  * Agent API: Running on port 3978" -ForegroundColor Cyan
if ($EnableMCP) {
    Write-Host "  * MCP Server: Running on stdio (for external MCP clients)" -ForegroundColor Green
}
if ($EnableA2A) {
    Write-Host "  * A2A Communication: Active (agent discovery enabled)" -ForegroundColor Green
}
Write-Host ""

if (-not $NoBrowser) {
    Write-Host "Waiting for services to start up..." -ForegroundColor Yellow
    Write-Host "Playground will auto-open. Opening web interface in 15 seconds..." -ForegroundColor Cyan
    Start-Sleep -Seconds 15

    Write-Host "Opening Web Chat Interface..." -ForegroundColor Green  
    Start-Process "http://localhost:3978"

    Write-Host ""
    Write-Host "SUCCESS! Both interfaces available!" -ForegroundColor Green
    Write-Host "  * Playground: Auto-opened by service" -ForegroundColor White
    Write-Host "  * Web Interface: Just opened" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "SUCCESS! All services started!" -ForegroundColor Green
    Write-Host "NOTE: Playground auto-opens even with -NoBrowser. Use -NoBrowser to skip web interface only." -ForegroundColor Gray
}

Write-Host "Available interfaces:" -ForegroundColor Cyan
Write-Host "  * Microsoft 365 Playground: http://localhost:56150 (Teams app testing)" -ForegroundColor White
Write-Host "  * Web Chat Interface: http://localhost:3978 (Direct web chat)" -ForegroundColor White
if ($EnableMCP) {
    Write-Host "  * MCP Server: Available for Claude Desktop, VS Code, and other MCP clients" -ForegroundColor Green
}
if ($EnableA2A) {
    Write-Host "  * A2A Network: Agent discovery and inter-agent communication active" -ForegroundColor Green
}
Write-Host ""
Write-Host "TIP: If pages don't load immediately, wait a moment for services to fully start" -ForegroundColor Yellow
Write-Host ""
if ($EnableMCP -or $EnableA2A) {
    Write-Host "To test MCP/A2A: npm run test:mcp" -ForegroundColor Cyan
    Write-Host ""
}
Write-Host "To stop: Close all PowerShell windows or press Ctrl+C in each" -ForegroundColor Gray