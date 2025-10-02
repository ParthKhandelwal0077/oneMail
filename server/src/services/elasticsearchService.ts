import { Client } from '@elastic/elasticsearch';
import { SearchQuery, EmailMessage } from '../types';

// Elasticsearch client configuration
const esClient = new Client({ 
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_AUTH ? {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'password'
  } : undefined
});

const INDEX_NAME = 'emails';

export async function setupElasticsearch(): Promise<void> {
  try {
    // Check if index exists
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });
    
    if (!indexExists) {
      // Create index with mapping
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            email: { type: 'keyword' },
            folder: { type: 'keyword' },
            uid: { type: 'keyword' },
            subject: { 
              type: 'text', 
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            from: { 
              type: 'text', 
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            to: { 
              type: 'text', 
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            date: { type: 'date' },
            body: { 
              type: 'text', 
              analyzer: 'standard' 
            },
            isRead: { type: 'boolean' },
            isStarred: { type: 'boolean' },
            hasAttachments: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              email_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball']
              }
            }
          }
        }
      });
      console.log(`✅ Created Elasticsearch index: ${INDEX_NAME}`);
    } else {
      console.log(`✅ Elasticsearch index ${INDEX_NAME} already exists`);
    }
  } catch (error) {
    console.error('❌ Elasticsearch setup failed:', error);
    throw error;
  }
}

export async function indexEmail(
  userId: string, 
  email: string, 
  folder: string, 
  message: any
): Promise<void> {
  try {
    const emailData = {
      userId,
      email,
      folder,
      uid: message.uid,
      subject: message.envelope.subject || 'No Subject',
      from: message.envelope.from?.[0]?.address || 'unknown@example.com',
      to: message.envelope.to?.map((addr: any) => addr.address) || [],
      date: message.envelope.date || new Date(),
      body: message.source?.toString() || '',
      isRead: false,
      isStarred: false,
      hasAttachments: message.attachments && message.attachments.length > 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await esClient.index({
      index: INDEX_NAME,
      id: `${userId}-${email}-${message.uid}`,
      document: emailData
    });
    
    console.log(`📧 Indexed email ${message.uid} for ${userId} (${email})`);
  } catch (error) {
    console.error(`❌ Failed to index email for ${userId}:`, error);
    throw error;
  }
}

export async function searchEmails(
  userId: string, 
  searchQuery: SearchQuery = {}
): Promise<any[]> {
  try {
    const {
      query,
      folder,
      email: emailFilter,
      dateFrom,
      dateTo
    } = searchQuery;

    // Base query with user filter
    const baseQuery: any = {
      bool: {
        filter: [
          { term: { userId } }
        ]
      }
    };

    // Add text search if query provided
    if (query && query.trim()) {
      baseQuery.bool.must = {
        multi_match: {
          query: query.trim(),
          fields: ['subject^2', 'from^1.5', 'body', 'to'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      };
    }

    // Add folder filter
    if (folder) {
      baseQuery.bool.filter.push({ term: { folder } });
    }

    // Add email filter
    if (emailFilter) {
      baseQuery.bool.filter.push({ term: { email: emailFilter } });
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = dateFrom;
      if (dateTo) dateRange.lte = dateTo;
      
      baseQuery.bool.filter.push({
        range: {
          date: dateRange
        }
      });
    }

    const result = await esClient.search({
      index: INDEX_NAME,
      query: baseQuery,
      sort: [
        { date: { order: 'desc' } }
      ],
      size: 100,
      _source: {
        excludes: ['body'] // Exclude body from search results for performance
      }
    });

    return result.hits.hits.map((hit: any) => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score
    }));
  } catch (error) {
    console.error(`❌ Search failed for ${userId}:`, error);
    throw error;
  }
}

export async function getEmailById(
  userId: string, 
  emailId: string
): Promise<any | null> {
  try {
    const result = await esClient.get({
      index: INDEX_NAME,
      id: emailId
    });

    if (result.found) {
      return result._source;
    }
    return null;
  } catch (error) {
    console.error(`❌ Failed to get email ${emailId} for ${userId}:`, error);
    return null;
  }
}

export async function updateEmailStatus(
  userId: string,
  emailId: string,
  updates: Partial<EmailMessage>
): Promise<void> {
  try {
    await esClient.update({
      index: INDEX_NAME,
      id: emailId,
      doc: {
        ...updates,
        updatedAt: new Date()
      }
    });
    console.log(`✅ Updated email ${emailId} for ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to update email ${emailId}:`, error);
    throw error;
  }
}

export async function deleteEmail(
  userId: string,
  emailId: string
): Promise<void> {
  try {
    await esClient.delete({
      index: INDEX_NAME,
      id: emailId
    });
    console.log(`✅ Deleted email ${emailId} for ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to delete email ${emailId}:`, error);
    throw error;
  }
}

export async function getEmailStats(userId: string): Promise<any> {
  try {
    const result = await esClient.search({
      index: INDEX_NAME,
      query: {
        term: { userId }
      },
      aggs: {
        total_emails: {
          value_count: {
            field: 'uid'
          }
        },
        folders: {
          terms: {
            field: 'folder'
          }
        },
        emails: {
          terms: {
            field: 'email'
          }
        },
        date_range: {
          date_histogram: {
            field: 'date',
            calendar_interval: 'day',
            min_doc_count: 1
          }
        }
      },
      size: 0
    });

    if (!result.aggregations) {
      return {
        totalEmails: 0,
        folders: [],
        emailAccounts: [],
        dailyStats: []
      };
    }

    const totalEmailsAgg = result.aggregations.total_emails as any;
    const foldersAgg = result.aggregations.folders as any;
    const emailsAgg = result.aggregations.emails as any;
    const dateRangeAgg = result.aggregations.date_range as any;

    return {
      totalEmails: totalEmailsAgg?.value || 0,
      folders: foldersAgg?.buckets || [],
      emailAccounts: emailsAgg?.buckets || [],
      dailyStats: dateRangeAgg?.buckets || []
    };
  } catch (error) {
    console.error(`❌ Failed to get email stats for ${userId}:`, error);
    throw error;
  }
}

export async function closeElasticsearch(): Promise<void> {
  try {
    await esClient.close();
    console.log('✅ Elasticsearch connection closed');
  } catch (error) {
    console.error('❌ Error closing Elasticsearch connection:', error);
  }
}
