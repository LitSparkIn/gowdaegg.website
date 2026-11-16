import base64
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes, padding, serialization
from cryptography.hazmat.primitives.asymmetric import padding as asymmetric_padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.x509.oid import NameOID

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from modules.icici_upi.crypto import ICICICryptoError, ICICIHybridCrypto


def _certificate(private_key, common_name: str) -> bytes:
    now = datetime.now(timezone.utc)
    subject = issuer = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, common_name)]
    )
    certificate = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=1))
        .sign(private_key, hashes.SHA256())
    )
    return certificate.public_bytes(serialization.Encoding.PEM)


def _crypto_material(directory: Path):
    bank_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    merchant_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)

    bank_cert_path = directory / "bank.pem"
    merchant_cert_path = directory / "merchant.pem"
    merchant_key_path = directory / "merchant.key"
    bank_cert_path.write_bytes(_certificate(bank_key, "ICICI Test"))
    merchant_cert_path.write_bytes(_certificate(merchant_key, "Merchant Test"))
    merchant_key_path.write_bytes(
        merchant_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    return {
        "bank_key": bank_key,
        "merchant_key": merchant_key,
        "bank_cert_path": str(bank_cert_path),
        "merchant_cert_path": str(merchant_cert_path),
        "merchant_key_path": str(merchant_key_path),
    }


def _unpad(data: bytes) -> bytes:
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(data) + unpadder.finalize()


def _encrypt_response(payload: dict, merchant_key) -> dict:
    session_key = b"1234567890123456"
    iv = b"abcdefghijklmnop"
    plaintext = json.dumps(payload, separators=(",", ":")).encode()
    padder = padding.PKCS7(128).padder()
    padded = padder.update(plaintext) + padder.finalize()
    encryptor = Cipher(algorithms.AES(session_key), modes.CBC(iv)).encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    encrypted_key = merchant_key.public_key().encrypt(
        session_key, asymmetric_padding.PKCS1v15()
    )
    return {
        "encryptedKey": base64.b64encode(encrypted_key).decode(),
        "encryptedData": base64.b64encode(iv + ciphertext).decode(),
    }


class ICICIHybridCryptoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary_directory = tempfile.TemporaryDirectory()
        cls.crypto_material = _crypto_material(
            Path(cls.temporary_directory.name)
        )

    @classmethod
    def tearDownClass(cls):
        cls.temporary_directory.cleanup()

    def _crypto(self):
        return ICICIHybridCrypto(
            self.crypto_material["bank_cert_path"],
            self.crypto_material["merchant_key_path"],
            merchant_certificate_path=self.crypto_material["merchant_cert_path"],
        )

    def test_encrypt_request_matches_icici_hybrid_format(self):
        payload = {"amount": "1.00", "merchantId": "614174"}
        envelope = self._crypto().encrypt_request(payload, "request-1")

        self.assertEqual(envelope["service"], "UPI")
        self.assertEqual(envelope["oaepHashingAlgorithm"], "NONE")
        self.assertEqual(envelope["iv"], "")

        session_key = self.crypto_material["bank_key"].decrypt(
            base64.b64decode(envelope["encryptedKey"]),
            asymmetric_padding.PKCS1v15(),
        )
        self.assertEqual(len(session_key), 16)
        self.assertTrue(session_key.isdigit())

        encrypted_data = base64.b64decode(envelope["encryptedData"])
        iv, ciphertext = encrypted_data[:16], encrypted_data[16:]
        decryptor = Cipher(algorithms.AES(session_key), modes.CBC(iv)).decryptor()
        decrypted = _unpad(decryptor.update(ciphertext) + decryptor.finalize())
        self.assertEqual(json.loads(decrypted), payload)

    def test_decrypt_response_uses_merchant_private_key(self):
        response = {
            "success": "true",
            "response": "0",
            "refId": "EZY123456789",
        }
        envelope = _encrypt_response(
            response, self.crypto_material["merchant_key"]
        )
        self.assertEqual(self._crypto().decrypt_response(envelope), response)

    def test_rejects_non_matching_merchant_certificate(self):
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
        other_certificate = Path(self.temporary_directory.name) / "other.pem"
        other_certificate.write_bytes(_certificate(other_key, "Other Merchant"))

        with self.assertRaisesRegex(ICICICryptoError, "does not match"):
            ICICIHybridCrypto(
                self.crypto_material["bank_cert_path"],
                self.crypto_material["merchant_key_path"],
                merchant_certificate_path=str(other_certificate),
            )

if __name__ == "__main__":
    unittest.main()
