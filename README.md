[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Microsoft 365 Agents Toolkit](https://img.shields.io/badge/M365-Agents%20Toolkit-blue)](https://github.com/microsoft/teams-toolkit) [![Multi-AI](https://img.shields.io/badge/AI-Multi%20Provider-green)](#ai-providers) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) ![Local AI](https://camo.githubusercontent.com/68105c95bf7650461ac95a0cdb3212d2693fa865dd382d43ecc4e550cab49f84/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6f63616c2d414925323052656164792d6f72616e6765) [![Azure](https://camo.githubusercontent.com/756ce985aae9dc4956426398d69a171aeae6331f1d9db81b2187f420594e0683/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f417a7572652d3030373844343f6c6f676f3d6d6963726f736f66742d617a757265266c6f676f436f6c6f723d7768697465)](https://azure.microsoft.com/) [![OpenAI](https://camo.githubusercontent.com/35e05fc08cfea42506c862f13a6d7f1b057c50c02ca7688057e29002b8e4b648/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4f70656e41492d3431323939313f6c6f676f3d6f70656e6169266c6f676f436f6c6f723d7768697465)](https://openai.com/) [![Anthropic](https://camo.githubusercontent.com/62a1b34db891ee5c3b14b750da774ea431a5333a5fd9933d26b6e32d8b93d539/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f416e7468726f7069632d436c617564652d464636423335)](https://www.anthropic.com/) [![W&B](https://camo.githubusercontent.com/6b479ada7dc538fab3643365c695f77d0f454122c287609ee7f6ddfc2f52ef53/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f57253236422d57656176652d4646424530303f6c6f676f3d77656967687473616e64626961736573266c6f676f436f6c6f723d626c61636b)](https://wandb.ai/) [![Ollama](https://camo.githubusercontent.com/5d332d6d579d963a5249c399ae3f5a2066b367f3c73c34b58b2027f3c3c9d1db/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4f6c6c616d612d4c6f63616c25323041492d303030303030)](https://ollama.ai/) [![REST API](https://camo.githubusercontent.com/3a3fec3adb43d645289ac973fab140cd097957f54d0cf47f73cf72e63688bc61/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f524553542d4150492d303235363942)](http://localhost:3978/api)

**Muyal** is an enterprise-grade **intelligence hub** designed to unify your organization’s knowledge and AI capabilities into a **single source of truth** . Muyal is at its base [CEA](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/build-custom-engine-agents-in-ai-foundry-for-microsoft-365-copilot/4449623) (Microsoft Custom Engine Agent) and enables seamless integration across Microsoft 365, web platforms, and many other agent networks—delivering **context-aware, intelligent responses** wherever your users work.

At its core, Muyal combines **templated knowledge sources** with **infinite extensibility** , ensuring that new domains can be added effortlessly and instantly leveraged across all connected channels. With **Model Context Protocol (MCP)** support and **Agent-to-Agent (A2A)** communication, Muyal doesn’t just serve as a knowledge engine—it becomes the **central nervous system** of your AI ecosystem, powering collaboration between tools, agents, and people.

## 🐰 Why "Muyal"? (The Rabbit Story)
"Muyal" means "Rabbit" in Tamil language - and there's a delightful reason behind this choice!

Just like rabbits, this AI agent is:

* ⚡ Lightning Fast: Hops between AI providers faster than you can say "ChatGPT"
* 🔄 Multi-Platform: Jumps seamlessly from Teams to Web to Slack (like rabbits hopping between gardens)
* 🌱 Reproduces Quickly: One codebase, infinite platform adaptations (rabbits are known for... well, you know)
* 👂 Always Listening: Those big ears aren't just for show - ready to respond on any platform
* 🏠 Adaptable: Comfortable in any environment - cloud, local, enterprise, or your garage server
* 🥕 Loves Good Food: Feeds on quality prompts and delivers even better responses

Plus, "Muyal" sounds way cooler than "GenericAIBot2024" and definitely more professional than "RabbitGPT" 😄

**Fun Fact:** In Tamil folklore, rabbits are considered clever problem-solvers who find creative solutions - exactly what this AI agent does when routing between 6 different AI providers! 

## Features

* **Single Source of Truth**: One backend intelligence system that serves Microsoft 365, MCP clients, web interfaces, and agent networks
* **Automatic Knowledge Enhancement**: Contextually aware responses without manual commands or data lookup - built on the [Microsoft CEA pattern](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/build-custom-engine-agents-in-ai-foundry-for-microsoft-365-copilot/4449623)
* **Templated Knowledge Sources**: Copy-paste template system for adding new knowledge domains - each new source instantly works across all platforms
* **MCP Integration**: Native Model Context Protocol server that exposes capabilities to Claude Desktop, VS Code, and any MCP client
* **Agent-to-Agent (A2A)**: Automatic agent discovery, registration, and inter-agent communication for building intelligent networks
* **Universal Platform Support**: Same intelligence engine powers Teams, Web, Slack, Discord, APIs, and custom integrations
* **Conversation Memory**: Persistent chat history with smart reset commands ("new conversation", "start fresh")
* **Multi-AI Provider Support**: Switch between Azure OpenAI, OpenAI, Anthropic, Google AI, and local models
* **Enterprise Observability**: W&B Weave integration for logging metrics, visualizing model performance, and monitoring experiments in real time

## Special Feature: Intelligence Extension through Templated Knowledge Source

**The Problem**: Adding new knowledge to AI systems traditionally requires:
* Platform-specific integrations for each channel (Teams, Web, Slack, etc.)
* Custom API endpoints and authentication per knowledge source
* Separate configuration for different AI providers
* Manual updates across multiple systems

**The Solution:** Muyal makes adding *Your Knowledge Domain* easy by using templated ways of adding knowledge sources.
1. Copy `template-knowledge.ts`
2. Define relevance keywords/patterns
3. Connect to your data source (API, database, files)
4. Add helpful suggestions
5. Drop it into knowledge sources folder
6. **Result**: Instantly works across all platforms and agent networks

## What is Muyal? (Simple Explanation)

**Muyal is like having a super-smart AI assistant that learns about anything you teach it, then works across every app you use.** You can teach it about weather, sports, homework, gaming stats, crypto prices - literally any topic. Just connect it to websites, spreadsheets, or documents, and it automatically knows when to use that information. The magic? Add a new "knowledge source" in 5 minutes using copy-and-paste, and instantly it becomes smarter about that topic everywhere - Teams, websites, other AI tools, all at once.

**Even cooler: Muyal creates AI teams that work together.** Think "group chat for AI assistants" - Muyal connects specialized AI helpers (weather bot, sports bot, homework helper) so they share information and coordinate. Build your own AI for anything you care about (tracking concerts, school projects), and it automatically joins the network, talking and collaborating with Muyal and all other AI helpers.

## 🔧 Recent Updates & Latest Features

###  **Conversation Memory System** 
- **Persistent History**: All conversations automatically saved with full context across sessions
- **Smart Context**: AI remembers previous discussions to provide better responses
- **JSON Storage**: Conversations stored in `./data/conversations/` with metadata

###  **Smart Conversation Reset**
- **Natural Commands**: Type "new conversation", "start fresh", "clear chat", or "reset conversation" 
- **Clean Slate**: Instantly start with fresh context and clear knowledge source accumulation
- **UI Integration**: "Clear Chat" button properly resets conversation with new ID

###  **Enhanced Web Interface**
- **Markdown Support**: Images and formatting render properly in chat
- **Knowledge Sources Display**: See which sources enhanced each response
- **Improved UX**: Visual indicators and better conversation flow

###  **Development Environment Fixes**
- **Nodemon Configuration**: No more auto-restarts when writing conversation files
- **Stable Development**: Proper ignore patterns for data directories
- **Debug Logging**: Enhanced troubleshooting capabilities

##  Quick Start & Usage Examples

### **Employee Lookup Example:**
- **You ask**: "Who is John in marketing?"
- **Muyal**: Automatically queries employee database → "John Smith is a Marketing Manager in the Digital team, based in Seattle. Contact: john.smith@company.com"

### **Weather & Context:**
- **You ask**: "Should I bring an umbrella today?"
- **Muyal**: Checks weather API → "Yes! There's a 70% chance of rain in your area today with showers expected this afternoon."

### **Gaming Help:**
- **You ask**: "Best strategy for Margit in Elden Ring?"
- **Muyal**: Pulls from game wiki → "Margit is weak to bleed damage. Use Spirit Ash summons and attack his ankles. Key items: Margit's Shackle from Patches..."

### **Fun Content:**
- **You ask**: "Show me a cute dog"
- **Muyal**: Fetches from Dog API → Displays random dog image with breed information

### **Conversation Reset:**
- **You type**: "new conversation" 
- **Muyal**: " **Started a new conversation!** Your chat history has been cleared and we're starting fresh. How can I help you?"

##  Documentation

| Document | Purpose |
|----------|---------|
| **[SETUP_AND_USAGE.md](docs/SETUP_AND_USAGE.md)** | Installation, configuration, AI providers |
| **[CAPABILITIES.md](docs/CAPABILITIES.md)** | Functions, MCP integration, examples |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System design, extending knowledge sources |
| **[MCP_A2A_INTEGRATION.md](docs/MCP_A2A_INTEGRATION.md)** | Protocol details, agent networks |
| **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** | Common issues and solutions |

## Tech stack

* **Runtime**: Node.js + TypeScript with enterprise-grade error handling and observability
* **AI Providers**: Azure OpenAI, Azure AI Foundry, OpenAI, Anthropic Claude, Google AI, Ollama (local models)
* **Microsoft 365**: Teams Toolkit integration with Custom Engine Agent (CEA) pattern
* **MCP Protocol**: Native Model Context Protocol server for Claude Desktop, VS Code, and external integrations
* **A2A Network**: Agent discovery, registration, and inter-agent communication system
* **Observability**: W&B Weave tracing with cost tracking and performance analytics across all channels
* **Storage**: JSON-based conversation persistence with automatic cleanup
* **Development**: Nodemon with smart file watching, TypeScript compilation, hot reload

##  Contributing

[](https://github.com/ushakrishnan/muyal#-contributing)

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

##  License

[](https://github.com/ushakrishnan/muyal#-license)

This project is licensed under the MIT License - see the [LICENSE](https://github.com/ushakrishnan/Muyal/blob/master/LICENSE) file for details.

#  Muyal Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[SETUP_AND_USAGE.md](SETUP_AND_USAGE.md)** | Installation, configuration, AI providers | Getting started, changing providers |
| **[CAPABILITIES.md](CAPABILITIES.md)** | Functions, MCP integration, examples | Understanding what works now |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, knowledge sources | Technical understanding, extending |
| **[MCP_A2A_INTEGRATION.md](MCP_A2A_INTEGRATION.md)** | Protocol details, agent networks | Building integrations |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Common issues and solutions | When things don't work |

## Start Here

1. **First time?** → [SETUP_AND_USAGE.md](SETUP_AND_USAGE.md)
2. **Want to see what it can do?** → [CAPABILITIES.md](CAPABILITIES.md)
3. **Building extensions?** → [ARCHITECTURE.md](ARCHITECTURE.md)
4. **Problems?** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

##  Support

*  Check the [Setup Guide](docs/SETUP_AND_USAGE.md) for installation help
*  View [Current Capabilities](docs/CAPABILITIES.md) for function reference
*  Create an issue for bugs or feature requests

---

**Ready to get started?** Let's go!! 🚀
