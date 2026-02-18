SELECT 
  folio,
  fecha,
  fechaVencimiento,
  sistema,
  importeTotal,
  saldoPendiente,
  estadoPago,
  DATEDIFF(CURDATE(), fechaVencimiento) as diasAtraso
FROM facturas
WHERE nombreCliente = 'OUTOKUMPU MEXINOX'
  AND estadoPago = 'pendiente'
ORDER BY sistema, fecha
LIMIT 20;
