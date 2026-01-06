const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  try {
    console.log('Probando login con Supabase...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'marcospeiti@bertamoda.com',
      password: 'Omega10',
    })

    if (error) {
      console.log('❌ Error al iniciar sesión:', error.message)
      console.log('\nIntentando crear usuario...')
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'marcospeiti@bertamoda.com',
        password: 'Omega10',
      })
      
      if (signupError) {
        console.log('❌ Error al registrar:', signupError.message)
      } else {
        console.log('✓ Usuario creado exitosamente')
        console.log('Email:', signupData.user?.email)
        console.log('ID:', signupData.user?.id)
      }
      return
    }

    console.log('✓ Login exitoso!')
    console.log('Email:', data.user?.email)
    console.log('ID:', data.user?.id)
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testLogin()
