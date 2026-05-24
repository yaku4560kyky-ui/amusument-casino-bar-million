import 'server-only'

import { google } from 'googleapis'

import { getOAuthClient } from './google-calendar'

type GoogleTokens = {
  access_token: string
  refresh_token?: string
}

export async function getDriveFiles(tokens: GoogleTokens, query?: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const res = await drive.files.list({
    q: query ?? "mimeType contains 'image/' and trashed=false",
    fields: 'files(id,name,mimeType,thumbnailLink,webViewLink)',
    pageSize: 20,
  })

  return res.data.files ?? []
}
