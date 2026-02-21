import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { facturas } from './drizzle/schema.ts';
import { inArray, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db
  .select({
    folio: facturas.folio,
    fecha: facturas.fecha,
    fechaVencimiento: facturas.fechaVencimiento,
    diasAtrasoCalculado: sql`DATEDIFF(CURDATE(), ${facturas.fechaVencimiento})`,
    estadoPago: facturas.estadoPago
  })
  .from(facturas)
  .where(inArray(facturas.folio, ['AB11085', 'AB11415']));

console.log(JSON.stringify(result, null, 2));
await connection.end();
