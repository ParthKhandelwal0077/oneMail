import { GoogleGenAI } from '@google/genai';
import { EmailCategory } from '../types';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Valid categories
const VALID_CATEGORIES: EmailCategory[] = [
  'Interested',
  'Meeting Booked', 
  'Not Interested',
  'Spam',
  'Out of Office',
  'Uncategorized'
];

export interface CategorizationResult {
  category: EmailCategory;
}

/**
 * Categorize an email using Google's Gemini LLM API
 * @param subject Email subject
 * @param body Email body content
 * @param from Sender email address
 * @returns Promise<CategorizationResult>
 */
export async function categorizeEmail(
  subject: string, 
  body: string, 
  from?: string
): Promise<CategorizationResult> {
  try {
    // Truncate long content to avoid token limits
    const truncatedBody = body.substring(0, 4000);
    const truncatedSubject = subject.substring(0, 500);
    
    const prompt = `
Analyze the following email and categorize it into EXACTLY ONE of these categories:
- Interested: Shows genuine interest in products, services, or opportunities
- Meeting Booked: Confirms or schedules meetings, appointments, or calls
- Not Interested: Expresses disinterest, rejection, or decline
- Spam: Unsolicited promotional content, phishing attempts, or irrelevant messages
- Out of Office: Automatic replies, vacation notices, or unavailability messages

Guidelines:
- Consider the tone, content, and intent of the message
- Look for keywords and phrases that indicate the category
- Default to "Uncategorized" if unclear
- Respond with ONLY the category name, nothing else

Email Details:
From: ${from || 'Unknown'}
Subject: ${truncatedSubject}
Body: ${truncatedBody}
`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    const response = result.text?.trim() || '';
    
    // Validate and clean the response
    const category = validateCategory(response);
    
    // Calculate confidence based on response clarity
    
    
    return {
      category,
    };
    
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Fallback categorization based on simple heuristics
    const fallbackCategory = fallbackCategorization(subject, body, from);
    
    return {
      category: fallbackCategory,
    };
  }
}

/**
 * Validate that the AI response is one of the allowed categories
 */
function validateCategory(response: string): EmailCategory {
  // Clean and normalize the response
  const cleanResponse = response.toLowerCase().trim();
  
  // Check for exact matches
  for (const category of VALID_CATEGORIES) {
    if (cleanResponse === category.toLowerCase()) {
      return category;
    }
  }
  
  // Check for partial matches
  if (cleanResponse.includes('interested') && !cleanResponse.includes('not')) {
    return 'Interested';
  }
  if (cleanResponse.includes('meeting') || cleanResponse.includes('booked') || cleanResponse.includes('schedule')) {
    return 'Meeting Booked';
  }
  if (cleanResponse.includes('not interested') || cleanResponse.includes('decline') || cleanResponse.includes('reject')) {
    return 'Not Interested';
  }
  if (cleanResponse.includes('spam') || cleanResponse.includes('promotional') || cleanResponse.includes('unsubscribe')) {
    return 'Spam';
  }
  if (cleanResponse.includes('out of office') || cleanResponse.includes('vacation') || cleanResponse.includes('away')) {
    return 'Out of Office';
  }
  
  // Default to uncategorized
  console.warn(`Invalid category from Gemini: "${response}". Falling back to 'Uncategorized'.`);
  return 'Uncategorized';
}


/**
 * Fallback categorization using simple heuristics when AI fails
 */
function fallbackCategorization(subject: string, body: string, from?: string): EmailCategory {
  const content = `${subject} ${body}`.toLowerCase();
  
  // Spam indicators
  const spamKeywords = ['unsubscribe', 'promotional', 'offer', 'discount', 'limited time', 'act now'];
  if (spamKeywords.some(keyword => content.includes(keyword))) {
    return 'Spam';
  }
  
  // Out of office indicators
  const oooKeywords = ['out of office', 'vacation', 'away', 'automatic reply', 'auto-reply'];
  if (oooKeywords.some(keyword => content.includes(keyword))) {
    return 'Out of Office';
  }
  
  // Meeting indicators
  const meetingKeywords = ['meeting', 'call', 'schedule', 'appointment', 'booked', 'calendar'];
  if (meetingKeywords.some(keyword => content.includes(keyword))) {
    return 'Meeting Booked';
  }
  
  // Not interested indicators
  const notInterestedKeywords = ['not interested', 'decline', 'reject', 'no thank', 'pass'];
  if (notInterestedKeywords.some(keyword => content.includes(keyword))) {
    return 'Not Interested';
  }
  
  // Interested indicators
  const interestedKeywords = ['interested', 'yes', 'sounds good', 'let\'s do', 'count me in'];
  if (interestedKeywords.some(keyword => content.includes(keyword))) {
    return 'Interested';
  }
  
  // Default to uncategorized
  return 'Uncategorized';
}

/**
 * Batch categorize multiple emails
 */
export async function categorizeEmailsBatch(
  emails: Array<{ subject: string; body: string; from?: string; uid: string }>
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();
  
  // Process emails in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (email) => {
      try {
        const result = await categorizeEmail(email.subject, email.body, email.from);
        return { uid: email.uid, result };
      } catch (error) {
        console.error(`Failed to categorize email ${email.uid}:`, error);
        return {
          uid: email.uid,
          result: {
            category: 'Uncategorized' as EmailCategory
          }
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Add results to map
    batchResults.forEach(({ uid, result }) => {
      results.set(uid, result);
    });
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get category statistics for a user
 */
export function getCategoryStats(categories: EmailCategory[]): Record<EmailCategory, number> {
  const stats: Record<EmailCategory, number> = {
    'Interested': 0,
    'Meeting Booked': 0,
    'Not Interested': 0,
    'Spam': 0,
    'Out of Office': 0,
    'Uncategorized': 0
  };
  
  categories.forEach(category => {
    stats[category]++;
  });
  
  return stats;
}

/**
 * Check if Gemini API is properly configured
 */
export function isGeminiConfigured(): boolean {
    console.log(process.env.GEMINI_API_KEY);
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
}

/**
 * Get available categories
 */
export function getAvailableCategories(): EmailCategory[] {
  return [...VALID_CATEGORIES];
}
