SELECT 
  f.folio,
  f.nombreCliente,
  DATE_FORMAT(f.fecha, '%Y-%m-%d') as fecha,
  f.importeTotal,
  f.descripcion,
  f.sistema,
  (SELECT numeroContrato FROM partidasFactura WHERE partidasFactura.facturaId = f.id LIMIT 1) as numeroContrato
FROM facturas f
WHERE f.estadoPago = 'pendiente'
HAVING numeroContrato IS NULL
ORDER BY f.nombreCliente, f.folio
INTO OUTFILE '/tmp/folios_sin_contrato.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
