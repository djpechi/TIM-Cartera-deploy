import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<'tim_transp' | 'tim_value' | 'pendientes'>('tim_transp');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const uploadMutation = trpc.upload.processFile.useMutation();
  const utils = trpc.useUtils();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      // Leer archivo como base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remover el prefijo data:...

        try {
          const result = await uploadMutation.mutateAsync({
            tipoArchivo,
            fileName: selectedFile.name,
            fileData: base64Data,
          });

          setUploadResult(result);
          
          if (result.success) {
            toast.success(`Archivo procesado exitosamente: ${result.registrosExitosos} registros`);
            // Invalidar queries para actualizar dashboard
            utils.dashboard.stats.invalidate();
            utils.dashboard.historialCargas.invalidate();
            utils.dashboard.facturasPendientes.invalidate();
          } else {
            toast.error('Error al procesar el archivo');
          }
        } catch (error: any) {
          toast.error(error.message || 'Error al procesar el archivo');
          setUploadResult({
            success: false,
            errores: [error.message || 'Error desconocido'],
          });
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        toast.error('Error al leer el archivo');
        setUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast.error('Error al procesar el archivo');
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setTipoArchivo('tim_transp');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cargar Archivos</h1>
        <p className="text-muted-foreground mt-2">
          Sube archivos XLSX de facturación o pendientes de pago para procesarlos automáticamente
        </p>
      </div>

      {/* Plantillas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Carga</CardTitle>
          <CardDescription>
            Descarga las plantillas Excel con el formato correcto para cada tipo de archivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/templates/plantilla_tim_transp.xlsx"
              download
              className="flex items-center justify-center gap-2 px-4 py-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Tim Transp (AB)</span>
            </a>
            <a
              href="/templates/plantilla_tim_value.xlsx"
              download
              className="flex items-center justify-center gap-2 px-4 py-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Tim Value (AA)</span>
            </a>
            <a
              href="/templates/plantilla_pendientes.xlsx"
              download
              className="flex items-center justify-center gap-2 px-4 py-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Pendientes</span>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Archivo</CardTitle>
          <CardDescription>
            Elige el tipo de archivo y selecciona el archivo XLSX a procesar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Archivo */}
          <div className="space-y-3">
            <Label>Tipo de Archivo</Label>
            <RadioGroup value={tipoArchivo} onValueChange={(value: any) => setTipoArchivo(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tim_transp" id="tim_transp" />
                <Label htmlFor="tim_transp" className="font-normal cursor-pointer">
                  Facturación Tim Transp (Folios AB)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tim_value" id="tim_value" />
                <Label htmlFor="tim_value" className="font-normal cursor-pointer">
                  Facturación Tim Value (Folios AA)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pendientes" id="pendientes" />
                <Label htmlFor="pendientes" className="font-normal cursor-pointer">
                  Pendientes de Pago
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* File Input */}
          <div className="space-y-3">
            <Label>Archivo XLSX</Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Seleccionar Archivo</span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2"
            >
              <UploadIcon className="h-4 w-4" />
              {uploading ? 'Procesando...' : 'Procesar Archivo'}
            </Button>
            {selectedFile && !uploading && (
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Procesando archivo, por favor espera...
              </p>
            </div>
          )}

          {/* Results */}
          {uploadResult && (
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              {uploadResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {uploadResult.success ? 'Procesamiento Exitoso' : 'Error en Procesamiento'}
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  {uploadResult.success && (
                    <>
                      <p>Registros procesados: {uploadResult.registrosProcesados}</p>
                      <p>Registros exitosos: {uploadResult.registrosExitosos}</p>
                      {uploadResult.registrosError > 0 && (
                        <p className="text-orange-600">
                          Registros con error: {uploadResult.registrosError}
                        </p>
                      )}
                    </>
                  )}
                  {uploadResult.validacionTotales && (
                    <div className={`mt-3 p-3 rounded ${uploadResult.validacionTotales.coincide ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`font-semibold mb-2 ${uploadResult.validacionTotales.coincide ? 'text-green-700' : 'text-red-700'}`}>
                        {uploadResult.validacionTotales.coincide ? '✓ Validación de Totales: Correcta' : '⚠ Validación de Totales: Error'}
                      </p>
                      <div className="text-sm space-y-1">
                        <p>Total en archivo: ${uploadResult.validacionTotales.totalArchivo.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        <p>Total en base de datos: ${uploadResult.validacionTotales.totalBD.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        {!uploadResult.validacionTotales.coincide && (
                          <p className="font-semibold text-red-700">Diferencia: ${uploadResult.validacionTotales.diferencia.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadResult.facturasFaltantes && uploadResult.facturasFaltantes.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold mb-1 text-orange-600">Facturas no encontradas en la base de datos ({uploadResult.facturasFaltantes.length}):</p>
                      <p className="text-sm mb-2">Estas facturas están en el archivo de pendientes pero NO existen en la base de datos. Debes cargarlas primero desde los archivos TT o TV.</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {uploadResult.facturasFaltantes.slice(0, 10).map((factura: any, idx: number) => (
                          <li key={idx}>{factura.folio} - Saldo: ${parseFloat(factura.saldo || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</li>
                        ))}
                        {uploadResult.facturasFaltantes.length > 10 && (
                          <li>... y {uploadResult.facturasFaltantes.length - 10} facturas más</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {uploadResult.errores && uploadResult.errores.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold mb-1">Errores encontrados:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {uploadResult.errores.slice(0, 10).map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {uploadResult.errores.length > 10 && (
                          <li>... y {uploadResult.errores.length - 10} errores más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Información de Formato */}
      <Card>
        <CardHeader>
          <CardTitle>Formato de Archivos</CardTitle>
          <CardDescription>
            Información sobre la estructura esperada de cada tipo de archivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Facturación Tim Transp</AlertTitle>
            <AlertDescription>
              Debe contener columnas: Folio (AB), Fecha, Cliente, Importe Total, Descripción, Estatus
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Facturación Tim Value</AlertTitle>
            <AlertDescription>
              Debe contener columnas: Folio (AA), Fecha, Cliente, Importe Total, Descripción, Estatus
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pendientes de Pago</AlertTitle>
            <AlertDescription>
              Debe contener columnas: Concepto, Folio, Fecha, Vence, Atraso, Saldo. Los folios que aparecen en este archivo se marcan como NO PAGADOS.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
