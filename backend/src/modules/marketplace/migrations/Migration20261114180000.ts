import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261114180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor"
      add column if not exists "shipping_origin_address_1" text null,
      add column if not exists "shipping_origin_city" text null,
      add column if not exists "shipping_origin_province" text null,
      add column if not exists "shipping_origin_postal_code" text null,
      add column if not exists "shipping_origin_phone" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor"
      drop column if exists "shipping_origin_address_1",
      drop column if exists "shipping_origin_city",
      drop column if exists "shipping_origin_province",
      drop column if exists "shipping_origin_postal_code",
      drop column if exists "shipping_origin_phone";`)
  }
}
