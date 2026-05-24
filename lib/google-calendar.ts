import 'server-only'

import { google } from 'googleapis'

type GoogleTokens = {
  access_token: string
  refresh_token?: string
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    prompt: 'consent',
  })
}

export async function getCalendarWithTokens(tokens: GoogleTokens) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function createCalendarEvent(
  tokens: GoogleTokens,
  event: {
    summary: string
    description?: string
    start: string
    end?: string
  }
) {
  const calendar = await getCalendarWithTokens(tokens)
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { date: event.start },
      end: { date: event.end ?? event.start },
    },
  })

  return res.data
}
