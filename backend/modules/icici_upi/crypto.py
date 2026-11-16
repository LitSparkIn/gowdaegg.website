import base64
import json
import secrets
import string
from pathlib import Path
from typing import Any, Mapping, Optional

from cryptography import x509
from cryptography.hazmat.primitives import padding, serialization
from cryptography.hazmat.primitives.asymmetric import padding as asymmetric_padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.serialization import pkcs12


class ICICICryptoError(ValueError):
    """Raised when ICICI key material or encrypted data is invalid."""


def _load_certificate(path: str) -> x509.Certificate:
    certificate_bytes = Path(path).read_bytes()
    try:
        return x509.load_pem_x509_certificate(certificate_bytes)
    except ValueError:
        try:
            return x509.load_der_x509_certificate(certificate_bytes)
        except ValueError as exc:
            raise ICICICryptoError(f"Invalid X.509 certificate: {path}") from exc


def _load_private_key(path: str, password: Optional[str]):
    key_bytes = Path(path).read_bytes()
    password_bytes = password.encode() if password else None

    try:
        return serialization.load_pem_private_key(key_bytes, password=password_bytes)
    except (TypeError, ValueError):
        try:
            private_key, _, _ = pkcs12.load_key_and_certificates(
                key_bytes, password_bytes
            )
        except ValueError as exc:
            raise ICICICryptoError(
                "Unable to load merchant private key; check its format and password"
            ) from exc

    if private_key is None:
        raise ICICICryptoError("The merchant key container has no private key")
    return private_key


def _pkcs7_pad(data: bytes) -> bytes:
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    return padder.update(data) + padder.finalize()


def _pkcs7_unpad(data: bytes) -> bytes:
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    try:
        return unpadder.update(data) + unpadder.finalize()
    except ValueError as exc:
        raise ICICICryptoError("ICICI response has invalid AES padding") from exc


class ICICIHybridCrypto:
    """Implements ICICI's RSA PKCS#1 v1.5 + AES-CBC hybrid protocol."""

    def __init__(
        self,
        bank_certificate_path: str,
        merchant_private_key_path: str,
        merchant_private_key_password: Optional[str] = None,
        merchant_certificate_path: Optional[str] = None,
    ):
        self.bank_certificate = _load_certificate(bank_certificate_path)
        self.merchant_private_key = _load_private_key(
            merchant_private_key_path, merchant_private_key_password
        )

        bank_public_key = self.bank_certificate.public_key()
        if not isinstance(bank_public_key, rsa.RSAPublicKey) or bank_public_key.key_size != 4096:
            raise ICICICryptoError("ICICI public certificate must use a 4096-bit RSA key")

        if not isinstance(self.merchant_private_key, rsa.RSAPrivateKey):
            raise ICICICryptoError("Merchant private key must be an RSA key")

        if merchant_certificate_path:
            merchant_public_key = _load_certificate(
                merchant_certificate_path
            ).public_key()
            private_public_key = self.merchant_private_key.public_key()
            if merchant_public_key.public_numbers() != private_public_key.public_numbers():
                raise ICICICryptoError(
                    "Merchant private key does not match the configured merchant certificate"
                )

    @staticmethod
    def generate_session_key() -> bytes:
        # ICICI specifies a random 16-digit session key.
        return "".join(secrets.choice(string.digits) for _ in range(16)).encode()

    def encrypt_request(
        self,
        payload: Mapping[str, Any],
        request_id: str,
        service: str = "UPI",
    ) -> dict:
        session_key = self.generate_session_key()
        iv = secrets.token_bytes(16)
        plaintext = json.dumps(
            payload, separators=(",", ":"), ensure_ascii=False
        ).encode()

        encryptor = Cipher(
            algorithms.AES(session_key), modes.CBC(iv)
        ).encryptor()
        ciphertext = encryptor.update(_pkcs7_pad(plaintext)) + encryptor.finalize()

        encrypted_key = self.bank_certificate.public_key().encrypt(
            session_key, asymmetric_padding.PKCS1v15()
        )

        return {
            "requestId": request_id,
            "service": service,
            "encryptedKey": base64.b64encode(encrypted_key).decode(),
            "oaepHashingAlgorithm": "NONE",
            # The bank's sample leaves this empty and prepends the IV to encryptedData.
            "iv": "",
            "encryptedData": base64.b64encode(iv + ciphertext).decode(),
            "clientInfo": "",
            "optionalParam": "",
        }

    def decrypt_response(self, envelope: Mapping[str, Any]) -> dict:
        try:
            encrypted_key = base64.b64decode(
                str(envelope["encryptedKey"]), validate=True
            )
            encrypted_data = base64.b64decode(
                str(envelope["encryptedData"]), validate=True
            )
        except (KeyError, ValueError) as exc:
            raise ICICICryptoError("ICICI response envelope is incomplete or invalid") from exc

        if len(encrypted_data) < 32 or (len(encrypted_data) - 16) % 16:
            raise ICICICryptoError("ICICI encryptedData has an invalid length")

        try:
            session_key = self.merchant_private_key.decrypt(
                encrypted_key, asymmetric_padding.PKCS1v15()
            )
        except ValueError as exc:
            raise ICICICryptoError("Unable to decrypt ICICI response session key") from exc

        # Some ICICI implementations return the raw key, while others return it
        # Base64-encoded inside the RSA block. Accept only valid AES key lengths.
        if len(session_key) not in (16, 24, 32):
            try:
                decoded_key = base64.b64decode(session_key, validate=True)
            except ValueError as exc:
                raise ICICICryptoError("ICICI response contains an invalid AES key") from exc
            if len(decoded_key) not in (16, 24, 32):
                raise ICICICryptoError("ICICI response contains an invalid AES key")
            session_key = decoded_key

        iv, ciphertext = encrypted_data[:16], encrypted_data[16:]
        decryptor = Cipher(
            algorithms.AES(session_key), modes.CBC(iv)
        ).decryptor()
        plaintext = _pkcs7_unpad(
            decryptor.update(ciphertext) + decryptor.finalize()
        )

        try:
            response = json.loads(plaintext.decode())
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ICICICryptoError("ICICI response payload is not valid JSON") from exc
        if not isinstance(response, dict):
            raise ICICICryptoError("ICICI response payload must be a JSON object")
        return response
