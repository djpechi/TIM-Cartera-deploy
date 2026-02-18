SELECT 
  folio,
  DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
  DATE_FORMAT(fechaVencimiento, '%Y-%m-%d') as fechaVencimiento,
  DATEDIFF(CURDATE(), fechaVencimiento) as diasAtraso,
  sistema,
  saldoPendiente
FROM facturas
WHERE folio IN ('AB11746', 'AB11749', 'AB11738', 'AB11744', 'AB11741', 'AB11848', 'AB11849', 'AB11850', 'AB11709', 'AB11826')
ORDER BY folio;
