
import { andreaniService } from '../src/services/andreaniService';

async function runTests() {
  console.log('🚀 Iniciando pruebas unitarias para Servicio Andreani (Mock)...');

  // TEST 1: Validación de Dirección
  try {
    console.log('\nTest 1: Validar CP correcto (4 dígitos)...');
    const isValid = await andreaniService.validateAddress('Calle Test', '1414');
    if (isValid === true) {
        console.log('✅ PASSED: CP 1414 es válido.');
    } else {
        console.error('❌ FAILED: CP 1414 debería ser válido.');
    }

    console.log('Test 1b: Validar CP incorrecto...');
    const isInvalid = await andreaniService.validateAddress('Calle Test', 'ABC');
    if (isValid === true && isInvalid === false) { // isInvalid should be false
        console.log('✅ PASSED: CP ABC es inválido.');
    } else {
        console.error('❌ FAILED: CP ABC debería ser inválido.');
    }
  } catch (e) {
    console.error('❌ ERROR en Test 1:', e);
  }

  // TEST 2: Generación de Etiqueta
  try {
    console.log('\nTest 2: Generar Etiqueta...');
    const mockOrder = {
        cliente_nombre: 'Test User',
        metadata: { dni: '12345678' },
        direccion_envio: 'Av Test 123',
        ciudad: 'CABA',
        codigo_postal: '1000'
    };

    const label = await andreaniService.generateLabel(mockOrder);
    
    if (label.trackingNumber && label.trackingNumber.startsWith('AND-')) {
        console.log(`✅ PASSED: Tracking Number generado: ${label.trackingNumber}`);
    } else {
        console.error('❌ FAILED: Tracking Number inválido.');
    }

    if (label.receiver.name === 'Test User') {
        console.log('✅ PASSED: Datos de receptor coinciden.');
    } else {
        console.error('❌ FAILED: Nombre de receptor incorrecto.');
    }

  } catch (e) {
     console.error('❌ ERROR en Test 2:', e);
  }

  console.log('\n🏁 Pruebas finalizadas.');
}

runTests();
