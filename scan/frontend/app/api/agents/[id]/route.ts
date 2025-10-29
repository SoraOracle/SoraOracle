import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// PATCH - Update agent settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, icon, is_public } = await request.json();

    await pool.query(
      `UPDATE s402_agents 
       SET name = $1, description = $2, icon = $3, is_public = $4, updated_at = NOW()
       WHERE id = $5`,
      [name, description, icon, is_public, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// DELETE - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete agent (cascading will handle related records)
    await pool.query('DELETE FROM s402_agents WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
