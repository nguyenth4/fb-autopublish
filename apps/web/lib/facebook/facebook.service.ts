const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'

// ─── Error types ──────────────────────────────────────────────────────────────

export class FacebookApiError extends Error {
  constructor(
    message: string,
    public readonly fbCode: number | null,
    public readonly fbSubcode: number | null,
    public readonly isRetryable: boolean,
  ) {
    super(message)
    this.name = 'FacebookApiError'
  }
}

function classifyFbError(fbCode: number | null): boolean {
  // Retryable: rate limit codes
  const RETRYABLE_CODES = new Set([4, 17, 32, 341, 368, 506])
  if (fbCode === null) return true
  return RETRYABLE_CODES.has(fbCode)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageInfo {
  id: string
  name: string
  access_token: string
  category: string
}

export interface PublishResult {
  postId: string
  publishedAt: Date
}

export interface PublishPostInput {
  message: string
  mediaUrls: string[]
  pageAccessToken: string
  pageId: string
}

type HttpClient = typeof fetch

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function graphRequest<T>(
  httpClient: HttpClient,
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`
  const response = await httpClient(url, options)
  const data = (await response.json()) as T & {
    error?: { message: string; code: number; error_subcode?: number }
  }

  if ('error' in data && data.error) {
    const { message, code, error_subcode } = data.error
    throw new FacebookApiError(
      `Facebook API Error [${code}]: ${message}`,
      code ?? null,
      error_subcode ?? null,
      classifyFbError(code ?? null),
    )
  }

  return data
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class FacebookService {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly httpClient: HttpClient = fetch,
  ) {}

  /** Step 1: Short-lived user token → Long-lived user token (~60 days) */
  async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    })
    return graphRequest(this.httpClient, `${GRAPH_API_BASE}/oauth/access_token?${params}`)
  }

  /** Step 2: Long-lived user token → Page Access Tokens (non-expiring) */
  async getPagesWithTokens(longLivedUserToken: string): Promise<PageInfo[]> {
    const data = await graphRequest<{ data: PageInfo[] }>(
      this.httpClient,
      `/me/accounts?fields=id,name,access_token,category&access_token=${longLivedUserToken}`,
    )
    return data.data
  }

  /** Text-only post — single API call */
  async publishTextPost(
    pageId: string,
    message: string,
    pageAccessToken: string,
  ): Promise<PublishResult> {
    const data = await graphRequest<{ id: string }>(
      this.httpClient,
      `/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: pageAccessToken }),
      },
    )
    return { postId: data.id, publishedAt: new Date() }
  }

  /**
   * Multi-image post — 2-step process:
   * 1. Upload each image to /{page-id}/photos with published=false → photo_id
   * 2. Create feed post with attached_media referencing all photo_ids
   *
   * NOTE: Facebook Image Posts have NO "title" field — all text goes into "message"
   */
  async publishImagePost(input: PublishPostInput): Promise<PublishResult> {
    const { message, mediaUrls, pageAccessToken, pageId } = input

    if (mediaUrls.length === 0) {
      return this.publishTextPost(pageId, message, pageAccessToken)
    }

    // Step 1: upload all images in parallel (unpublished)
    const uploadedPhotos = await Promise.all(
      mediaUrls.map((url) =>
        graphRequest<{ id: string }>(this.httpClient, `/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            published: false,
            access_token: pageAccessToken,
          }),
        }),
      ),
    )

    // Step 2: create post with all photo references
    const attachedMedia = uploadedPhotos.map((photo) => ({ media_fbid: photo.id }))

    const data = await graphRequest<{ id: string }>(
      this.httpClient,
      `/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attached_media: attachedMedia,
          access_token: pageAccessToken,
        }),
      },
    )

    return { postId: data.id, publishedAt: new Date() }
  }
}

export function createFacebookService(): FacebookService {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set')
  }
  return new FacebookService(appId, appSecret)
}
