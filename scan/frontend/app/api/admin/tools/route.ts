import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM s402_tools ORDER BY created_at DESC'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      id,
      name,
      description,
      category,
      icon,
      endpoint_url,
      http_method,
      auth_headers,
      input_schema,
      cost_usd,
      provider_address,
      admin_address,
    } = await request.json();

    const adminCheck = await pool.query(
      'SELECT address FROM s402_admin_wallets WHERE LOWER(address) = LOWER($1) AND is_active = true',
      [admin_address]
    );

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await pool.query(
      `INSERT INTO s402_tools (id, name, description, category, icon, endpoint_url, http_method, auth_headers, input_schema, cost_usd, provider_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, name, description, category, icon || '🔧', endpoint_url, http_method, JSON.stringify(auth_headers), JSON.stringify(input_schema), cost_usd, provider_address]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create tool:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, is_active, admin_address } = await request.json();

    const adminCheck = await pool.query(
      'SELECT address FROM s402_admin_wallets WHERE LOWER(address) = LOWER($1) AND is_active = true',
      [admin_address]
    );

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await pool.query(
      'UPDATE s402_tools SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [is_active, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update tool:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const admin_address = searchParams.get('admin_address');

    if (!id || !admin_address) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const adminCheck = await pool.query(
      'SELECT address FROM s402_admin_wallets WHERE LOWER(address) = LOWER($1) AND is_active = true',
      [admin_address]
    );

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await pool.query('DELETE FROM s402_tools WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tool:', error);
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
