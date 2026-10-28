"""
Test Suite Integral de Hardening y Seguridad
TalentExtract Pro - Módulo de Seguridad y Protección de Datos Sensibles

Valida:
1. Smoke Tests (Importación limpia de módulos y configuración).
2. DLP & Enmascaramiento de PII (CURP, teléfonos, correos, nombres).
3. Validación Binaria de Magic Bytes y Prevención de Path Traversal.
4. Tokens Firmados HMAC contra vulnerabilidad IDOR.
5. Cifrado Simétrico en Reposo (Archivos PDF/JPG y Strings en BD).
6. Auto-purga y destrucción segura de identificaciones oficiales.
"""

import os
import sys
import unittest
import tempfile
import time

# Asegurar path de importación
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.security_service import mask_curp, mask_phone, mask_email, mask_name
from app.services.file_validator import (
    validate_pdf_magic_bytes, 
    validate_image_magic_bytes, 
    resolve_safe_storage_path, 
    SecurityValidationError
)
from app.services.token_service import generate_document_token, verify_document_token
from app.services.crypto_service import (
    encrypt_bytes, 
    decrypt_bytes, 
    encrypt_string, 
    decrypt_string,
    FILE_MAGIC_HEADER,
    STR_MAGIC_PREFIX
)
from app.services.cleanup_service import secure_delete_file


class TestSecurityHardening(unittest.TestCase):

    # =========================================================================
    # 1. DLP & Enmascaramiento de PII
    # =========================================================================
    def test_mask_curp(self):
        curp = "ABCD010203HDFRRN09"
        masked = mask_curp(curp)
        self.assertEqual(masked, "ABCD************09")
        self.assertEqual(len(masked), len(curp))
        self.assertFalse("010203" in masked)
        self.assertIsNone(mask_curp(None))

    def test_mask_phone(self):
        phone = "+52 55 1234 5678"
        masked = mask_phone(phone)
        self.assertTrue(masked.endswith("5678"))
        self.assertFalse("1234" in masked)

    def test_mask_email(self):
        email = "candidato.rh@empresa.com"
        masked = mask_email(email)
        self.assertTrue(masked.startswith("c*"))
        self.assertTrue(masked.endswith("@empresa.com"))
        self.assertFalse("candidato.rh" in masked)

    def test_mask_name(self):
        name = "Juan Carlos Perez Gomez"
        masked = mask_name(name)
        self.assertEqual(masked, "J*** C***** P**** G****")

    # =========================================================================
    # 2. Magic Bytes & Anti-Path Traversal
    # =========================================================================
    def test_magic_bytes_pdf(self):
        valid_pdf_header = b"%PDF-1.7\r\n\x25\xe2\xe3\xcf\xd3"
        fake_pdf_header = b"#!/bin/bash\necho 'malicious'"
        self.assertTrue(validate_pdf_magic_bytes(valid_pdf_header))
        self.assertFalse(validate_pdf_magic_bytes(fake_pdf_header))
        self.assertFalse(validate_pdf_magic_bytes(b""))

    def test_magic_bytes_images(self):
        valid_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        fake_img = b"MZ\x90\x00\x03\x00\x00\x00" # Windows EXE header
        
        ok_jpg, fmt_jpg = validate_image_magic_bytes(valid_jpg)
        self.assertTrue(ok_jpg)
        self.assertEqual(fmt_jpg, "jpeg")

        ok_png, fmt_png = validate_image_magic_bytes(valid_png)
        self.assertTrue(ok_png)
        self.assertEqual(fmt_png, "png")

        ok_fake, _ = validate_image_magic_bytes(fake_img)
        self.assertFalse(ok_fake)

    def test_path_traversal_prevention(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            # Ruta válida
            safe_path = resolve_safe_storage_path(temp_dir, "documento_candidato.pdf")
            self.assertTrue(safe_path.startswith(temp_dir))

            # Intento de Path Traversal
            with self.assertRaises(SecurityValidationError):
                resolve_safe_storage_path(temp_dir, "../../etc/passwd")

            with self.assertRaises(SecurityValidationError):
                resolve_safe_storage_path(temp_dir, "..\\..\\windows\\system32\\cmd.exe")

    # =========================================================================
    # 3. Tokens Firmados HMAC (Anti-IDOR)
    # =========================================================================
    def test_signed_document_tokens(self):
        candidate_id = "cand-uuid-12345"
        token = generate_document_token(candidate_id, doc_type="pdf", expires_in_seconds=60)
        
        # Validación con datos correctos
        is_valid, _ = verify_document_token(token, candidate_id, "pdf")
        self.assertTrue(is_valid)

        # Intento de IDOR (usar el token de un candidato para ver el de otro)
        is_valid_idor, err = verify_document_token(token, "otro-candidato-99999", "pdf")
        self.assertFalse(is_valid_idor)

        # Intento de falsificar tipo de documento
        is_valid_doc, _ = verify_document_token(token, candidate_id, "id_document")
        self.assertFalse(is_valid_doc)

        # Token adulterado
        tampered_token = token[:-4] + "AAAA"
        is_valid_tampered, _ = verify_document_token(tampered_token, candidate_id, "pdf")
        self.assertFalse(is_valid_tampered)

        # Token expirado
        expired_token = generate_document_token(candidate_id, doc_type="pdf", expires_in_seconds=-10)
        is_valid_exp, err_exp = verify_document_token(expired_token, candidate_id, "pdf")
        self.assertFalse(is_valid_exp)
        self.assertIn("expirado", err_exp)

    # =========================================================================
    # 4. Cifrado en Reposo (At-Rest Encryption)
    # =========================================================================
    def test_at_rest_file_encryption(self):
        original_pdf_bytes = b"%PDF-1.4 Fake candidate CV binary content with sensitive addresses and data."
        
        # Cifrar bytes
        encrypted = encrypt_bytes(original_pdf_bytes)
        self.assertTrue(encrypted.startswith(FILE_MAGIC_HEADER))
        self.assertNotEqual(original_pdf_bytes, encrypted)
        self.assertFalse(b"Fake candidate CV" in encrypted)

        # Descifrar bytes
        decrypted = decrypt_bytes(encrypted)
        self.assertEqual(decrypted, original_pdf_bytes)

        # Retrocompatibilidad: un archivo legado no cifrado pasa transparente
        legacy_bytes = b"%PDF-1.4 Legacy plain file"
        self.assertEqual(decrypt_bytes(legacy_bytes), legacy_bytes)

    def test_field_level_string_encryption(self):
        sensitive_curp = "ABCD010203HDFRRN09"
        encrypted_str = encrypt_string(sensitive_curp)
        self.assertTrue(encrypted_str.startswith(STR_MAGIC_PREFIX))
        self.assertNotEqual(sensitive_curp, encrypted_str)

        decrypted_str = decrypt_string(encrypted_str)
        self.assertEqual(decrypted_str, sensitive_curp)

        # Retrocompatibilidad con registros previos no cifrados
        legacy_curp = "LEGACYCURP12345678"
        self.assertEqual(decrypt_string(legacy_curp), legacy_curp)

    # =========================================================================
    # 5. Destrucción Segura de Archivos (Purga)
    # =========================================================================
    def test_secure_file_deletion(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"Fotografia confidencial de credencial oficial INE")
            temp_path = f.name

        self.assertTrue(os.path.exists(temp_path))
        success = secure_delete_file(temp_path)
        self.assertTrue(success)
        self.assertFalse(os.path.exists(temp_path))


if __name__ == "__main__":
    unittest.main(verbosity=2)
