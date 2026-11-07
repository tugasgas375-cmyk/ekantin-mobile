<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuItem::with('category')->orderBy('name');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(10));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateMenu($request);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('menu_images', 'public');
        }

        $menuItem = MenuItem::create($validated);

        return response()->json($menuItem->load('category'), 201);
    }

    public function show(MenuItem $menuItem): JsonResponse
    {
        return response()->json($menuItem->load('category'));
    }

    public function update(Request $request, MenuItem $menuItem): JsonResponse
    {
        $validated = $this->validateMenu($request, $menuItem);

        if ($request->hasFile('image')) {
            if ($menuItem->image) {
                Storage::disk('public')->delete($menuItem->image);
            }
            $validated['image'] = $request->file('image')->store('menu_images', 'public');
        }

        $menuItem->update($validated);

        return response()->json($menuItem->fresh()->load('category'));
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        if ($menuItem->image) {
            Storage::disk('public')->delete($menuItem->image);
        }

        $menuItem->delete();

        return response()->json(['message' => 'Menu berhasil dihapus.']);
    }

    public function toggle(MenuItem $menuItem): JsonResponse
    {
        $menuItem->update(['is_available' => ! $menuItem->is_available]);

        return response()->json($menuItem->fresh());
    }

    private function validateMenu(Request $request, ?MenuItem $menuItem = null): array
    {
        return $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|max:2048',
            'is_available' => 'boolean',
            'is_best_seller' => 'boolean',
            'has_temperature_option' => 'boolean',
            'allow_price_request' => 'boolean',
            'allow_extra_rice' => 'boolean',
        ]);
    }
}
