import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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
              Debe contener columnas: Folio, Alias, Cliente, Descripción, Días Vencido, Saldo
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
