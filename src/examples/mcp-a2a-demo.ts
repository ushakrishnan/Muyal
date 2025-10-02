import { integratedServer } from '../integrations/mcp-a2a-integration.js';

async function demonstrateMCPandA2A() {
  try {
    // Initialize the integrated server
    await integratedServer.initialize();

    console.log('\n🎯 MCP & A2A Integration Demo\n');

    // 1. Register a custom function
    integratedServer.registerFunction({
      name: 'get_weather',
      description: 'Get weather information for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for',
          },
          units: {
            type: 'string',
            description: 'Temperature units (celsius/fahrenheit)',
            default: 'celsius',
          },
        },
        required: ['location'],
      },
      handler: async (args) => {
        // Mock weather data
        return {
          location: args.location,
          temperature: 22,
          units: args.units || 'celsius',
          condition: 'sunny',
          humidity: 65,
          forecast: 'Clear skies expected for the rest of the day',
        };
      },
    });

    // 2. Register another agent (simulated)
    integratedServer.registerAgent({
      id: 'calendar-agent',
      name: 'Calendar Agent',
      description: 'Manages calendar events and scheduling',
      capabilities: ['schedule_meeting', 'get_availability', 'list_events'],
      endpoint: 'http://localhost:4000/calendar-agent',
    });

    integratedServer.registerAgent({
      id: 'email-agent',
      name: 'Email Agent', 
      description: 'Handles email operations',
      capabilities: ['send_email', 'read_inbox', 'search_emails'],
      endpoint: 'http://localhost:4001/email-agent',
    });

    // 3. Test function calling
    console.log('📞 Testing function calling:');
    const unifiedServer = integratedServer.getUnifiedServer();
    
    const weatherResult = await unifiedServer.callFunction('get_weather', {
      location: 'San Francisco',
      units: 'fahrenheit',
    });
    console.log('Weather result:', weatherResult);

    const healthResult = await unifiedServer.callFunction('health', { detailed: true });
    console.log('Health result:', healthResult);

    // 4. Test A2A communication
    console.log('\n🤝 Testing A2A communication:');
    
    const agentListResult = await unifiedServer.callFunction('list_agents', {});
    console.log('Registered agents:', agentListResult.length);

    // Try to call another agent (this will show how it would work)
    try {
      const calendarResult = await unifiedServer.callFunction('call_agent', {
        agentId: 'calendar-agent',
        capability: 'get_availability',
        payload: { date: '2024-12-10', timeZone: 'PST' },
      });
      console.log('Calendar agent result:', calendarResult);
    } catch (error) {
      console.log('Calendar agent call failed (expected):', (error as Error).message);
    }

    // 5. Test broadcasting
    const broadcastResult = await unifiedServer.callFunction('broadcast', {
      capability: 'status_check',
      payload: { requestId: 'demo-123', timestamp: new Date().toISOString() },
    });
    console.log('Broadcast result:', broadcastResult);

    console.log('\n✅ MCP & A2A integration is working! You can now:');
    console.log('  - Call any registered function via MCP protocol');
    console.log('  - Register and communicate with other agents');
    console.log('  - Use the chat function for AI conversations');
    console.log('  - Monitor health and switch providers');
    console.log('  - Add custom functions and capabilities');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

export { demonstrateMCPandA2A };

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateMCPandA2A();
}