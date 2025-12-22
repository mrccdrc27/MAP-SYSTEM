from django.test import SimpleTestCase

from contexts_ms.views import _build_cant_delete_message


class Dummy:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class BuildMessageTests(SimpleTestCase):
    def test_no_references_fallback(self):
        inst = Dummy(name='CtxA')
        usage = {}
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn("Cannot delete", msg)
        self.assertIn("ctxa", msg.lower())

    def test_asset_samples_shown_when_few(self):
        inst = Dummy(name='SupplierOne')
        usage = { 'asset_ids': ['AST-1', 'AST-2'] }
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn('Asset(s): AST-1, AST-2', msg)
        self.assertIn("supplier 'SupplierOne'", msg)

    def test_asset_generic_when_many(self):
        inst = Dummy(name='CatBig')
        usage = { 'asset_ids': [f'A{i}' for i in range(10)] }
        msg = _build_cant_delete_message(inst, usage)
        # for many assets the message should not list all ids
        self.assertIn('Currently used by assets', msg)

    def test_components_and_repairs(self):
        inst = Dummy(title='T1')
        usage = { 'component_ids': [1], 'repair_ids': [2] }
        msg = _build_cant_delete_message(inst, usage)
        self.assertIn('component(s) and repair(s)', msg)
