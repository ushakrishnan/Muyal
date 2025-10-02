/**
 * Dog Knowledge Source
 * Provides dog images and breed information from Dog CEO API
 */

import { KnowledgeSource } from '../knowledge-library';

// Fallback dog data when API is unavailable
const getFallbackDogData = (): string => {
  return `Dog image service temporarily unavailable.

POPULAR DOG BREEDS (Fallback):
- Golden Retriever: Friendly, intelligent, devoted
- Labrador: Outgoing, active, loyal
- German Shepherd: Confident, courageous, smart
- Bulldog: Calm, courageous, friendly
- Poodle: Intelligent, active, elegant
- Beagle: Friendly, curious, merry
- Rottweiler: Loyal, loving, confident guardian
- Yorkshire Terrier: Affectionate, sprightly, tomboyish

Note: Dog images and live breed data temporarily unavailable.
Please try again in a few moments for random dog pictures and breed information.`;
};

export const dogKnowledgeSource: KnowledgeSource = {
  id: 'dogs',
  name: 'Dog Image & Breed Database',
  description: 'Random dog images and comprehensive breed information from Dog CEO API',
  keywords: ['dog', 'puppy', 'breed', 'canine', 'pet', 'animal', 'cute', 'furry', 'woof', 'bark', 'fetch'],
  priority: 70,
  isEnabled: true,

  isRelevant: (message: string): boolean => {
    const dogKeywords = [
      'dog', 'puppy', 'pup', 'canine', 'breed', 'pet', 'animal', 'cute', 'furry',
      'woof', 'bark', 'fetch', 'tail', 'paws', 'golden retriever', 'labrador',
      'german shepherd', 'bulldog', 'poodle', 'beagle', 'show me', 'picture',
      'image', 'photo', 'random dog', 'dog picture'
    ];
    const lowerMessage = message.toLowerCase();
    return dogKeywords.some(keyword => lowerMessage.includes(keyword));
  },

  fetchContext: async (): Promise<string> => {
    // Retry logic for handling rate limits
    const maxRetries = 2;
    const baseDelay = 500; // 0.5 second
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Fetch both random image and breeds list in parallel
        const [imageResponse, breedsResponse] = await Promise.all([
          fetch('https://dog.ceo/api/breeds/image/random'),
          fetch('https://dog.ceo/api/breeds/list/all')
        ]);
        
        if (imageResponse.status === 429 || breedsResponse.status === 429) {
          // Rate limited - wait before retry
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(`Dog API rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // All retries exhausted, return fallback data
            console.warn('Dog API rate limited, using fallback data');
            return getFallbackDogData();
          }
        }
        
        if (!imageResponse.ok || !breedsResponse.ok) {
          throw new Error(`HTTP ${imageResponse.status} / ${breedsResponse.status}`);
        }
        
        const imageData = await imageResponse.json();
        const breedsData = await breedsResponse.json();
        
        if (imageData.status !== 'success' || breedsData.status !== 'success') {
          return getFallbackDogData();
        }

        const randomImageUrl = imageData.message;
        const breeds = breedsData.message;
        const breedNames = Object.keys(breeds);
        const totalBreeds = breedNames.length;
        
        // Extract breed info from the random image URL if possible
        const imageBreed = extractBreedFromUrl(randomImageUrl);
        
        // Get random sample of breeds for display
        const sampleBreeds = getRandomSampleBreeds(breeds, 8);
        
        return `🐕 DOG IMAGE & BREED INFORMATION

RANDOM DOG IMAGE:
![Random Dog${imageBreed ? ` - ${imageBreed}` : ''}](${randomImageUrl})
${imageBreed ? `🏷️ Detected Breed: ${imageBreed}` : ''}

BREED DATABASE:
🐾 Total Breeds Available: ${totalBreeds}

SAMPLE BREEDS:
${sampleBreeds.map(breed => `- ${breed.name}${breed.subBreeds.length > 0 ? ` (${breed.subBreeds.join(', ')})` : ''}`).join('\n')}

POPULAR CATEGORIES:
- Working Dogs: German Shepherd, Rottweiler, Doberman
- Sporting Dogs: Golden Retriever, Labrador, Pointer
- Toy Dogs: Chihuahua, Pomeranian, Maltese
- Herding Dogs: Border Collie, Australian Shepherd
- Hounds: Beagle, Bloodhound, Greyhound

💡 Tip: Ask for "show me a random dog" or "tell me about [breed name]" for more images and breed-specific information!`;
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn('Failed to fetch dog data after retries:', error);
          return getFallbackDogData();
        }
        // Continue to next retry attempt
      }
    }
    
    return getFallbackDogData();
  },

  getSuggestions: (): string[] => [
    "Show me a random dog picture",
    "Tell me about different dog breeds", 
    "What are popular dog breeds?",
    "Show me working dog breeds",
    "Find pictures of golden retrievers",
    "What are toy dog breeds?",
    "Show me herding dog breeds",
    "Tell me about guard dogs"
  ]
};

// Helper function to extract breed from image URL
function extractBreedFromUrl(url: string): string | null {
  try {
    const match = url.match(/breeds\/([^\/]+)/);
    if (match) {
      const breedPart = match[1];
      // Handle sub-breeds (e.g., "cattledog-australian" -> "Australian Cattle Dog")
      if (breedPart.includes('-')) {
        const parts = breedPart.split('-');
        return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).reverse().join(' ');
      } else {
        return breedPart.charAt(0).toUpperCase() + breedPart.slice(1);
      }
    }
  } catch (error) {
    console.warn('Error extracting breed from URL:', error);
  }
  return null;
}

// Helper function to get random sample of breeds
function getRandomSampleBreeds(breeds: any, count: number): Array<{name: string, subBreeds: string[]}> {
  const breedEntries = Object.entries(breeds);
  const shuffled = breedEntries.sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).map(([breed, subBreeds]) => ({
    name: breed.charAt(0).toUpperCase() + breed.slice(1),
    subBreeds: (subBreeds as string[]).map(sub => 
      sub.charAt(0).toUpperCase() + sub.slice(1)
    )
  }));
}