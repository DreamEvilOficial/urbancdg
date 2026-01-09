import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase Admin client not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Convertir el archivo a un Buffer para subirlo a Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar un nombre de archivo único
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
    const filePath = `${folder}/${fileName}`;

    // Subir el archivo al bucket "public" (asegúrate de que el bucket exista y sea público)
    const { data, error } = await supabaseAdmin.storage
      .from('public')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl });
    
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
