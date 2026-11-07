<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $makanan = Category::create([
            'name' => 'Makanan',
            'description' => 'Berbagai pilihan makanan lezat',
        ]);

        $minuman = Category::create([
            'name' => 'Minuman',
            'description' => 'Minuman segar dan hangat',
        ]);

        $snack = Category::create([
            'name' => 'Snack',
            'description' => 'Camilan ringan untuk teman belajar',
        ]);

        $makanan->menuItems()->createMany([
            ['name' => 'Nasi Goreng', 'description' => 'Nasi goreng spesial dengan telur dan sayuran', 'price' => 15000, 'is_available' => true, 'is_best_seller' => true, 'allow_price_request' => true, 'allow_extra_rice' => true],
            ['name' => 'Mie Ayam', 'description' => 'Mie ayam dengan topping ayam jamur', 'price' => 13000, 'is_available' => true, 'has_temperature_option' => false, 'allow_extra_rice' => true],
            ['name' => 'Nasi Rendang', 'description' => 'Nasi dengan rendang sapi dan sayur', 'price' => 18000, 'is_available' => true, 'allow_price_request' => true, 'allow_extra_rice' => true],
            ['name' => 'Ayam Penyet', 'description' => 'Ayam goreng penyet dengan sambal terasi', 'price' => 16000, 'is_available' => true, 'allow_extra_rice' => true],
        ]);

        $minuman->menuItems()->createMany([
            ['name' => 'Es Teh Manis', 'description' => 'Teh manis dingin segar', 'price' => 5000, 'is_available' => true, 'is_best_seller' => true, 'has_temperature_option' => true],
            ['name' => 'Kopi Susu', 'description' => 'Kopi susu kekinian dengan gula aren', 'price' => 12000, 'is_available' => true, 'has_temperature_option' => true],
            ['name' => 'Jus Jeruk', 'description' => 'Jus jeruk segar murni', 'price' => 8000, 'is_available' => true, 'has_temperature_option' => true],
        ]);

        $snack->menuItems()->createMany([
            ['name' => 'Risoles', 'description' => 'Risoles mayo dengan isian sayur dan daging', 'price' => 7000, 'is_available' => true, 'is_best_seller' => true],
            ['name' => 'Pisang Goreng', 'description' => 'Pisang goreng crispy', 'price' => 5000, 'is_available' => false],
        ]);
    }
}
