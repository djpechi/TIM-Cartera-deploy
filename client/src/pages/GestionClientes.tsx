import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users, Building2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function GestionClientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);
  const [isGrupoDialogOpen, setIsGrupoDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [editingGrupo, setEditingGrupo] = useState<any>(null);

  const { data: clientes = [], refetch: refetchClientes } = trpc.clientes.list.useQuery();
  const { data: grupos = [], refetch: refetchGrupos } = trpc.grupos.list.useQuery();
  
  const createCliente = trpc.clientes.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      refetchClientes();
      setIsClienteDialogOpen(false);
      resetClienteForm();
    },
    onError: (error) => {
      toast.error(`Error al crear cliente: ${error.message}`);
    },
  });

  const updateCliente = trpc.clientes.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente actualizado exitosamente");
      refetchClientes();
      setIsClienteDialogOpen(false);
      resetClienteForm();
    },
    onError: (error) => {
      toast.error(`Error al actualizar cliente: ${error.message}`);
    },
  });

  const deleteCliente = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente eliminado exitosamente");
      refetchClientes();
    },
    onError: (error) => {
      toast.error(`Error al eliminar cliente: ${error.message}`);
    },
  });

  const createGrupo = trpc.grupos.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo creado exitosamente");
      refetchGrupos();
      setIsGrupoDialogOpen(false);
      resetGrupoForm();
    },
    onError: (error) => {
      toast.error(`Error al crear grupo: ${error.message}`);
    },
  });

  const updateGrupo = trpc.grupos.update.useMutation({
    onSuccess: () => {
      toast.success("Grupo actualizado exitosamente");
      refetchGrupos();
      setIsGrupoDialogOpen(false);
      resetGrupoForm();
    },
    onError: (error) => {
      toast.error(`Error al actualizar grupo: ${error.message}`);
    },
  });

  const deleteGrupo = trpc.grupos.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo eliminado exitosamente");
      refetchGrupos();
    },
    onError: (error) => {
      toast.error(`Error al eliminar grupo: ${error.message}`);
    },
  });

  // Formulario de Cliente
  const [clienteForm, setClienteForm] = useState({
    nombre: "",
    rfc: "",
    alias: "",
    grupoId: "",
    responsableCobranza: "",
    correoCobranza: "",
    telefono: "",
    direccion: "",
    notas: "",
  });

  // Formulario de Grupo
  const [grupoForm, setGrupoForm] = useState({
    nombre: "",
    descripcion: "",
    responsable: "",
  });

  const resetClienteForm = () => {
    setClienteForm({
      nombre: "",
      rfc: "",
      alias: "",
      grupoId: "",
      responsableCobranza: "",
      correoCobranza: "",
      telefono: "",
      direccion: "",
      notas: "",
    });
    setEditingCliente(null);
  };

  const resetGrupoForm = () => {
    setGrupoForm({
      nombre: "",
      descripcion: "",
      responsable: "",
    });
    setEditingGrupo(null);
  };

  const handleEditCliente = (cliente: any) => {
    setEditingCliente(cliente);
    setClienteForm({
      nombre: cliente.nombre || "",
      rfc: cliente.rfc || "",
      alias: cliente.alias || "",
      grupoId: cliente.grupoId?.toString() || "",
      responsableCobranza: cliente.responsableCobranza || "",
      correoCobranza: cliente.correoCobranza || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      notas: cliente.notas || "",
    });
    setIsClienteDialogOpen(true);
  };

  const handleEditGrupo = (grupo: any) => {
    setEditingGrupo(grupo);
    setGrupoForm({
      nombre: grupo.nombre || "",
      descripcion: grupo.descripcion || "",
      responsable: grupo.responsable || "",
    });
    setIsGrupoDialogOpen(true);
  };

  const handleSubmitCliente = () => {
    const data = {
      nombre: clienteForm.nombre,
      rfc: clienteForm.rfc || undefined,
      alias: clienteForm.alias || undefined,
      grupoId: clienteForm.grupoId ? parseInt(clienteForm.grupoId) : undefined,
      responsableCobranza: clienteForm.responsableCobranza || undefined,
      correoCobranza: clienteForm.correoCobranza || undefined,
      telefono: clienteForm.telefono || undefined,
      direccion: clienteForm.direccion || undefined,
      notas: clienteForm.notas || undefined,
    };

    if (editingCliente) {
      updateCliente.mutate({ id: editingCliente.id, ...data });
    } else {
      createCliente.mutate(data);
    }
  };

  const handleSubmitGrupo = () => {
    const data = {
      nombre: grupoForm.nombre,
      descripcion: grupoForm.descripcion || undefined,
      responsable: grupoForm.responsable || undefined,
    };

    if (editingGrupo) {
      updateGrupo.mutate({ id: editingGrupo.id, ...data });
    } else {
      createGrupo.mutate(data);
    }
  };

  const handleDeleteCliente = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      deleteCliente.mutate({ id });
    }
  };

  const handleDeleteGrupo = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este grupo? Los clientes asociados quedarán sin grupo.")) {
      deleteGrupo.mutate({ id });
    }
  };

  // Filtrar clientes
  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch =
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.rfc && cliente.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cliente.alias && cliente.alias.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGrupo =
      filterGrupo === "all" ||
      (filterGrupo === "sin_grupo" && !cliente.grupoId) ||
      (cliente.grupoId && cliente.grupoId.toString() === filterGrupo);

    return matchesSearch && matchesGrupo;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Administra clientes y grupos de razones sociales
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsGrupoDialogOpen(true)} variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Gestionar Grupos
            </Button>
            <Button onClick={() => setIsClienteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Grupos Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grupos.filter(g => g.activo).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sin Grupo</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clientes.filter(c => !c.grupoId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, RFC o alias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  <SelectItem value="sin_grupo">Sin grupo</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id.toString()}>
                      {grupo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes ({filteredClientes.length})</CardTitle>
            <CardDescription>
              Lista de todos los clientes registrados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell>{cliente.rfc || "-"}</TableCell>
                      <TableCell>{cliente.alias || "-"}</TableCell>
                      <TableCell>
                        {cliente.grupoNombre ? (
                          <Badge variant="secondary">{cliente.grupoNombre}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin grupo</span>
                        )}
                      </TableCell>
                      <TableCell>{cliente.responsableCobranza || "-"}</TableCell>
                      <TableCell>{cliente.correoCobranza || "-"}</TableCell>
                      <TableCell>{cliente.telefono || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCliente(cliente)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCliente(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog Cliente */}
        <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription>
                {editingCliente
                  ? "Actualiza la información del cliente"
                  : "Completa los datos del nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre / Razón Social *</Label>
                  <Input
                    id="nombre"
                    value={clienteForm.nombre}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, nombre: e.target.value })
                    }
                    placeholder="Nombre completo o razón social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={clienteForm.rfc}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, rfc: e.target.value })
                    }
                    placeholder="RFC del cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias</Label>
                  <Input
                    id="alias"
                    value={clienteForm.alias}
                    onChange={(e) =>
                      setClienteForm({ ...clienteForm, alias: e.target.value })
                    }
                    placeholder="Nombre corto o alias"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo</Label>
                  <Select
                    value={clienteForm.grupoId}
                    onValueChange={(value) =>
                      setClienteForm({ ...clienteForm, grupoId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin grupo</SelectItem>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id.toString()}>
                          {grupo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsableCobranza">Responsable de Cobranza</Label>
                  <Input
                    id="responsableCobranza"
                    value={clienteForm.responsableCobranza}
                    onChange={(e) =>
                      setClienteForm({
                        ...clienteForm,
                        responsableCobranza: e.target.value,
                      })
                    }
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correoCobranza">Correo de Cobranza</Label>
                  <Input
                    id="correoCobranza"
                    type="email"
                    value={clienteForm.correoCobranza}
                    onChange={(e) =>
                      setClienteForm({
                        ...clienteForm,
                        correoCobranza: e.target.value,
                      })
                    }
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={clienteForm.telefono}
                  onChange={(e) =>
                    setClienteForm({ ...clienteForm, telefono: e.target.value })
                  }
                  placeholder="Teléfono de contacto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Textarea
                  id="direccion"
                  value={clienteForm.direccion}
                  onChange={(e) =>
                    setClienteForm({ ...clienteForm, direccion: e.target.value })
                  }
                  placeholder="Dirección completa"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={clienteForm.notas}
                  onChange={(e) =>
                    setClienteForm({ ...clienteForm, notas: e.target.value })
                  }
                  placeholder="Notas adicionales sobre el cliente"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsClienteDialogOpen(false);
                  resetClienteForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitCliente}
                disabled={!clienteForm.nombre || createCliente.isPending || updateCliente.isPending}
              >
                {editingCliente ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Grupo */}
        <Dialog open={isGrupoDialogOpen} onOpenChange={setIsGrupoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGrupo ? "Editar Grupo" : "Gestión de Grupos"}
              </DialogTitle>
              <DialogDescription>
                {editingGrupo
                  ? "Actualiza la información del grupo"
                  : "Crea y administra grupos de clientes"}
              </DialogDescription>
            </DialogHeader>

            {!editingGrupo && (
              <div className="space-y-4 mb-4">
                <h3 className="font-semibold">Grupos Existentes</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {grupos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay grupos creados</p>
                  ) : (
                    grupos.map((grupo) => (
                      <div
                        key={grupo.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{grupo.nombre}</p>
                          {grupo.descripcion && (
                            <p className="text-sm text-muted-foreground">
                              {grupo.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGrupo(grupo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGrupo(grupo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="grupoNombre">Nombre del Grupo *</Label>
                <Input
                  id="grupoNombre"
                  value={grupoForm.nombre}
                  onChange={(e) =>
                    setGrupoForm({ ...grupoForm, nombre: e.target.value })
                  }
                  placeholder="Nombre del grupo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupoDescripcion">Descripción</Label>
                <Textarea
                  id="grupoDescripcion"
                  value={grupoForm.descripcion}
                  onChange={(e) =>
                    setGrupoForm({ ...grupoForm, descripcion: e.target.value })
                  }
                  placeholder="Descripción del grupo"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupoResponsable">Responsable</Label>
                <Input
                  id="grupoResponsable"
                  value={grupoForm.responsable}
                  onChange={(e) =>
                    setGrupoForm({ ...grupoForm, responsable: e.target.value })
                  }
                  placeholder="Responsable del grupo"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsGrupoDialogOpen(false);
                  resetGrupoForm();
                }}
              >
                {editingGrupo ? "Cancelar" : "Cerrar"}
              </Button>
              <Button
                onClick={handleSubmitGrupo}
                disabled={!grupoForm.nombre || createGrupo.isPending || updateGrupo.isPending}
              >
                {editingGrupo ? "Actualizar" : "Crear Grupo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
