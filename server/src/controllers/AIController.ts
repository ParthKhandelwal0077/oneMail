import { Request, Response } from 'express';
import { 
  categorizeEmail, 
  categorizeEmailsBatch, 
  getAvailableCategories,
  isGeminiConfigured,
  getCategoryStats
} from '../services/aiCategorizationService';
import { searchEmails } from '../services/elasticsearchService';
import { asyncHandler } from '../middleware/errorHandler';

export class AIController {
  // Categorize a single email
    categorizeEmail = asyncHandler(async (req: Request, res: Response) => {
    const { subject, body, from } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Subject and body are required for categorization'
      });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI categorization service not configured',
        message: 'Please set GEMINI_API_KEY in environment variables'
      });
    }

    try {
      const result = await categorizeEmail(subject, body, from);
      
      res.status(200).json({
        success: true,
        data: {
          category: result.category,
        }
      });
    } catch (error) {
      console.error('Categorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to categorize email',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Batch categorize multiple emails
  categorizeEmailsBatch = asyncHandler(async (req: Request, res: Response) => {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Emails array is required and must not be empty'
      });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI categorization service not configured',
        message: 'Please set GEMINI_API_KEY in environment variables'
      });
    }

    try {
      const results = await categorizeEmailsBatch(emails);
      
      res.status(200).json({
        success: true,
        data: {
          results: Array.from(results.entries()).map(([uid, result]) => ({
            uid,
            category: result.category,
          })),
          total: results.size
        }
      });
    } catch (error) {
      console.error('Batch categorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to categorize emails',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Recategorize all emails for a user
  recategorizeUserEmails = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { limit = '100' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI categorization service not configured',
        message: 'Please set GEMINI_API_KEY in environment variables'
      });
    }

    try {
      // Get uncategorized emails first
      const uncategorizedEmails = await searchEmails(userId, { 
        category: 'Uncategorized' 
      });
      
      const limitNum = parseInt(limit as string);
      const emailsToProcess = uncategorizedEmails.slice(0, limitNum);
      
      if (emailsToProcess.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No uncategorized emails found',
          data: {
            processed: 0,
            results: []
          }
        });
      }

      // Prepare emails for batch categorization
      const emailsForCategorization = emailsToProcess.map(email => ({
        uid: email.uid,
        subject: email.subject,
        body: email.body,
        from: email.from
      }));

      const results = await categorizeEmailsBatch(emailsForCategorization);
      
      res.status(200).json({
        success: true,
        message: `Recategorized ${results.size} emails`,
        data: {
          processed: results.size,
          results: Array.from(results.entries()).map(([uid, result]) => ({
            uid,
            category: result.category,
          }))
        }
      });
    } catch (error) {
      console.error('Recategorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to recategorize emails',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get available categories
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    try {
      const categories = getAvailableCategories();
      
      res.status(200).json({
        success: true,
        data: {
          categories,
          count: categories.length,
          configured: isGeminiConfigured()
        }
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get category statistics for a user
  getCategoryStats = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      // Get all emails for the user
      const emails = await searchEmails(userId, {});
      
      // Extract categories
      const categories = emails.map(email => email.category).filter(Boolean);
      
      // Calculate stats
      const stats = getCategoryStats(categories);
      
      res.status(200).json({
        success: true,
        data: {
          stats,
          total: categories.length,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get category stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get category statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Check AI service status
  getServiceStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      const configured = isGeminiConfigured();
      
      res.status(200).json({
        success: true,
        data: {
          configured,
          service: 'Google Gemini AI',
          model: 'gemini-1.5-flash',
          categories: getAvailableCategories(),
          status: configured ? 'ready' : 'not_configured'
        }
      });
    } catch (error) {
      console.error('Get service status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}
