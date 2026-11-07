<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerMenuController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(Category::orderBy('name')->get());
    }

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

        if (! $request->boolean('include_unavailable')) {
            $query->where('is_available', true);
        }

        return response()->json($query->get());
    }
}
