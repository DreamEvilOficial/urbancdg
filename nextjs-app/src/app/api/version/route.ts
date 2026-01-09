import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Intentar obtener el hash del último commit
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    return NextResponse.json({ version: commitHash });
  } catch (error) {
    console.error('Error al obtener la versión de Git:', error);
    return NextResponse.json({ version: 'v1.0.8-JAN' }); // Fallback
  }
}
