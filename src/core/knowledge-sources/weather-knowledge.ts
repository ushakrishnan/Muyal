/**
 * Weather Knowledge Source
 * Provides weather information and related suggestions
 */

import { KnowledgeSource } from '../knowledge-library';

export const weatherKnowledgeSource: KnowledgeSource = {
  id: 'weather',
  name: 'Weather Information',
  description: 'Current weather conditions and forecasts',
  keywords: ['weather', 'temperature', 'rain', 'snow', 'forecast', 'climate', 'sunny', 'cloudy', 'storm'],
  priority: 50,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const weatherKeywords = [
      'weather', 'temperature', 'rain', 'snow', 'forecast', 'climate',
      'sunny', 'cloudy', 'storm', 'wind', 'humidity', 'precipitation',
      'hot', 'cold', 'warm', 'cool', 'degrees', 'celsius', 'fahrenheit',
      'umbrella', 'jacket', 'outside', 'outdoor'
    ];
    return weatherKeywords.some(keyword => message.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    // Note: This is a placeholder - in production you'd use a real weather API
    // like OpenWeatherMap, WeatherAPI, etc.
    try {
      // Simulated weather data
      const weatherData = {
        location: 'Seattle, WA',
        current: {
          temperature: 52,
          condition: 'Partly Cloudy',
          humidity: 68,
          windSpeed: 8,
          precipitation: 0
        },
        forecast: [
          { day: 'Today', high: 58, low: 45, condition: 'Partly Cloudy', rain: 20 },
          { day: 'Tomorrow', high: 61, low: 48, condition: 'Sunny', rain: 5 },
          { day: 'Wednesday', high: 55, low: 42, condition: 'Rainy', rain: 80 }
        ]
      };

      return `CURRENT WEATHER (${weatherData.location}):
Temperature: ${weatherData.current.temperature}°F
Conditions: ${weatherData.current.condition}
Humidity: ${weatherData.current.humidity}%
Wind: ${weatherData.current.windSpeed} mph
Precipitation: ${weatherData.current.precipitation}%

3-DAY FORECAST:
${weatherData.forecast.map(day => 
  `${day.day}: ${day.high}°/${day.low}°F, ${day.condition} (${day.rain}% rain)`
).join('\n')}

RECOMMENDATIONS:
- ${weatherData.current.temperature < 60 ? 'Light jacket recommended' : 'Comfortable outdoor weather'}
- ${weatherData.forecast[0].rain > 50 ? 'Umbrella suggested for later today' : 'No rain gear needed today'}
- ${weatherData.current.condition.includes('Sunny') ? 'Great day for outdoor activities' : 'Indoor activities might be preferable'}`;
    } catch (error) {
      console.warn('Failed to fetch weather data:', error);
      return 'Weather information temporarily unavailable. Try using get_weather function for current conditions.';
    }
  },

  getSuggestions: (): string[] => [
    "Check current weather conditions",
    "Get 3-day weather forecast",
    "Ask for clothing recommendations based on weather",
    "Find out if it's good weather for outdoor activities",
    "Check if rain is expected today",
    "Get wind and humidity information",
    "Use get_weather function for specific location weather",
    "Plan activities based on weather forecast"
  ]
};