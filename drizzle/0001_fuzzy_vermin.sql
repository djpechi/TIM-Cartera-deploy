CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int,
	`accion` varchar(100) NOT NULL,
	`entidad` varchar(100),
	`entidadId` int,
	`detalles` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`alias` varchar(100),
	`grupo` varchar(255),
	`asignado` varchar(100),
	`correoCobranza` varchar(320),
	`telefono` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clave` varchar(100) NOT NULL,
	`valor` text NOT NULL,
	`tipo` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
	`descripcion` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `configuracion_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracion_clave_unique` UNIQUE(`clave`)
);
--> statement-breakpoint
CREATE TABLE `facturas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folio` varchar(50) NOT NULL,
	`sistema` enum('tim_transp','tim_value') NOT NULL,
	`clienteId` int,
	`nombreCliente` varchar(255) NOT NULL,
	`fecha` timestamp NOT NULL,
	`fechaVencimiento` timestamp,
	`importeTotal` decimal(15,2) NOT NULL,
	`descripcion` text,
	`estatus` enum('normal','cancelada') NOT NULL DEFAULT 'normal',
	`estadoPago` enum('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
	`diasAtraso` int DEFAULT 0,
	`interesesMoratorios` decimal(15,2) DEFAULT '0.00',
	`totalConIntereses` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facturas_id` PRIMARY KEY(`id`),
	CONSTRAINT `facturas_folio_unique` UNIQUE(`folio`)
);
--> statement-breakpoint
CREATE TABLE `googleSheetsConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spreadsheetId` varchar(255) NOT NULL,
	`spreadsheetUrl` text,
	`credenciales` text,
	`ultimaSincronizacion` timestamp,
	`estatusSincronizacion` enum('activo','error','deshabilitado') DEFAULT 'activo',
	`mensajeError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleSheetsConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historialCargas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipoArchivo` enum('tim_transp','tim_value','pendientes') NOT NULL,
	`nombreArchivo` varchar(255) NOT NULL,
	`registrosProcesados` int DEFAULT 0,
	`registrosExitosos` int DEFAULT 0,
	`registrosError` int DEFAULT 0,
	`estatus` enum('procesando','completado','error') NOT NULL DEFAULT 'procesando',
	`errores` json,
	`usuarioId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `historialCargas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pendientesPago` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facturaId` int,
	`folio` varchar(50) NOT NULL,
	`clienteId` int,
	`nombreCliente` varchar(255) NOT NULL,
	`alias` varchar(100),
	`descripcion` text,
	`diasVencido` int DEFAULT 0,
	`saldo` decimal(15,2) NOT NULL,
	`interesesMoratorios` decimal(15,2) DEFAULT '0.00',
	`totalConMoratorios` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pendientesPago_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configuracion` ADD CONSTRAINT `configuracion_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facturas` ADD CONSTRAINT `facturas_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `historialCargas` ADD CONSTRAINT `historialCargas_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pendientesPago` ADD CONSTRAINT `pendientesPago_facturaId_facturas_id_fk` FOREIGN KEY (`facturaId`) REFERENCES `facturas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pendientesPago` ADD CONSTRAINT `pendientesPago_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;