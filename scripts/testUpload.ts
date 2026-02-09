import { processTimTranspFile } from '../server/xlsxProcessor';
import * as fs from 'fs';
import * as path from 'path';

async function testUpload() {
  try {
    // Leer archivo de prueba
    const filePath = '/home/ubuntu/upload/TimTransp.xlsx';
    const buffer = fs.readFileSync(filePath);
    
    console.log('Procesando archivo...');
    const result = processTimTranspFile(buffer);
    
    console.log('\n=== RESULTADO ===');
    console.log('Success:', result.success);
    console.log('Registros procesados:', result.registrosProcesados);
    console.log('Registros exitosos:', result.registrosExitosos);
    console.log('Registros con error:', result.registrosError);
    console.log('\n=== PRIMEROS 10 ERRORES ===');
    result.errores.slice(0, 10).forEach((error, idx) => {
      console.log(`${idx + 1}. ${error}`);
    });
    
    if (result.data && result.data.length > 0) {
      console.log('\n=== PRIMERA FACTURA ===');
      console.log(JSON.stringify(result.data[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpload();
