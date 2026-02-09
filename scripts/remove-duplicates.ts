import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function removeDuplicates() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  console.log("🧹 Iniciando limpieza de duplicados...\n");

  // Paso 1: Identificar duplicados
  console.log("📊 Paso 1: Identificando duplicados...");
  const duplicates = await db.execute(sql`
    SELECT nombre, MIN(id) as keep_id, COUNT(*) as count
    FROM clientes
    GROUP BY nombre
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  console.log(`   Encontrados ${duplicates.length} grupos de duplicados\n`);

  if (duplicates.length === 0) {
    console.log("✅ No hay duplicados que eliminar");
    return;
  }

  let totalRemoved = 0;
  let totalUpdated = 0;

  // Paso 2: Procesar cada grupo de duplicados
  console.log("🔄 Paso 2: Procesando duplicados...\n");
  
  for (const dup of duplicates) {
    const nombre = dup.nombre;
    const keepId = dup.keep_id;
    
    console.log(`   Procesando: "${nombre}" (mantener ID: ${keepId})`);
    
    // Obtener todos los IDs duplicados excepto el que vamos a mantener
    const duplicateIds = await db.execute(sql`
      SELECT id FROM clientes 
      WHERE nombre = ${nombre} AND id != ${keepId}
    `);
    
    if (duplicateIds.length === 0) continue;
    
    const idsToRemove = duplicateIds.map(r => r.id);
    
    // Actualizar referencias en facturas
    for (const idToRemove of idsToRemove) {
      const updateResult = await db.execute(sql`
        UPDATE facturas 
        SET clienteId = ${keepId}
        WHERE clienteId = ${idToRemove}
      `);
      
      if (updateResult.affectedRows > 0) {
        console.log(`      ↳ Actualizadas ${updateResult.affectedRows} facturas de cliente ID ${idToRemove} → ${keepId}`);
        totalUpdated += updateResult.affectedRows;
      }
    }
    
    // Actualizar referencias en contratos
    for (const idToRemove of idsToRemove) {
      const updateContractResult = await db.execute(sql`
        UPDATE contratos 
        SET clienteId = ${keepId}
        WHERE clienteId = ${idToRemove}
      `);
      
      if (updateContractResult.affectedRows > 0) {
        console.log(`      ↳ Actualizados ${updateContractResult.affectedRows} contratos de cliente ID ${idToRemove} → ${keepId}`);
      }
    }
    
    // Eliminar duplicados
    const deleteResult = await db.execute(sql`
      DELETE FROM clientes 
      WHERE nombre = ${nombre} AND id != ${keepId}
    `);
    
    console.log(`      ✓ Eliminados ${deleteResult.affectedRows} registros duplicados`);
    totalRemoved += deleteResult.affectedRows;
    console.log();
  }

  // Resumen final
  console.log("=" .repeat(60));
  console.log("📈 RESUMEN DE LIMPIEZA:");
  console.log("=" .repeat(60));
  console.log(`   Grupos de duplicados procesados: ${duplicates.length}`);
  console.log(`   Registros eliminados: ${totalRemoved}`);
  console.log(`   Referencias actualizadas en facturas: ${totalUpdated}`);
  console.log();
  
  // Verificar que no queden duplicados
  console.log("🔍 Verificando resultado...");
  const remainingDuplicates = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM (
      SELECT nombre
      FROM clientes
      GROUP BY nombre
      HAVING COUNT(*) > 1
    ) as dups
  `);
  
  if (remainingDuplicates[0].count === 0) {
    console.log("✅ ¡Limpieza exitosa! No quedan duplicados\n");
  } else {
    console.log(`⚠️  Aún quedan ${remainingDuplicates[0].count} duplicados\n`);
  }
}

removeDuplicates().catch(console.error);
