import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261025120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "return_request" (
      "id" text not null,
      "parent_order_id" text not null,
      "vendor_order_id" text not null,
      "vendor_id" text not null,
      "order_item_id" text not null,
      "customer_id" text null,
      "quantity" integer not null,
      "reason" text check ("reason" in ('damaged', 'wrong_item', 'not_as_described', 'no_longer_needed')) not null,
      "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending',
      "decision_note" text null,
      "decided_by" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "return_request_pkey" primary key ("id")
    );`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_parent_order_id" ON "return_request" ("parent_order_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_vendor_order_id" ON "return_request" ("vendor_order_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_vendor_id" ON "return_request" ("vendor_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_order_item_id" ON "return_request" ("order_item_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_deleted_at" ON "return_request" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_request" cascade;`)
  }
}
