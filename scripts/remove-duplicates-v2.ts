import { getDb } from '../server/db';
import { clientes, facturas, contratos } from '../drizzle/schema';
import { eq, sql, and, ne } from 'drizzle-orm';

async function removeDuplicates() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  console.log("🧹 Iniciando limpieza de duplicados...\n");

  // Paso 1: Obtener todos los clientes
  console.log("📊 Paso 1: Obteniendo todos los clientes...");
  const allClientes = await db.select().from(clientes);
  console.log(`   Total de clientes: ${allClientes.length}\n`);

  // Paso 2: Agrupar por nombre
  console.log("🔍 Paso 2: Identificando duplicados...");
  const clientesByNombre = new Map<string, typeof allClientes>();
  
  for (const cliente of allClientes) {
    const nombre = cliente.nombre;
    if (!clientesByNombre.has(nombre)) {
      clientesByNombre.set(nombre, []);
    }
    clientesByNombre.get(nombre)!.push(cliente);
  }

  // Filtrar solo los que tienen duplicados
  const duplicateGroups = Array.from(clientesByNombre.entries())
    .filter(([_, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`   Encontrados ${duplicateGroups.length} grupos de duplicados\n`);

  if (duplicateGroups.length === 0) {
    console.log("✅ No hay duplicados que eliminar");
    return;
  }

  let totalRemoved = 0;
  let totalUpdatedFacturas = 0;
  let totalUpdatedContratos = 0;

  // Paso 3: Procesar cada grupo de duplicados
  console.log("🔄 Paso 3: Procesando duplicados...\n");
  
  for (const [nombre, group] of duplicateGroups) {
    // Mantener el registro con el ID más bajo (el más antiguo)
    const sortedGroup = group.sort((a, b) => a.id - b.id);
    const keepClient = sortedGroup[0];
    const removeClients = sortedGroup.slice(1);
    
    console.log(`   Procesando: "${nombre}" (${group.length} registros)`);
    console.log(`      Mantener: ID ${keepClient.id}`);
    console.log(`      Eliminar: IDs ${removeClients.map(c => c.id).join(', ')}`);
    
    // Actualizar referencias en facturas
    for (const removeClient of removeClients) {
      try {
        const updateResult = await db
          .update(facturas)
          .set({ clienteId: keepClient.id })
          .where(eq(facturas.clienteId, removeClient.id));
        
        // Contar cuántas facturas se actualizaron
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(facturas)
          .where(eq(facturas.clienteId, keepClient.id));
        
        if (countResult[0]?.count > 0) {
          console.log(`      ↳ Actualizadas facturas de cliente ID ${removeClient.id} → ${keepClient.id}`);
          totalUpdatedFacturas++;
        }
      } catch (error) {
        console.log(`      ⚠️  Error actualizando facturas para cliente ${removeClient.id}`);
      }
    }
    
    // Actualizar referencias en contratos
    for (const removeClient of removeClients) {
      try {
        const updateContractResult = await db
          .update(contratos)
          .set({ clienteId: keepClient.id })
          .where(eq(contratos.clienteId, removeClient.id));
        
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(contratos)
          .where(eq(contratos.clienteId, keepClient.id));
        
        if (countResult[0]?.count > 0) {
          console.log(`      ↳ Actualizados contratos de cliente ID ${removeClient.id} → ${keepClient.id}`);
          totalUpdatedContratos++;
        }
      } catch (error) {
        console.log(`      ⚠️  Error actualizando contratos para cliente ${removeClient.id}`);
      }
    }
    
    // Eliminar duplicados
    for (const removeClient of removeClients) {
      try {
        await db.delete(clientes).where(eq(clientes.id, removeClient.id));
        totalRemoved++;
      } catch (error) {
        console.log(`      ⚠️  Error eliminando cliente ${removeClient.id}`);
      }
    }
    
    console.log(`      ✓ Eliminados ${removeClients.length} registros duplicados\n`);
  }

  // Resumen final
  console.log("=" .repeat(60));
  console.log("📈 RESUMEN DE LIMPIEZA:");
  console.log("=" .repeat(60));
  console.log(`   Grupos de duplicados procesados: ${duplicateGroups.length}`);
  console.log(`   Registros eliminados: ${totalRemoved}`);
  console.log(`   Clientes con facturas actualizadas: ${totalUpdatedFacturas}`);
  console.log(`   Clientes con contratos actualizados: ${totalUpdatedContratos}`);
  console.log();
  
  // Verificar que no queden duplicados
  console.log("🔍 Verificando resultado...");
  const allClientesAfter = await db.select().from(clientes);
  const clientesByNombreAfter = new Map<string, typeof allClientesAfter>();
  
  for (const cliente of allClientesAfter) {
    const nombre = cliente.nombre;
    if (!clientesByNombreAfter.has(nombre)) {
      clientesByNombreAfter.set(nombre, []);
    }
    clientesByNombreAfter.get(nombre)!.push(cliente);
  }
  
  const remainingDuplicates = Array.from(clientesByNombreAfter.values())
    .filter(group => group.length > 1);
  
  if (remainingDuplicates.length === 0) {
    console.log("✅ ¡Limpieza exitosa! No quedan duplicados");
    console.log(`   Total de clientes únicos: ${allClientesAfter.length}\n`);
  } else {
    console.log(`⚠️  Aún quedan ${remainingDuplicates.length} duplicados\n`);
  }
}

removeDuplicates().catch(console.error);
