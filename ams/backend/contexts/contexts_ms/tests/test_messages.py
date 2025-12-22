from django.test import SimpleTestCase
from contexts_ms.views import _build_cant_delete_message


class Category:
    pass


class Supplier:
    pass


class TestBuildCantDeleteMessage(SimpleTestCase):

    def test_lists_few_assets(self):
        inst = Category()
        inst.name = 'Laptops'
        usage = {'asset_ids': ['AST-1', 'AST-2', 'AST-3']}
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn("Cannot delete category 'Laptops'.", msg)
        self.assertIn('AST-1', msg)
        self.assertIn('AST-2', msg)
        self.assertIn('AST-3', msg)

    def test_many_assets_generic(self):
        inst = Category()
        inst.name = 'Laptops'
        # 6 assets -> should produce generic phrasing
        usage = {'asset_ids': [f'AST-{i}' for i in range(6)]}
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn("Cannot delete category 'Laptops'.", msg)
        self.assertIn('Currently used by assets', msg)
        # should not inline specific identifiers when >5
        self.assertNotIn('AST-0', msg)

    def test_components_and_repairs(self):
        inst = Supplier()
        inst.name = 'ACME'
        usage = {'component_ids': [1, 2], 'repair_ids': [3]}
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn("Cannot delete supplier 'ACME'.", msg)
        # message should mention components and repairs
        self.assertTrue('component' in msg.lower())
        self.assertTrue('repair' in msg.lower())
