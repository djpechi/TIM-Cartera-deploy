import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_URL.replace('file:', ''));

const result = db.prepare(`
  SELECT 
    SUM(saldoPendiente) as totalCarteraPendiente, 
    COUNT(*) as totalFacturas 
  FROM facturas 
  WHERE estadoPago = 'pendiente'
`).get();

console.log('Total Cartera Pendiente:', result.totalCarteraPendiente);
console.log('Total Facturas Pendientes:', result.totalFacturas);
