# Quick Reference - Seeders

## 🚀 Quick Commands

### Seed Everything (Recommended)
```bash
# Use seed_all command
docker exec -it backend-dev python manage.py seed_all --clear

### Seed Specific Data
```bash
# Products only
docker exec -it backend-dev python manage.py seed_all --products-only --clear

# Assets only (auto-seeds products if they don't exist)
docker exec -it backend-dev python manage.py seed_all --assets-only --clear

# Components only
docker exec -it backend-dev python manage.py seed_all --components-only --clear
```

### Or Use Test Scripts

**Windows (PowerShell):**
```powershell
cd backend/assets
.\test_seeders.ps1
```

**Linux/Mac (Bash):**
```bash
cd backend/assets
chmod +x test_seeders.sh
./test_seeders.sh
```

## 📊 What Gets Created

| Item | Count | Details |
|------|-------|---------|
| **Products** | 100 | 40 Laptops, 25 Desktops, 15 Monitors, 10 Network, 10 Printers |
| **Assets** | 100 | Each linked to a product via foreign key |

## ✅ Verification Commands

```bash
# Check counts
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Product, Asset; print(f'Products: {Product.objects.count()}, Assets: {Asset.objects.count()}')"

# Verify relationships
docker exec -it backend-dev python manage.py shell -c "from assets_ms.models import Asset; print(f'Valid: {Asset.objects.filter(product__isnull=False).count()}')"
```

## ⚠️ Important

1. **🆕 Auto-dependency handling:** Assets seeder now auto-seeds products if they don't exist
2. **Use `--clear` flag** to remove existing data before seeding
3. **Each asset has a valid product foreign key** (referential integrity maintained)
4. **Use `--no-auto-seed-products`** flag to disable automatic product seeding

## 📁 Key Files

- `seed_products.py` - Creates 100 products
- `seed_assets.py` - Creates 100 assets (requires products)
- `SEEDER_USAGE.md` - Full documentation
- `test_seeders.ps1` - Windows test script
- `test_seeders.sh` - Linux/Mac test script

## 🔧 Troubleshooting

**"No products found" error?**
→ This should no longer happen! Assets seeder auto-seeds products now
→ If you disabled auto-seeding with `--no-auto-seed-products`, run `seed_products` first

**Duplicates?**
→ Use `--clear` flag

**Foreign key errors?**
→ Should not occur with auto-seeding enabled
→ If using `--no-auto-seed-products`, ensure products exist first

