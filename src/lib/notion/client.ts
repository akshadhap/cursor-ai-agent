
export interface NotionSearchResult {
    id: string;
    title: string;
    type: 'database' | 'page';
    icon?: string;
}

export class NotionClient {
    private accessToken: string;
    private baseUrl = 'https://api.notion.com/v1';

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private async request(endpoint: string, method: string, body?: any) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Notion API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    async search(query: string = '', filter?: 'database' | 'page'): Promise<NotionSearchResult[]> {
        const body: any = {
            query,
            sort: {
                direction: 'descending',
                timestamp: 'last_edited_time'
            },
            page_size: 20
        };

        if (filter) {
            body.filter = {
                value: filter,
                property: 'object'
            };
        }

        const response = await this.request('/search', 'POST', body);

        return response.results.map((item: any) => {
            let title = "Untitled";

            if (item.object === 'database' && item.title) {
                title = item.title?.[0]?.plain_text || "Untitled";
            } else if (item.object === 'page' && item.properties) {
                // Robustly find the property of type 'title', regardless of its name (Name, Title, Task, etc.)
                const titleProp = Object.values(item.properties).find((p: any) => p.type === 'title') as any;
                if (titleProp?.title?.[0]?.plain_text) {
                    title = titleProp.title[0].plain_text;
                }
            }

            const icon = item.icon?.emoji || item.icon?.external?.url || item.icon?.file?.url;

            return {
                id: item.id,
                title,
                type: item.object === 'database' ? 'database' : 'page',
                icon
            };
        });
    }

    async createPageWithParentType(title: string, content: string, parentId: string, parentType: 'database' | 'page') {
        const parent = parentType === 'database'
            ? { database_id: parentId }
            : { page_id: parentId };

        const blocks: any[] = [];

        // Split content by paragraphs
        if (content) {
            const paragraphs = content.split('\n\n');
            paragraphs.forEach(p => {
                if (p.trim()) {
                    blocks.push({
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{ type: 'text', text: { content: p.trim().substring(0, 2000) } }]
                        }
                    });
                }
            });
        }

        let body: any = {
            parent,
            children: blocks
        };

        if (parentType === 'page') {
            body.properties = {
                title: [
                    {
                        text: {
                            content: title
                        }
                    }
                ]
            };
        } else {
            // Database parent
            // We will TRY 'Name' as the key for title, as it's the default.
            body.properties = {
                Name: {
                    title: [
                        {
                            text: {
                                content: title
                            }
                        }
                    ]
                }
            };
        }

        return this.request('/pages', 'POST', body);
    }
}
