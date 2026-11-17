<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('phone', 30)->unique();
            $t->string('address')->nullable();
            $t->string('email')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        Schema::create('spareparts', function (Blueprint $t) {
            $t->id();
            $t->string('sku', 50)->unique();
            $t->string('name');
            $t->string('category', 50)->default('Lainnya')->index();
            $t->unsignedInteger('buy_price')->default(0);
            $t->unsignedInteger('sell_price')->default(0);
            $t->integer('stock')->default(0);
            $t->unsignedInteger('min_stock')->default(1);
            $t->string('location', 50)->nullable();
            $t->timestamps();
        });

        Schema::create('services', function (Blueprint $t) {
            $t->id();
            $t->string('number', 20)->unique();
            $t->foreignId('customer_id')->constrained()->restrictOnDelete();
            $t->string('device_type', 30)->default('Laptop');
            $t->string('device_brand', 50);
            $t->string('device_model', 100);
            $t->string('serial_number', 100)->nullable()->index();
            $t->string('device_password', 100)->nullable();
            $t->text('complaint');
            $t->string('accessories')->nullable();
            $t->string('physical_condition')->nullable();
            $t->enum('status', ['DITERIMA', 'DIAGNOSA', 'MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL', 'BATAL'])
                ->default('DITERIMA')->index();
            $t->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->text('diagnosis')->nullable();
            $t->unsignedInteger('estimated_cost')->default(0);
            $t->date('estimated_done')->nullable();
            $t->unsignedInteger('discount')->default(0);
            $t->unsignedSmallInteger('warranty_days')->default(30);
            $t->string('notes')->nullable();
            $t->boolean('is_warranty_claim')->default(false);
            $t->foreignId('parent_id')->nullable()->constrained('services')->nullOnDelete();
            $t->dateTime('received_at')->useCurrent()->index();
            $t->dateTime('finished_at')->nullable()->index();
            $t->dateTime('picked_up_at')->nullable();
            $t->timestamps();
        });

        Schema::create('service_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->enum('type', ['JASA', 'PART'])->default('JASA');
            $t->foreignId('sparepart_id')->nullable()->constrained()->nullOnDelete();
            $t->string('description');
            $t->unsignedInteger('qty')->default(1);
            $t->unsignedInteger('price');
            $t->unsignedInteger('cost_price')->default(0);
            $t->timestamps();
        });

        Schema::create('service_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->string('status', 30);
            $t->string('note')->nullable();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('service_id')->constrained()->cascadeOnDelete();
            $t->unsignedInteger('amount');
            $t->enum('method', ['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'])->default('TUNAI');
            $t->enum('type', ['DP', 'PELUNASAN', 'REFUND'])->default('DP');
            $t->string('note')->nullable();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('stock_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sparepart_id')->constrained()->cascadeOnDelete();
            $t->integer('qty');
            $t->enum('type', ['MASUK', 'KELUAR', 'PENYESUAIAN']);
            $t->string('note')->nullable();
            $t->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('settings', function (Blueprint $t) {
            $t->string('key', 50)->primary();
            $t->text('value')->nullable();
        });
    }

    public function down(): void
    {
        foreach (['settings', 'stock_movements', 'payments', 'service_logs', 'service_items', 'services', 'spareparts', 'customers'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
