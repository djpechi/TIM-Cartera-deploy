import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Shield, UserCheck, UserX, Search, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Usuarios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"role" | "status" | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "operador" | "consulta">("consulta");

  // Verificar que el usuario sea admin
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground mb-6">
            Solo los administradores pueden acceder a esta sección
          </p>
          <Button onClick={() => setLocation("/")}>
            Volver al Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { data: users = [], isLoading, refetch } = trpc.admin.users.list.useQuery();
  const { data: stats } = trpc.admin.users.stats.useQuery();
  const updateRoleMutation = trpc.admin.users.updateRole.useMutation();
  const updateStatusMutation = trpc.admin.users.updateStatus.useMutation();

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      await updateRoleMutation.mutateAsync({
        userId: selectedUser.id,
        newRole,
      });
      toast.success("Rol actualizado exitosamente");
      refetch();
      setDialogType(null);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el rol");
    }
  };

  const handleUpdateStatus = async (activo: boolean) => {
    if (!selectedUser) return;

    try {
      await updateStatusMutation.mutateAsync({
        userId: selectedUser.id,
        activo,
      });
      toast.success(activo ? "Usuario activado exitosamente" : "Usuario desactivado exitosamente");
      refetch();
      setDialogType(null);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el estado");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "activo" && u.activo) ||
      (filterStatus === "inactivo" && !u.activo);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      admin: { variant: "default", label: "Administrador" },
      operador: { variant: "secondary", label: "Operador" },
      consulta: { variant: "outline", label: "Consulta" },
    };
    const config = variants[role] || variants.consulta;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los usuarios del sistema, asigna roles y controla el acceso
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activos || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.inactivos || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.porRol.admin || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              Lista completa de usuarios con acceso al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando usuarios...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron usuarios
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "Sin nombre"}</TableCell>
                        <TableCell>{u.email || "Sin correo"}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          {u.activo ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setDialogType("role");
                            }}
                            disabled={u.id === user?.id}
                          >
                            Cambiar Rol
                          </Button>
                          <Button
                            variant={u.activo ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setDialogType("status");
                            }}
                            disabled={u.id === user?.id}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para cambiar rol */}
        <Dialog open={dialogType === "role"} onOpenChange={(open) => !open && setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
              <DialogDescription>
                Selecciona el nuevo rol para {selectedUser?.name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newRole} onValueChange={(value: any) => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador - Acceso completo</SelectItem>
                  <SelectItem value="operador">Operador - Gestión de cartera</SelectItem>
                  <SelectItem value="consulta">Consulta - Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? "Actualizando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para cambiar estado */}
        <Dialog open={dialogType === "status"} onOpenChange={(open) => !open && setDialogType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.activo ? "Desactivar" : "Activar"} Usuario
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.activo
                  ? `¿Estás seguro de que deseas desactivar a ${selectedUser?.name || selectedUser?.email}? El usuario no podrá acceder al sistema.`
                  : `¿Estás seguro de que deseas activar a ${selectedUser?.name || selectedUser?.email}? El usuario podrá acceder al sistema nuevamente.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogType(null)}>
                Cancelar
              </Button>
              <Button
                variant={selectedUser?.activo ? "destructive" : "default"}
                onClick={() => handleUpdateStatus(!selectedUser?.activo)}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending
                  ? "Procesando..."
                  : selectedUser?.activo
                  ? "Desactivar"
                  : "Activar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
