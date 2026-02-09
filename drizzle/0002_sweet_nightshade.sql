ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','operador','consulta') NOT NULL DEFAULT 'consulta';--> statement-breakpoint
ALTER TABLE `users` ADD `activo` boolean DEFAULT true NOT NULL;