import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    // Join s402_payments with s402_proxy_usage to get tool information
    const result = await db.query(`
      SELECT 
        t.id as tool_id,
        t.name as tool_name,
        t.icon_url,
        t.category,
        u.service,
        u.request_data,
        u.status,
        u.created_at as used_at
      FROM s402_proxy_usage u
      LEFT JOIN s402_tools t ON t.id = u.service
      WHERE u.tx_hash = $1
    `, [hash]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tool usage not found for this transaction' },
        { status: 404 }
      );
    }

    const toolInfo = result.rows[0];

    return NextResponse.json({
      toolId: toolInfo.tool_id,
      toolName: toolInfo.tool_name,
      icon: toolInfo.icon_url,
      category: toolInfo.category,
      service: toolInfo.service,
      requestData: toolInfo.request_data,
      status: toolInfo.status,
      usedAt: toolInfo.used_at
    });
  } catch (error) {
    console.error('Error fetching tool info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool information' },
      { status: 500 }
    );
  }
}
