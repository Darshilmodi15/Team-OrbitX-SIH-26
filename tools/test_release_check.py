import json
from pathlib import Path
import tempfile
import unittest
from release_check import validate, fingerprint, REQUIRED_CHECKS

class ReleaseCheckTests(unittest.TestCase):
    def candidate(self):
        return {"schema_version":1,"working_tree_dirty":False,"git_commit":"a"*40,
            "build_files_sha256":{name:"b"*64 for name in ["index.html","offline-trip-reader.html","trip-worker.js"]},
            "frontend":{"url":"https://frontend.example","deployment_id":"frontend-1"},
            "backend":{"url":"https://backend.example","deployment_id":"backend-1","git_commit":"c"*40},
            "database":{"revision":"0003","compatible_revisions":["0003"],"restore_evidence":"staging restore log"},
            "previous_verified_pair":{"frontend_deployment_id":"frontend-0","backend_deployment_id":"backend-0","database_revision":"0003"},
            "checks":{name:{"status":"passed","evidence":"test evidence reference"} for name in REQUIRED_CHECKS}}
    def test_accepts_complete_record_without_claiming_execution(self):
        self.assertEqual(validate(self.candidate()), [])
    def test_every_required_gate_is_fail_closed(self):
        for key in REQUIRED_CHECKS:
            data = self.candidate(); data['checks'][key] = {"status":"not_run"}
            self.assertTrue(any(key in message for message in validate(data)))
    def test_rejects_dirty_tree_credentials_and_incompatible_rollback(self):
        data = self.candidate(); data['working_tree_dirty'] = True
        data['frontend']['url'] = 'https://user:secret@frontend.example/?token=private'
        data['previous_verified_pair']['database_revision'] = 'incompatible'
        messages = validate(data)
        self.assertEqual(len(messages), 3)
        self.assertNotIn('secret', json.dumps(messages))
    def test_build_hashes_include_offline_entry_and_change_with_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError): fingerprint(root)
            for name in ('index.html','offline-trip-reader.html','trip-worker.js'): (root/name).write_text('one')
            before = fingerprint(root)
            (root/'trip-worker.js').write_text('two')
            self.assertNotEqual(before['trip-worker.js'], fingerprint(root)['trip-worker.js'])

if __name__ == '__main__': unittest.main()
