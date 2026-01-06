import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Almacenamiento simple en memoria para configuración bancaria
let bankConfigStore = {
  accountHolder: '',
  bankName: '',
  accountNumber: '',
  cbu: '',
  alias: '',
  accountType: 'corriente'
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Verificar autenticación de admin
    const adminSession = cookieStore.get('admin-session')?.value
    
    if (!adminSession || adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'No autorizado - Sesión requerida' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      config: bankConfigStore
    })

  } catch (error) {
    console.error('Error getting bank config:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración bancaria' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Verificar autenticación de admin
    const adminSession = cookieStore.get('admin-session')?.value
    
    if (!adminSession || adminSession !== 'authenticated') {
      return NextResponse.json(
        { error: 'No autorizado - Sesión requerida' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    // Validar campos requeridos
    if (!data.accountHolder || !data.bankName || !data.accountNumber) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: titular, banco y número de cuenta' },
        { status: 400 }
      )
    }

    // Actualizar configuración
    bankConfigStore = {
      accountHolder: data.accountHolder || '',
      bankName: data.bankName || '',
      accountNumber: data.accountNumber || '',
      cbu: data.cbu || '',
      alias: data.alias || '',
      accountType: data.accountType || 'corriente'
    }

    console.log('Bank config updated:', Object.keys(bankConfigStore))

    return NextResponse.json({
      success: true,
      message: 'Configuración bancaria guardada exitosamente',
      config: bankConfigStore
    })

  } catch (error) {
    console.error('Error saving bank config:', error)
    return NextResponse.json(
      { error: 'Error al guardar configuración bancaria' },
      { status: 500 }
    )
  }
}
