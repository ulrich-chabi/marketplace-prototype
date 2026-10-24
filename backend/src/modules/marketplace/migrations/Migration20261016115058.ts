import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261016115058 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" add column if not exists "delivery_days_min" integer null, add column if not exists "delivery_days_max" integer null, add column if not exists "return_window_days" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop column if exists "delivery_days_min", drop column if exists "delivery_days_max", drop column if exists "return_window_days";`);
  }

}
