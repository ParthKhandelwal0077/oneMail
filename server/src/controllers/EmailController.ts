import { Request, Response } from 'express';
import { 
  searchEmails, 
  getEmailById, 
  updateEmailStatus, 
  deleteEmail, 
  getEmailStats 
} from '../services/elasticsearchService';
import { SearchQuery } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export class EmailController {
  // Search emails with various filters
  searchEmails = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { 
      query, 
      folder, 
      email, 
      dateFrom, 
      dateTo,
      page = '1',
      limit = '50'
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      const searchQuery: SearchQuery = {
        query: query as string,
        folder: folder as string,
        email: email as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const emails = await searchEmails(userId, searchQuery);
      
      // Simple pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedEmails = emails.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: {
          emails: paginatedEmails,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: emails.length,
            pages: Math.ceil(emails.length / limitNum),
            hasNext: endIndex < emails.length,
            hasPrev: pageNum > 1
          },
          query: searchQuery
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get specific email by ID
  getEmailById = asyncHandler(async (req: Request, res: Response) => {
    const { userId, emailId } = req.params;

    if (!userId || !emailId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Email ID are required'
      });
    }

    try {
      const email = await getEmailById(userId, emailId);
      
      if (!email) {
        return res.status(404).json({
          success: false,
          error: 'Email not found',
          message: `Email with ID ${emailId} not found for user ${userId}`
        });
      }

      res.status(200).json({
        success: true,
        data: { email }
      });
    } catch (error) {
      console.error('Get email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve email',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Mark email as read/unread
  markEmailStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId, emailId } = req.params;
    const { isRead } = req.body;

    if (!userId || !emailId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Email ID are required'
      });
    }

    if (typeof isRead !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isRead field must be a boolean value'
      });
    }

    try {
      await updateEmailStatus(userId, emailId, { isRead });
      
      res.status(200).json({
        success: true,
        message: `Email marked as ${isRead ? 'read' : 'unread'}`,
        data: {
          emailId,
          isRead,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Update email status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update email status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Star/unstar email
  starEmail = asyncHandler(async (req: Request, res: Response) => {
    const { userId, emailId } = req.params;
    const { isStarred } = req.body;

    if (!userId || !emailId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Email ID are required'
      });
    }

    if (typeof isStarred !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isStarred field must be a boolean value'
      });
    }

    try {
      await updateEmailStatus(userId, emailId, { isStarred });
      
      res.status(200).json({
        success: true,
        message: `Email ${isStarred ? 'starred' : 'unstarred'}`,
        data: {
          emailId,
          isStarred,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Star email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update email star status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Delete email
  deleteEmail = asyncHandler(async (req: Request, res: Response) => {
    const { userId, emailId } = req.params;

    if (!userId || !emailId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Email ID are required'
      });
    }

    try {
      await deleteEmail(userId, emailId);
      
      res.status(200).json({
        success: true,
        message: 'Email deleted successfully',
        data: {
          emailId,
          deletedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Delete email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete email',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get email statistics for user
  getEmailStats = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      const stats = await getEmailStats(userId);
      
      res.status(200).json({
        success: true,
        data: {
          stats,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get email stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve email statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get recent emails (latest 20)
  getRecentEmails = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { limit = '20' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      const emails = await searchEmails(userId, {});
      const limitNum = parseInt(limit as string);
      const recentEmails = emails.slice(0, limitNum);

      res.status(200).json({
        success: true,
        data: {
          emails: recentEmails,
          count: recentEmails.length,
          total: emails.length
        }
      });
    } catch (error) {
      console.error('Get recent emails error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent emails',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}
