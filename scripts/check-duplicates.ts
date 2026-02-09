import { getDb } from '../server/db';
import { facturas, clientes } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function checkDuplicates() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  console.log("🔍 Analizando duplicados en la base de datos...\n");

  // Verificar duplicados en facturas por folio
  console.log("📄 FACTURAS - Duplicados por folio:");
  console.log("=" .repeat(60));
  
  const duplicateFacturas = await db.execute(sql`
    SELECT folio, COUNT(*) as count
    FROM facturas
    GROUP BY folio
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  if (duplicateFacturas.length === 0) {
    console.log("✅ No se encontraron facturas duplicadas\n");
  } else {
    console.log(`⚠️  Se encontraron ${duplicateFacturas.length} folios duplicados:\n`);
    for (const row of duplicateFacturas) {
      console.log(`   Folio: ${row.folio} - ${row.count} veces`);
    }
    console.log();
  }

  // Verificar duplicados en clientes por nombre
  console.log("👥 CLIENTES - Duplicados por nombre:");
  console.log("=" .repeat(60));
  
  const duplicateClientesByNombre = await db.execute(sql`
    SELECT nombre, COUNT(*) as count
    FROM clientes
    GROUP BY nombre
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  if (duplicateClientesByNombre.length === 0) {
    console.log("✅ No se encontraron clientes duplicados por nombre\n");
  } else {
    console.log(`⚠️  Se encontraron ${duplicateClientesByNombre.length} nombres duplicados:\n`);
    for (const row of duplicateClientesByNombre) {
      console.log(`   Nombre: ${row.nombre} - ${row.count} veces`);
    }
    console.log();
  }

  // Estadísticas generales
  console.log("📊 ESTADÍSTICAS GENERALES:");
  console.log("=" .repeat(60));
  
  const totalFacturas = await db.execute(sql`SELECT COUNT(*) as count FROM facturas`);
  const totalClientes = await db.execute(sql`SELECT COUNT(*) as count FROM clientes`);
  
  console.log(`Total de facturas: ${totalFacturas[0].count}`);
  console.log(`Total de clientes: ${totalClientes[0].count}`);
  console.log();

  // Detalles de duplicados si existen
  if (duplicateFacturas.length > 0) {
    console.log("\n📋 DETALLES DE FACTURAS DUPLICADAS:");
    console.log("=" .repeat(60));
    
    for (const dup of duplicateFacturas.slice(0, 10)) { // Mostrar solo los primeros 10
      const details = await db.execute(sql`
        SELECT id, folio, fecha, nombreCliente, importeTotal
        FROM facturas
        WHERE folio = ${dup.folio}
        ORDER BY id
      `);
      
      console.log(`\nFolio: ${dup.folio} (${dup.count} entradas):`);
      for (const detail of details) {
        console.log(`  - ID: ${detail.id}, Fecha: ${detail.fecha}, Cliente: ${detail.nombreCliente}, Monto: $${detail.importeTotal}`);
      }
    }
  }

  if (duplicateClientesByNombre.length > 0) {
    console.log("\n👥 DETALLES DE CLIENTES DUPLICADOS POR NOMBRE:");
    console.log("=" .repeat(60));
    
    for (const dup of duplicateClientesByNombre.slice(0, 10)) { // Mostrar solo los primeros 10
      const details = await db.execute(sql`
        SELECT id, nombre, rfc, grupoId
        FROM clientes
        WHERE nombre = ${dup.nombre}
        ORDER BY id
      `);
      
      console.log(`\nNombre: ${dup.nombre} (${dup.count} entradas):`);
      for (const detail of details) {
        console.log(`  - ID: ${detail.id}, RFC: ${detail.rfc || 'N/A'}, Grupo: ${detail.grupoId || 'Sin grupo'}`);
      }
    }
  }

  console.log("\n✅ Análisis completado");
}

checkDuplicates().catch(console.error);
