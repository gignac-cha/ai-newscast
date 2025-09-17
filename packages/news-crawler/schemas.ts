import { z } from 'zod';

// BigKinds News Detail API Response Schema
export const NewsDetailSchema = z.object({
  BYLINE: z.string().optional(),
  CATEGORY_CODE: z.string().optional(),
  CATEGORY_INCIDENT: z.string().optional(),
  TMS_NE_LOCATION: z.string().optional(),
  CATEGORY_MAIN: z.string().optional(),
  TMS_SIMILARITY: z.string().optional(),
  DATE: z.string().optional(),
  NEWS_ID: z.string().optional(),
  SUB_TITLE: z.string().optional(),
  TMS_NE_ORGANIZATION: z.string().optional(),
  IMAGES: z.string().optional(),
  CATEGORY_INCIDENT_MAIN: z.string().optional(),
  TMS_NE_STREAM: z.string().optional(),
  CATEGORY: z.string().optional(),
  TMS_RAW_STREAM: z.string().optional(),
  TMS_SENTIMENT_CLASS: z.string().optional(),
  PROVIDER_LINK_PAGE: z.string().optional(),
  PROVIDER: z.string().optional(),
  PROVIDER_NAME: z.string().optional(), // Alternative field name
  TITLE: z.string().optional(),
  PROVIDER_CODE: z.string().optional(),
  CONTENT: z.string().optional(),
  TMS_NE_PERSON: z.string().optional(),
  PUBLISHED_DATE: z.string().optional(),
  KEYWORDS: z.string().optional(),
  SUMMARY: z.string().optional(),
  URL: z.string().optional()
});

export const LawsInfoSchema = z.object({
  assTotal: z.number(),
  lawTotal: z.number()
});

export const BigKindsDetailResponseSchema = z.object({
  ctx: z.string(),
  isStage: z.boolean(),
  domainName: z.string(),
  detail: NewsDetailSchema,
  lawsInfo: LawsInfoSchema
});

// News Topics API Response Schema
export const NewsTopicKeywordSchema = z.object({
  kb_service_id: z.string().nullable(),
  id: z.string(),
  label: z.string()
});

export const NewsTopicOrganizationSchema = z.object({
  kb_service_id: z.string().nullable(),
  label_ne: z.string(),
  id: z.string(),
  label: z.string()
});

export const NewsTopicItemSchema = z.object({
  date: z.string(),
  images: z.string(),
  news_node_id: z.string(),
  inKeyword: z.array(NewsTopicKeywordSchema),
  image_exists: z.string(),
  inPerson: z.array(z.unknown()),
  inLocation: z.array(z.unknown()),
  title: z.string(),
  inOrganization: z.array(NewsTopicOrganizationSchema),
  news_id: z.string(),
  content: z.string(),
  category_incident: z.string(),
  totalDocumentCount: z.number(),
  provider_code: z.string(),
  category: z.string(),
  provider_name: z.string(),
  byline: z.string()
});

export const NewsListResponseSchema = z.object({
  keywordJson: z.unknown().nullable(),
  endDate: z.string(),
  provider2node: z.record(z.string(), z.number()),
  startNo: z.unknown().nullable(),
  newsIds: z.array(z.string()),
  sectionDiv: z.unknown().nullable(),
  singleKeyword: z.string(),
  newsCluster: z.string(),
  newsList: z.array(NewsTopicItemSchema),
  nodes: z.array(z.unknown()),
  needges: z.array(z.unknown()),
  nodeCount: z.object({
    orgnizationCount: z.number(),
    keywordCount: z.number(),
    locationCount: z.number(),
    newsCount: z.number(),
    personCount: z.number()
  }),
  links: z.array(z.unknown()),
  keyword: z.string(),
  startDate: z.string()
});

// News Topic Schema (for crawl-news-topics.ts)
export const NewsTopicSchema = z.object({
  rank: z.number().positive(),
  title: z.string().min(1),
  issue_name: z.string(),
  keywords: z.array(z.string()),
  news_count: z.number().min(0),
  news_ids: z.array(z.string().min(1)),
  href: z.string().min(1)
});

export const NewsTopicsArraySchema = z.array(NewsTopicSchema).max(20); // Max 20 topics

// Type exports
export type NewsDetail = z.infer<typeof NewsDetailSchema>;
export type BigKindsDetailResponse = z.infer<typeof BigKindsDetailResponseSchema>;
export type NewsListResponse = z.infer<typeof NewsListResponseSchema>;
export type NewsTopicItem = z.infer<typeof NewsTopicItemSchema>;
export type NewsTopic = z.infer<typeof NewsTopicSchema>;