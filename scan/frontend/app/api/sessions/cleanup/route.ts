import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: Sessions no longer expire automatically
 * Users must manually close sessions via /api/sessions/close
 * This endpoint is kept for backwards compatibility but does nothing
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'Session cleanup disabled - sessions must be closed manually via /api/sessions/close',
    refunded: 0,
    results: [],
  });
}
