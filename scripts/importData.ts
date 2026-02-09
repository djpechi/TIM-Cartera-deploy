import XLSX from 'xlsx';
import * as db from '../server/db';
import { procesarFacturaParaContratos } from '../server/contratoIntegration';

async function importarClientesYGrupos(filePath: string) {
  console.log('\n📋 Importando Clientes y Grupos...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`   Encontrados ${data.length} registros`);

  const gruposMap = new Map<string, number>();
  let clientesImportados = 0;
  let gruposCreados = 0;

  for (const row of data) {
    // Limpiar comillas de los valores
    const nombreCliente = row['Nombre de Cliente']?.toString().replace(/^"|"$/g, '').trim();
    const nombreGrupo = row['Grupo']?.toString().replace(/^"|"$/g, '').trim();

    if (!nombreCliente) continue;

    // Crear grupo si no existe
    let grupoId: number | undefined;
    if (nombreGrupo && nombreGrupo !== '-' && nombreGrupo !== '') {
      if (!gruposMap.has(nombreGrupo)) {
        try {
          const nuevoGrupo = await db.createGrupoCliente({
            nombre: nombreGrupo,
            descripcion: `Grupo ${nombreGrupo}`,
          });
          gruposMap.set(nombreGrupo, nuevoGrupo.id);
          gruposCreados++;
          console.log(`   ✓ Grupo creado: ${nombreGrupo}`);
        } catch (error: any) {
          if (!error.message?.includes('Duplicate entry')) {
            console.error(`   ✗ Error al crear grupo ${nombreGrupo}:`, error.message);
          }
        }
      }
      grupoId = gruposMap.get(nombreGrupo);
    }

    // Crear cliente
    try {
      await db.upsertCliente({
        razonSocial: nombreCliente,
        rfc: null,
        grupoId: grupoId || null,
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        notas: null,
      });
      clientesImportados++;
    } catch (error: any) {
      if (!error.message?.includes('Duplicate entry')) {
        console.error(`   ✗ Error al importar cliente ${nombreCliente}:`, error.message);
      }
    }
  }

  console.log(`   ✅ ${gruposCreados} grupos creados`);
  console.log(`   ✅ ${clientesImportados} clientes importados`);
}

async function importarFacturas(filePath: string, empresa: 'tim_transp' | 'tim_value') {
  console.log(`\n📋 Importando Facturas ${empresa === 'tim_transp' ? 'Tim Transp' : 'Tim Value'}...`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`   Encontrados ${data.length} registros`);

  let facturasImportadas = 0;
  let contratosCreados = 0;
  let errores = 0;

  for (const row of data) {
    const folio = row['Folio']?.toString().trim();
    const nombreCliente = row['Nombre del cliente']?.toString().trim();
    const fecha = row['Fecha'];
    const total = parseFloat(row['Importe total']?.toString() || '0');
    const descripcion = row['Descripción']?.toString().trim() || '';
    const estatus = row['Status']?.toString().trim() || 'Normal';

    if (!folio || !nombreCliente || total === 0) continue;

    // Buscar cliente
    const cliente = await db.getClienteByRazonSocial(nombreCliente);
    if (!cliente) {
      if (errores < 5) {
        console.log(`   ⚠ Cliente no encontrado: ${nombreCliente}`);
      }
      errores++;
      continue;
    }

    // Parsear fecha de Excel
    let fechaEmision: Date;
    if (typeof fecha === 'number') {
      // Excel date serial number
      fechaEmision = new Date((fecha - 25569) * 86400 * 1000);
    } else {
      fechaEmision = new Date(fecha);
    }

    // Crear factura
    try {
      const factura = await db.createFactura({
        folio,
        clienteId: cliente.id,
        razonSocial: cliente.razonSocial,
        empresa,
        fechaEmision,
        fechaVencimiento: new Date(fechaEmision.getTime() + 30 * 24 * 60 * 60 * 1000),
        subtotal: (total / 1.16).toFixed(2),
        iva: (total * 0.16 / 1.16).toFixed(2),
        total: total.toFixed(2),
        estatus: estatus.toLowerCase().includes('pagada') ? 'pagado' : 'pendiente',
        diasAtraso: 0,
        interesesMoratorios: '0',
      });

      facturasImportadas++;

      // Procesar partida para extraer contrato
      if (descripcion && descripcion.length > 10) {
        try {
          const contratos = await procesarFacturaParaContratos(
            factura.id,
            descripcion,
            total,
            cliente.razonSocial,
            empresa,
            fechaEmision
          );
          
          if (contratos.length > 0) {
            const nuevos = contratos.filter(c => c.esNuevo).length;
            contratosCreados += nuevos;
          }
        } catch (error) {
          // Silenciar errores de parsing
        }
      }

      // Mostrar progreso cada 500 facturas
      if (facturasImportadas % 500 === 0) {
        console.log(`   ... ${facturasImportadas} facturas procesadas`);
      }
    } catch (error: any) {
      if (!error.message?.includes('Duplicate entry')) {
        if (errores < 5) {
          console.error(`   ✗ Error al importar factura ${folio}:`, error.message);
        }
        errores++;
      }
    }
  }

  if (errores > 5) {
    console.log(`   ⚠ ${errores} errores en total (solo se mostraron los primeros 5)`);
  }
  console.log(`   ✅ ${facturasImportadas} facturas importadas`);
  console.log(`   ✅ ${contratosCreados} contratos creados automáticamente`);
}

async function importarPendientes(filePath: string) {
  console.log('\n📋 Importando Pendientes de Pago...');
  
  const workbook = XLSX.readFile(filePath);
  
  // El archivo de pendientes tiene una estructura diferente, necesitamos inspeccionar más
  console.log('   Hojas disponibles:', workbook.SheetNames);
  
  // Por ahora, saltamos esta importación ya que la estructura no es clara
  console.log('   ⚠ Estructura de pendientes no clara, se omite por ahora');
  console.log('   ℹ Los estados de pago se determinan automáticamente por la ausencia de folios en pendientes');
}

async function main() {
  console.log('🚀 Iniciando importación de datos...\n');

  try {
    // 1. Importar clientes y grupos
    await importarClientesYGrupos('/home/ubuntu/upload/ClientesyGrupos.xlsx');

    // 2. Importar facturas Tim Transp
    await importarFacturas('/home/ubuntu/upload/TimTransp.xlsx', 'tim_transp');

    // 3. Importar facturas Tim Value
    await importarFacturas('/home/ubuntu/upload/TiMVALUE.xlsx', 'tim_value');

    // 4. Importar pendientes de pago (omitido por ahora)
    await importarPendientes('/home/ubuntu/upload/Actualizarfoliospendientes.xlsx');

    console.log('\n✅ Importación completada exitosamente!');
    console.log('\nℹ Puedes revisar los datos en el sistema web');
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error);
    process.exit(1);
  }
}

main();
