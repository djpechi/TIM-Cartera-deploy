import XLSX from 'xlsx';

console.log('\n=== CLIENTES Y GRUPOS ===');
const wb1 = XLSX.readFile('/home/ubuntu/upload/ClientesyGrupos.xlsx');
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const data1: any[] = XLSX.utils.sheet_to_json(ws1);
console.log('Columnas:', Object.keys(data1[0] || {}));
console.log('Primera fila:', data1[0]);

console.log('\n=== TIM TRANSP ===');
const wb2 = XLSX.readFile('/home/ubuntu/upload/TimTransp.xlsx');
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data2: any[] = XLSX.utils.sheet_to_json(ws2);
console.log('Columnas:', Object.keys(data2[0] || {}));
console.log('Primera fila:', data2[0]);

console.log('\n=== TIM VALUE ===');
const wb3 = XLSX.readFile('/home/ubuntu/upload/TiMVALUE.xlsx');
const ws3 = wb3.Sheets[wb3.SheetNames[0]];
const data3: any[] = XLSX.utils.sheet_to_json(ws3);
console.log('Columnas:', Object.keys(data3[0] || {}));
console.log('Primera fila:', data3[0]);

console.log('\n=== PENDIENTES ===');
const wb4 = XLSX.readFile('/home/ubuntu/upload/Actualizarfoliospendientes.xlsx');
const ws4 = wb4.Sheets[wb4.SheetNames[0]];
const data4: any[] = XLSX.utils.sheet_to_json(ws4);
console.log('Columnas:', Object.keys(data4[0] || {}));
console.log('Primera fila:', data4[0]);
