def _build_cant_delete_message(instance, usage):
    # simplified copy of function from views.py for quick local tests
    label = instance.__class__.__name__.lower()
    asset_ids = usage.get('asset_ids') or []
    comp_ids = usage.get('component_ids') or []
    repair_ids = usage.get('repair_ids') or []

    display = None
    for attr in ('name', 'city', 'title'):
        val = getattr(instance, attr, None)
        if val:
            display = str(val)
            break

    def label_with_display():
        if display:
            return f"{label} '{display}'"
        return label

    if asset_ids:
        total = len(asset_ids)
        if total <= 5:
            samples = ', '.join(map(str, asset_ids))
            return f"Cannot delete {label_with_display()}. Currently used by Asset(s): {samples}."
        else:
            return f"Cannot delete {label_with_display()}. Currently used by assets."

    parts = []
    if comp_ids:
        parts.append('component(s)')
    if repair_ids:
        parts.append('repair(s)')

    if parts:
        if len(parts) == 1:
            body = parts[0]
        elif len(parts) == 2:
            body = f"{parts[0]} and {parts[1]}"
        else:
            body = ', '.join(parts[:-1]) + f", and {parts[-1]}"
        return f"Cannot delete {label_with_display()}. Currently used by {body}."

    return f"Cannot delete {label_with_display()}. It is referenced by other records."


class Category:
    pass


class Supplier:
    pass


failed = 0

# test 1: few assets
inst = Category()
inst.name = 'Laptops'
usage = {'asset_ids': ['AST-1', 'AST-2', 'AST-3']}
msg = _build_cant_delete_message(inst, usage)
if "Cannot delete category 'Laptops'." not in msg or 'AST-1' not in msg or 'AST-2' not in msg or 'AST-3' not in msg:
    print('test_lists_few_assets FAILED:', msg)
    failed += 1
else:
    print('test_lists_few_assets PASS')

# test 2: many assets
inst = Category()
inst.name = 'Laptops'
usage = {'asset_ids': [f'AST-{i}' for i in range(6)]}
msg = _build_cant_delete_message(inst, usage)
if "Cannot delete category 'Laptops'." not in msg or 'Currently used by assets' not in msg or 'AST-0' in msg:
    print('test_many_assets_generic FAILED:', msg)
    failed += 1
else:
    print('test_many_assets_generic PASS')

# test 3: components and repairs
inst = Supplier()
inst.name = 'ACME'
usage = {'component_ids': [1, 2], 'repair_ids': [3]}
msg = _build_cant_delete_message(inst, usage)
if "Cannot delete supplier 'ACME'." not in msg or 'component' not in msg.lower() or 'repair' not in msg.lower():
    print('test_components_and_repairs FAILED:', msg)
    failed += 1
else:
    print('test_components_and_repairs PASS')

if failed:
    print(f"{failed} test(s) failed")
    raise SystemExit(1)
else:
    print('All quick tests passed')
