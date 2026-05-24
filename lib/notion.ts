import 'server-only'

import { Client } from '@notionhq/client'
import type {
  CreatePageParameters,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints'

function getNotionClient() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) throw new Error('NOTION_API_KEY が設定されていません')
  return new Client({ auth: apiKey })
}

export async function createNotionPage(params: {
  databaseId: string
  title: string
  properties?: CreatePageParameters['properties']
}) {
  const notion = getNotionClient()

  return notion.pages.create({
    parent: { database_id: params.databaseId },
    properties: {
      Name: { title: [{ text: { content: params.title } }] },
      ...params.properties,
    },
  })
}

export async function updateNotionPage(
  pageId: string,
  properties: UpdatePageParameters['properties']
) {
  const notion = getNotionClient()
  return notion.pages.update({ page_id: pageId, properties })
}
